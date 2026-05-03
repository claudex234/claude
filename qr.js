// Codificador QR didáctico — soporta versiones 1-5, modos Byte/Numérico/Alfanumérico,
// niveles EC L/M/Q/H. Devuelve una traza con cada paso intermedio para visualizar.
// Basado en ISO/IEC 18004.

(function (global) {
  'use strict';

  // -----------------------------------------------------------------------
  // GF(256) tablas para Reed-Solomon (polinomio primitivo 0x11D)
  // -----------------------------------------------------------------------
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsComputeDivisor(degree) {
    const result = new Uint8Array(degree);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < result.length; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 2);
    }
    return result;
  }

  function rsComputeRemainder(data, divisor) {
    const result = new Uint8Array(divisor.length);
    for (const b of data) {
      const factor = b ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      for (let i = 0; i < divisor.length; i++) {
        result[i] ^= gfMul(divisor[i], factor);
      }
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Tablas de capacidad y bloques de EC para versiones 1-5
  // [ec_per_block, num_blocks_g1, data_per_block_g1, num_blocks_g2, data_per_block_g2]
  // -----------------------------------------------------------------------
  const EC_TABLE = {
    1: { L:[7,1,19,0,0], M:[10,1,16,0,0], Q:[13,1,13,0,0], H:[17,1,9,0,0] },
    2: { L:[10,1,34,0,0], M:[16,1,28,0,0], Q:[22,1,22,0,0], H:[28,1,16,0,0] },
    3: { L:[15,1,55,0,0], M:[26,1,44,0,0], Q:[18,2,17,0,0], H:[22,2,13,0,0] },
    4: { L:[20,1,80,0,0], M:[18,2,32,0,0], Q:[26,2,24,0,0], H:[16,4,9,0,0] },
    5: { L:[26,1,108,0,0], M:[24,2,43,0,0], Q:[18,2,15,2,16], H:[22,2,11,2,12] },
  };

  const ALIGNMENT_POSITIONS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
  };

  const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function size(version) { return version * 4 + 17; }

  function totalDataBits(version, ecLevel) {
    const t = EC_TABLE[version][ecLevel];
    const dataBytes = t[1] * t[2] + t[3] * t[4];
    return dataBytes * 8;
  }

  function modeIndicator(mode) {
    return { numeric: 0b0001, alphanumeric: 0b0010, byte: 0b0100 }[mode];
  }

  function charCountBits(mode, version) {
    // v1-9
    if (mode === 'numeric') return 10;
    if (mode === 'alphanumeric') return 9;
    return 8; // byte
  }

  // -----------------------------------------------------------------------
  // BitBuffer
  // -----------------------------------------------------------------------
  class BitBuffer {
    constructor() { this.bits = []; this.segments = []; }
    appendBits(value, n, kind) {
      const start = this.bits.length;
      for (let i = n - 1; i >= 0; i--) {
        this.bits.push((value >>> i) & 1);
      }
      this.segments.push({ kind, start, length: n, value });
    }
    length() { return this.bits.length; }
    toBytes() {
      const bytes = [];
      for (let i = 0; i < this.bits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] || 0);
        bytes.push(b);
      }
      return bytes;
    }
  }

  // -----------------------------------------------------------------------
  // Codificación de datos por modo
  // -----------------------------------------------------------------------
  function encodeNumeric(text, bb) {
    for (let i = 0; i < text.length; i += 3) {
      const chunk = text.substr(i, 3);
      const value = parseInt(chunk, 10);
      const bits = chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4;
      bb.appendBits(value, bits, 'data');
    }
  }

  function encodeAlphanumeric(text, bb) {
    for (let i = 0; i < text.length; i += 2) {
      const a = ALPHANUMERIC_CHARSET.indexOf(text[i]);
      if (i + 1 < text.length) {
        const b = ALPHANUMERIC_CHARSET.indexOf(text[i + 1]);
        bb.appendBits(a * 45 + b, 11, 'data');
      } else {
        bb.appendBits(a, 6, 'data');
      }
    }
  }

  function encodeByte(bytes, bb) {
    for (const b of bytes) bb.appendBits(b, 8, 'data');
  }

  function textToBytes(text) {
    return Array.from(new TextEncoder().encode(text));
  }

  function isValidNumeric(text) { return /^[0-9]*$/.test(text); }
  function isValidAlphanumeric(text) {
    for (const c of text) if (ALPHANUMERIC_CHARSET.indexOf(c) < 0) return false;
    return true;
  }

  // -----------------------------------------------------------------------
  // Selección automática de versión
  // -----------------------------------------------------------------------
  function selectVersion(text, mode, ecLevel, requested) {
    const versions = requested === 'auto' ? [1,2,3,4,5] : [parseInt(requested, 10)];
    let inputBits;
    if (mode === 'numeric') {
      const groups3 = Math.floor(text.length / 3);
      const rem = text.length % 3;
      inputBits = groups3 * 10 + (rem === 2 ? 7 : rem === 1 ? 4 : 0);
    } else if (mode === 'alphanumeric') {
      inputBits = Math.floor(text.length / 2) * 11 + (text.length % 2) * 6;
    } else {
      inputBits = textToBytes(text).length * 8;
    }
    for (const v of versions) {
      const cap = totalDataBits(v, ecLevel);
      const overhead = 4 + charCountBits(mode, v);
      if (overhead + inputBits <= cap) return v;
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Construcción del bitstream completo (con padding)
  // -----------------------------------------------------------------------
  function buildBitstream(text, mode, version, ecLevel) {
    const bb = new BitBuffer();
    const mi = modeIndicator(mode);
    bb.appendBits(mi, 4, 'mode');

    let charCount;
    if (mode === 'byte') charCount = textToBytes(text).length;
    else charCount = text.length;
    bb.appendBits(charCount, charCountBits(mode, version), 'count');

    if (mode === 'numeric') encodeNumeric(text, bb);
    else if (mode === 'alphanumeric') encodeAlphanumeric(text.toUpperCase(), bb);
    else encodeByte(textToBytes(text), bb);

    const cap = totalDataBits(version, ecLevel);
    // Terminador (hasta 4 ceros)
    const termLen = Math.min(4, cap - bb.length());
    if (termLen > 0) bb.appendBits(0, termLen, 'terminator');

    // Relleno hasta byte
    const padBits = (8 - (bb.length() % 8)) % 8;
    if (padBits > 0) bb.appendBits(0, padBits, 'padbit');

    // Bytes de padding alternados
    const padBytes = [0xEC, 0x11];
    let pi = 0;
    while (bb.length() < cap) {
      bb.appendBits(padBytes[pi % 2], 8, 'padbyte');
      pi++;
    }

    return bb;
  }

  // -----------------------------------------------------------------------
  // Reed-Solomon e intercalado
  // -----------------------------------------------------------------------
  function buildCodewords(dataBytes, version, ecLevel) {
    const t = EC_TABLE[version][ecLevel];
    const ecLen = t[0], n1 = t[1], k1 = t[2], n2 = t[3], k2 = t[4];

    const blocks = [];
    let offset = 0;
    for (let i = 0; i < n1; i++) {
      blocks.push({ data: dataBytes.slice(offset, offset + k1), ec: null });
      offset += k1;
    }
    for (let i = 0; i < n2; i++) {
      blocks.push({ data: dataBytes.slice(offset, offset + k2), ec: null });
      offset += k2;
    }

    const divisor = rsComputeDivisor(ecLen);
    for (const block of blocks) {
      const rem = rsComputeRemainder(block.data, divisor);
      block.ec = Array.from(rem);
    }

    // Intercalado: por columnas, primero data, después EC
    const maxK = Math.max(k1, k2 || 0);
    const dataInterleaved = [];
    for (let i = 0; i < maxK; i++) {
      for (const block of blocks) {
        if (i < block.data.length) dataInterleaved.push(block.data[i]);
      }
    }
    const ecInterleaved = [];
    for (let i = 0; i < ecLen; i++) {
      for (const block of blocks) ecInterleaved.push(block.ec[i]);
    }

    return {
      blocks,
      ecLen,
      dataInterleaved,
      ecInterleaved,
      finalSequence: dataInterleaved.concat(ecInterleaved),
    };
  }

  // -----------------------------------------------------------------------
  // Construcción de la matriz: function patterns + datos
  // -----------------------------------------------------------------------
  function newMatrix(n) {
    const m = new Array(n);
    for (let i = 0; i < n; i++) m[i] = new Array(n).fill(null);
    return m;
  }

  function placeFinder(m, r, c) {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const rr = r + i, cc = c + j;
        if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
        let v;
        if (i >= 0 && i <= 6 && j >= 0 && j <= 6) {
          // Buscador 7×7
          const inOuter = i === 0 || i === 6 || j === 0 || j === 6;
          const inInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          v = inOuter || inInner ? 1 : 0;
        } else {
          v = 0; // separador
        }
        m[rr][cc] = { v, fn: true };
      }
    }
  }

  function placeAlignment(m, r, c) {
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const isOuter = Math.abs(i) === 2 || Math.abs(j) === 2;
        const isCenter = i === 0 && j === 0;
        m[r + i][c + j] = { v: (isOuter || isCenter) ? 1 : 0, fn: true };
      }
    }
  }

  function placeFunctionPatterns(version) {
    const n = size(version);
    const m = newMatrix(n);

    placeFinder(m, 0, 0);
    placeFinder(m, 0, n - 7);
    placeFinder(m, n - 7, 0);

    // Timing
    for (let i = 8; i < n - 8; i++) {
      m[6][i] = { v: i % 2 === 0 ? 1 : 0, fn: true };
      m[i][6] = { v: i % 2 === 0 ? 1 : 0, fn: true };
    }

    // Alignment
    const positions = ALIGNMENT_POSITIONS[version];
    for (const r of positions) {
      for (const c of positions) {
        if (m[r][c] !== null) continue; // se solapa con buscador
        placeAlignment(m, r, c);
      }
    }

    // Reservar zona de formato (15 bits)
    for (let i = 0; i <= 8; i++) {
      if (m[8][i] === null) m[8][i] = { v: 0, fn: true, format: true };
      if (m[i][8] === null) m[i][8] = { v: 0, fn: true, format: true };
    }
    for (let i = 0; i < 8; i++) {
      if (m[8][n - 1 - i] === null) m[8][n - 1 - i] = { v: 0, fn: true, format: true };
      if (m[n - 1 - i][8] === null) m[n - 1 - i][8] = { v: 0, fn: true, format: true };
    }
    // Módulo oscuro fijo
    m[n - 8][8] = { v: 1, fn: true };

    return m;
  }

  // -----------------------------------------------------------------------
  // Colocación de bits de datos en zigzag, registrando posición de cada bit
  // -----------------------------------------------------------------------
  function placeDataBits(matrix, codewords) {
    const n = matrix.length;
    const bits = [];
    for (const cw of codewords) {
      for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
    }

    const placement = []; // placement[i] = {r, c, bit, codewordIndex, bitIndex}
    let bitIdx = 0;
    let upward = true;

    for (let col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--; // saltar columna de timing
      for (let i = 0; i < n; i++) {
        const r = upward ? n - 1 - i : i;
        for (let dx = 0; dx < 2; dx++) {
          const c = col - dx;
          if (matrix[r][c] === null) {
            const bit = bits[bitIdx];
            matrix[r][c] = {
              v: bit,
              data: true,
              codewordIndex: Math.floor(bitIdx / 8),
              bitIndex: 7 - (bitIdx % 8),
            };
            placement.push({
              r, c, bit,
              codewordIndex: Math.floor(bitIdx / 8),
              bitIndex: 7 - (bitIdx % 8),
            });
            bitIdx++;
          }
        }
      }
      upward = !upward;
    }

    // Cualquier hueco restante = 0 (solo en versiones que tengan menos bits)
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c] === null) matrix[r][c] = { v: 0, data: true, padding: true };
      }
    }

    return placement;
  }

  // -----------------------------------------------------------------------
  // Máscaras
  // -----------------------------------------------------------------------
  const MASK_FUNCS = [
    (i, j) => (i + j) % 2 === 0,
    (i, j) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
    (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
    (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
    (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0,
  ];

  function applyMask(matrix, maskNum) {
    const n = matrix.length;
    const out = newMatrix(n);
    const fn = MASK_FUNCS[maskNum];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = matrix[r][c];
        if (cell.data && fn(r, c)) {
          out[r][c] = Object.assign({}, cell, { v: cell.v ^ 1, masked: true });
        } else {
          out[r][c] = cell;
        }
      }
    }
    return out;
  }

  // Penalty score (ISO 18004, sección 8.8.2)
  function penaltyScore(matrix) {
    const n = matrix.length;
    let score = 0;

    // N1: 5+ módulos consecutivos del mismo color
    for (let r = 0; r < n; r++) {
      let runColor = -1, runLen = 0;
      for (let c = 0; c < n; c++) {
        const v = matrix[r][c].v;
        if (v === runColor) { runLen++; if (runLen === 5) score += 3; else if (runLen > 5) score++; }
        else { runColor = v; runLen = 1; }
      }
    }
    for (let c = 0; c < n; c++) {
      let runColor = -1, runLen = 0;
      for (let r = 0; r < n; r++) {
        const v = matrix[r][c].v;
        if (v === runColor) { runLen++; if (runLen === 5) score += 3; else if (runLen > 5) score++; }
        else { runColor = v; runLen = 1; }
      }
    }

    // N2: bloques 2x2 mismo color
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        const v = matrix[r][c].v;
        if (matrix[r][c+1].v === v && matrix[r+1][c].v === v && matrix[r+1][c+1].v === v) score += 3;
      }
    }

    // N3: patrones tipo buscador
    const finder = [1,0,1,1,1,0,1,0,0,0,0];
    const finderRev = finder.slice().reverse();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c <= n - 11; c++) {
        let okF = true, okR = true;
        for (let k = 0; k < 11; k++) {
          if (matrix[r][c+k].v !== finder[k]) okF = false;
          if (matrix[r][c+k].v !== finderRev[k]) okR = false;
        }
        if (okF) score += 40;
        if (okR) score += 40;
      }
    }
    for (let c = 0; c < n; c++) {
      for (let r = 0; r <= n - 11; r++) {
        let okF = true, okR = true;
        for (let k = 0; k < 11; k++) {
          if (matrix[r+k][c].v !== finder[k]) okF = false;
          if (matrix[r+k][c].v !== finderRev[k]) okR = false;
        }
        if (okF) score += 40;
        if (okR) score += 40;
      }
    }

    // N4: balance oscuros
    let dark = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (matrix[r][c].v) dark++;
    const pct = (dark * 100) / (n * n);
    const k = Math.floor(Math.abs(pct - 50) / 5);
    score += k * 10;

    return score;
  }

  function chooseBestMask(matrix) {
    let best = 0, bestScore = Infinity;
    for (let i = 0; i < 8; i++) {
      const masked = applyMask(matrix, i);
      const s = penaltyScore(masked);
      if (s < bestScore) { bestScore = s; best = i; }
    }
    return best;
  }

  // -----------------------------------------------------------------------
  // Información de formato (15 bits BCH)
  // -----------------------------------------------------------------------
  const EC_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

  function formatInfoBits(ecLevel, mask) {
    const data = (EC_BITS[ecLevel] << 3) | mask; // 5 bits
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
      if ((rem >>> i) & 1) {
        rem ^= 0b10100110111 << (i - 10);
      }
    }
    const bits = ((data << 10) | rem) ^ 0b101010000010010;
    return bits & 0x7FFF;
  }

  function placeFormatInfo(matrix, ecLevel, mask) {
    const n = matrix.length;
    const bits = formatInfoBits(ecLevel, mask);
    // Bit i (0 = LSB) → posiciones del estándar
    const getBit = (i) => (bits >>> i) & 1;

    // Vertical (al lado del buscador superior izquierdo y horizontal del inferior izquierdo)
    for (let i = 0; i < 6; i++) matrix[i][8] = { v: getBit(i), fn: true, format: true };
    matrix[7][8] = { v: getBit(6), fn: true, format: true };
    matrix[8][8] = { v: getBit(7), fn: true, format: true };
    matrix[8][7] = { v: getBit(8), fn: true, format: true };
    for (let i = 9; i < 15; i++) matrix[8][14 - i] = { v: getBit(i), fn: true, format: true };

    // Horizontal (al lado del buscador superior derecho)
    for (let i = 0; i < 8; i++) matrix[8][n - 1 - i] = { v: getBit(i), fn: true, format: true };
    for (let i = 8; i < 15; i++) matrix[n - 15 + i][8] = { v: getBit(i), fn: true, format: true };

    // Módulo oscuro fijo
    matrix[n - 8][8] = { v: 1, fn: true };
  }

  // -----------------------------------------------------------------------
  // Función principal: codifica con traza completa
  // -----------------------------------------------------------------------
  function encode(text, options) {
    options = options || {};
    let mode = options.mode || 'byte';
    const ecLevel = options.ecLevel || 'L';
    const requestedVersion = options.version || 'auto';
    let requestedMask = options.mask;
    if (requestedMask === undefined || requestedMask === null) requestedMask = 'auto';

    if (mode === 'numeric' && !isValidNumeric(text)) {
      throw new Error('El texto no es numérico (solo 0–9).');
    }
    if (mode === 'alphanumeric' && !isValidAlphanumeric(text.toUpperCase())) {
      throw new Error('El texto contiene caracteres no permitidos en modo alfanumérico.');
    }

    const version = selectVersion(text, mode, ecLevel, requestedVersion);
    if (!version) throw new Error('El texto no cabe en versiones 1–5 con este modo/EC.');

    // Paso 1
    const bytes = mode === 'byte' ? textToBytes(text) : null;

    // Paso 2: bitstream
    const bb = buildBitstream(text, mode, version, ecLevel);
    const dataCodewords = bb.toBytes();

    // Paso 3: codewords con EC
    const cw = buildCodewords(dataCodewords, version, ecLevel);

    // Paso 4: matriz con datos
    const baseMatrix = placeFunctionPatterns(version);
    // Clonar para conservar la matriz "sin máscara"
    const dataMatrix = cloneMatrix(baseMatrix);
    const placement = placeDataBits(dataMatrix, cw.finalSequence);

    // Paso 5: máscaras
    const maskScores = [];
    for (let i = 0; i < 8; i++) {
      // Para puntuar correctamente, también colocamos formato provisional
      const m = applyMask(dataMatrix, i);
      placeFormatInfo(m, ecLevel, i);
      maskScores.push({ mask: i, score: penaltyScore(m) });
    }
    let chosenMask;
    if (requestedMask === 'auto') {
      chosenMask = maskScores.reduce((a, b) => a.score < b.score ? a : b).mask;
    } else if (requestedMask === 'none') {
      chosenMask = -1;
    } else {
      chosenMask = parseInt(requestedMask, 10);
    }

    let maskedMatrix;
    if (chosenMask === -1) {
      maskedMatrix = cloneMatrix(dataMatrix);
    } else {
      maskedMatrix = applyMask(dataMatrix, chosenMask);
    }

    // Paso 6: matriz final con info de formato (si hay máscara)
    const finalMatrix = cloneMatrix(maskedMatrix);
    if (chosenMask >= 0) {
      placeFormatInfo(finalMatrix, ecLevel, chosenMask);
    }

    return {
      input: { text, mode, ecLevel, requestedVersion, requestedMask },
      version,
      size: size(version),
      bytes,
      bitstream: {
        bits: bb.bits.slice(),
        segments: bb.segments.slice(),
        dataCodewords,
      },
      codewords: cw,
      dataMatrix,           // sin máscara, sin formato
      maskedMatrix,         // con máscara, sin formato definitivo
      finalMatrix,          // con máscara y formato
      placement,
      maskScores,
      chosenMask,
    };
  }

  function cloneMatrix(m) {
    const n = m.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = new Array(n);
      for (let j = 0; j < n; j++) out[i][j] = Object.assign({}, m[i][j]);
    }
    return out;
  }

  // -----------------------------------------------------------------------
  // API pública
  // -----------------------------------------------------------------------
  global.QRLearn = {
    encode,
    applyMask,
    placeFunctionPatterns,
    placeDataBits,
    cloneMatrix,
    size,
    EC_TABLE,
    MASK_FUNCS,
    ALPHANUMERIC_CHARSET,
    formatInfoBits,
  };
})(typeof window !== 'undefined' ? window : this);
