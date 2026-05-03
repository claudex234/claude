// UI: orquesta los controles y renderiza cada paso en el DOM.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // Tamaño de módulo en SVG (px)
  const MODULE = 18;
  const MODULE_SMALL = 8;

  // Paleta tipo resaltador (pastel translúcido sobre blanco)
  const HIGHLIGHTER_PALETTE = [
    [55,  95, 75],   // amarillo
    [200, 80, 78],   // azul claro
    [325, 80, 80],   // rosa
    [120, 60, 78],   // verde
    [30,  90, 78],   // naranja
    [270, 70, 82],   // lavanda
    [180, 70, 75],   // turquesa
    [340, 80, 80],   // coral
    [80,  70, 75],   // lima
    [240, 60, 82],   // periwinkle
    [15,  85, 78],   // melocotón
    [160, 60, 76],   // menta
  ];

  function codewordColor(idx, ecStart, alpha) {
    const a = alpha != null ? alpha : 0.62;
    if (idx >= ecStart) {
      const k = idx - ecStart;
      const h = (250 + k * 31) % 360;
      return `hsla(${h}, 45%, 82%, ${a * 0.7})`;
    }
    const [h, s, l] = HIGHLIGHTER_PALETTE[idx % HIGHLIGHTER_PALETTE.length];
    // Variación sutil entre codewords de la misma posición de paleta
    const dl = Math.floor(idx / HIGHLIGHTER_PALETTE.length) * 4;
    return `hsla(${h}, ${s}%, ${l - dl}%, ${a})`;
  }

  function codewordSolidColor(idx, ecStart) {
    if (idx >= ecStart) {
      const k = idx - ecStart;
      const h = (250 + k * 31) % 360;
      return `hsl(${h}, 45%, 65%)`;
    }
    const [h, s, l] = HIGHLIGHTER_PALETTE[idx % HIGHLIGHTER_PALETTE.length];
    return `hsl(${h}, ${s}%, ${Math.max(40, l - 25)}%)`;
  }

  function bitChar(b) { return b ? '1' : '0'; }

  // Etiqueta para un codeword (byte) — muestra hex y char ASCII si es imprimible
  function codewordLabel(byte) {
    const hex = '0x' + byte.toString(16).padStart(2, '0').toUpperCase();
    if (byte >= 32 && byte < 127) {
      const ch = String.fromCharCode(byte);
      return { hex, ch };
    }
    return { hex, ch: null };
  }

  // En modo byte, describe qué caracteres del texto original aporta este codeword.
  // El bitstream es: 4(modo) + 8(count) + 8N(datos), así que cada codeword (excepto el primero)
  // contiene la nibble baja del byte anterior y la nibble alta del siguiente.
  function describeCodewordOrigin(idx, result) {
    if (result.input.mode !== 'byte') return null;
    if (result.codewords.blocks.length !== 1) return null;
    const bytes = result.bytes;
    const numData = result.codewords.dataInterleaved.length;
    if (idx >= numData) return null;
    if (idx === 0) return 'cabecera (modo + nibble alta de count)';
    if (idx === 1) {
      if (bytes.length === 0) return 'nibble baja de count';
      return `count baja + nibble alta de '${visible(bytes[0])}'`;
    }
    const aIdx = idx - 2;
    const bIdx = idx - 1;
    if (aIdx < bytes.length && bIdx < bytes.length) {
      return `nibble baja de '${visible(bytes[aIdx])}' + nibble alta de '${visible(bytes[bIdx])}'`;
    }
    if (aIdx < bytes.length && bIdx === bytes.length) {
      return `nibble baja de '${visible(bytes[aIdx])}' + terminador`;
    }
    return 'padding';
  }

  function visible(byteVal) {
    if (byteVal >= 32 && byteVal < 127) return String.fromCharCode(byteVal);
    return '0x' + byteVal.toString(16).padStart(2, '0').toUpperCase();
  }

  // ---------------------------------------------------------------------
  // Paso 1: bytes
  // ---------------------------------------------------------------------
  function renderStep1(result) {
    const c = $('step1-content');
    c.innerHTML = '';
    const info = document.createElement('div');
    info.innerHTML = `
      <p>Modo: <code>${result.input.mode}</code> ·
      Versión: <code>${result.version}</code> (${result.size}×${result.size}) ·
      Nivel EC: <code>${result.input.ecLevel}</code></p>
    `;
    c.appendChild(info);

    if (result.input.mode === 'byte') {
      const grid = document.createElement('div');
      grid.className = 'bytes-grid';
      const text = result.input.text;
      const bytes = result.bytes;
      // Reconstruir mapeo carácter → bytes (puede haber multi-byte UTF-8)
      const encoder = new TextEncoder();
      let bIdx = 0;
      for (const ch of text) {
        const chBytes = Array.from(encoder.encode(ch));
        for (let k = 0; k < chBytes.length; k++) {
          const b = bytes[bIdx + k];
          const cell = document.createElement('div');
          cell.className = 'byte-cell';
          cell.innerHTML = `
            <div class="char">${k === 0 ? escapeHtml(ch) : '·'}</div>
            <div class="hex">0x${b.toString(16).padStart(2, '0').toUpperCase()}</div>
            <div class="bin">${b.toString(2).padStart(8, '0')}</div>
          `;
          grid.appendChild(cell);
        }
        bIdx += chBytes.length;
      }
      c.appendChild(grid);
    } else {
      const p = document.createElement('p');
      p.innerHTML = `En modo <strong>${result.input.mode}</strong> los caracteres se agrupan
        de forma especial (no en bytes UTF-8). Verás cómo se traducen directamente a bits
        en el siguiente paso.`;
      c.appendChild(p);
    }
  }

  // ---------------------------------------------------------------------
  // Paso 2: bitstream
  // ---------------------------------------------------------------------
  function renderStep2(result) {
    const c = $('step2-content');
    c.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'bitstream';
    for (const seg of result.bitstream.segments) {
      const span = document.createElement('span');
      span.className = `bit-group ${seg.kind}`;
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = labelFor(seg);
      const bits = document.createElement('span');
      bits.textContent = result.bitstream.bits.slice(seg.start, seg.start + seg.length).map(bitChar).join('');
      span.appendChild(label);
      span.appendChild(bits);
      wrap.appendChild(span);
    }
    c.appendChild(wrap);

    const info = document.createElement('p');
    const cap = result.codewords.dataInterleaved.length * 8 + result.codewords.ecInterleaved.length * 8;
    const dataCap = result.codewords.dataInterleaved.length * 8;
    info.innerHTML = `Total: <strong>${result.bitstream.bits.length}</strong> bits de datos
      (capacidad de datos del bloque: ${dataCap}, total con EC: ${cap}).`;
    c.appendChild(info);
  }

  function labelFor(seg) {
    switch (seg.kind) {
      case 'mode': return `modo (${seg.value.toString(2).padStart(4,'0')})`;
      case 'count': return `nº caracteres = ${seg.value}`;
      case 'data': return `datos`;
      case 'terminator': return `terminador`;
      case 'padbit': return `relleno bit`;
      case 'padbyte': return `padding 0x${seg.value.toString(16).toUpperCase()}`;
    }
    return seg.kind;
  }

  // ---------------------------------------------------------------------
  // Paso 3: codewords con EC
  // ---------------------------------------------------------------------
  function renderStep3(result) {
    const c = $('step3-content');
    c.innerHTML = '';

    const cw = result.codewords;
    const blocksDiv = document.createElement('div');
    blocksDiv.innerHTML = `<p><strong>Bloques:</strong> ${cw.blocks.length} ·
      EC por bloque: ${cw.ecLen} codewords</p>`;
    c.appendChild(blocksDiv);

    for (let bi = 0; bi < cw.blocks.length; bi++) {
      const block = cw.blocks[bi];
      const blockEl = document.createElement('div');
      blockEl.innerHTML = `<h3 style="margin:8px 0 4px;color:var(--muted);font-size:13px">
        Bloque ${bi + 1} — ${block.data.length} datos + ${cw.ecLen} EC</h3>`;
      const list = document.createElement('div');
      list.className = 'codeword-list';
      block.data.forEach((b, i) => list.appendChild(cwCell(i, b, false)));
      block.ec.forEach((b, i) => list.appendChild(cwCell(i, b, true)));
      blockEl.appendChild(list);
      c.appendChild(blockEl);
    }

    const finalDiv = document.createElement('div');
    finalDiv.innerHTML = `<h3 style="margin:14px 0 4px;color:var(--accent);font-size:14px">
      Secuencia final (intercalada) — ${cw.finalSequence.length} codewords</h3>
      <p style="font-size:12px;color:var(--muted);margin:0 0 6px">
      Cada codeword está coloreado igual que en el paso 4 para que puedas seguirlo
      hasta su posición en la matriz.</p>`;
    const finalList = document.createElement('div');
    finalList.className = 'codeword-list';
    const ecStart = cw.dataInterleaved.length;
    cw.finalSequence.forEach((b, i) => {
      const cell = cwCell(i, b, i >= ecStart);
      cell.style.background = codewordColor(i, ecStart);
      cell.style.color = '#111';
      finalList.appendChild(cell);
    });
    finalDiv.appendChild(finalList);
    c.appendChild(finalDiv);
  }

  function cwCell(idx, byte, isEc) {
    const el = document.createElement('div');
    el.className = 'cw' + (isEc ? ' ec' : '');
    el.innerHTML = `
      <div class="idx">#${idx}${isEc ? ' EC' : ''}</div>
      <div>0x${byte.toString(16).padStart(2, '0').toUpperCase()}</div>
      <div style="font-size:10px;opacity:0.8">${byte.toString(2).padStart(8, '0')}</div>
    `;
    return el;
  }

  // ---------------------------------------------------------------------
  // Paso 4: matriz con codewords coloreados y orden de bits
  // ---------------------------------------------------------------------
  function renderStep4(result) {
    const c = $('step4-content');
    c.innerHTML = '';

    const showLabels = $('showLabels').checked;
    const colorize = $('colorize').checked;

    const svg = renderMatrixSVG(result.dataMatrix, {
      moduleSize: MODULE,
      colorize,
      showLabels,
      ecStart: result.codewords.dataInterleaved.length,
      placement: result.placement,
      codewords: result.codewords.finalSequence,
      showCodewordTags: true,
    });
    const block = document.createElement('div');
    block.className = 'qr-block';
    block.innerHTML = `<h3>Matriz con datos colocados (sin máscara) — cada bloque resaltado con su byte</h3>`;
    block.appendChild(svg);
    c.appendChild(block);

    // Sidebar / tabla de codewords con su color, byte y origen
    c.appendChild(renderCodewordIndex(result));

    const tip = document.createElement('p');
    tip.style.color = 'var(--muted)';
    tip.style.fontSize = '13px';
    tip.innerHTML = `
      Cada codeword empieza por el bit 7 (MSB) y termina por el 0 (LSB).
      El orden de recorrido va de abajo-derecha hacia arriba en columnas de 2.
      Cuando una columna sube y choca con el borde superior, se gira y baja por las
      siguientes 2 columnas. Los buscadores y la zona de timing se "saltan".
      <br><br>
      <strong>Importante</strong>: en modo Byte, los datos empiezan en el bit 12
      (después de 4 bits de modo + 8 de count). Por eso cada codeword combina la
      <em>nibble baja</em> de un carácter con la <em>nibble alta</em> del siguiente
      — la tabla siguiente lo detalla.
    `;
    c.appendChild(tip);
  }

  function renderCodewordIndex(result) {
    const wrap = document.createElement('div');
    wrap.className = 'qr-block';
    wrap.innerHTML = `<h3>Tabla de codewords — color, byte y de qué letra(s) procede</h3>`;
    const grid = document.createElement('div');
    grid.className = 'codeword-list';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';

    const final = result.codewords.finalSequence;
    const ecStart = result.codewords.dataInterleaved.length;
    final.forEach((b, i) => {
      const isEc = i >= ecStart;
      const cell = document.createElement('div');
      cell.className = 'cw' + (isEc ? ' ec' : '');
      cell.style.background = codewordColor(i, ecStart, 0.55);
      cell.style.color = '#0a0a0a';
      cell.style.borderColor = codewordSolidColor(i, ecStart);
      cell.style.textAlign = 'left';
      cell.style.padding = '6px 8px';

      const lbl = codewordLabel(b);
      const origin = isEc
        ? 'corrección de errores (Reed-Solomon)'
        : (describeCodewordOrigin(i, result) || 'datos');

      cell.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <strong>#${i}${isEc ? ' EC' : ''}</strong>
          <span style="font-size:14px">${lbl.hex}${lbl.ch ? ' · <strong>' + escapeHtml(lbl.ch) + '</strong>' : ''}</span>
        </div>
        <div style="font-size:10px;opacity:0.85;margin-top:2px">${b.toString(2).padStart(8,'0')}</div>
        <div style="font-size:10px;opacity:0.8;margin-top:3px">${origin}</div>
      `;
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  // ---------------------------------------------------------------------
  // Paso 5: máscaras
  // ---------------------------------------------------------------------
  function renderStep5(result) {
    const c = $('step5-content');
    c.innerHTML = '';

    const before = renderMatrixSVG(result.dataMatrix, {
      moduleSize: MODULE,
      colorize: false,
      showLabels: false,
    });
    const after = renderMatrixSVG(result.maskedMatrix, {
      moduleSize: MODULE,
      colorize: false,
      showLabels: false,
      highlightMask: result.dataMatrix,
    });
    const delim = renderMatrixSVG(result.maskedMatrix, {
      moduleSize: MODULE,
      colorize: false,
      showLabels: false,
      delimitMask: result.dataMatrix,
    });

    const row = document.createElement('div');
    row.className = 'qr-row';

    const b1 = document.createElement('div'); b1.className = 'qr-block';
    b1.innerHTML = `<h3>Antes de la máscara</h3>`;
    b1.appendChild(before);
    row.appendChild(b1);

    const b2 = document.createElement('div'); b2.className = 'qr-block';
    b2.innerHTML = `<h3>Tras aplicar máscara
      ${result.chosenMask >= 0 ? `<strong>${result.chosenMask}</strong>` : '<em>(ninguna)</em>'}
      <span style="color:var(--muted)">— módulos volteados en amarillo</span></h3>`;
    b2.appendChild(after);
    row.appendChild(b2);

    const b3 = document.createElement('div'); b3.className = 'qr-block';
    b3.innerHTML = `<h3>Líneas de la máscara delimitadas
      <span style="color:var(--muted)">— borde fucsia = celda volteada</span></h3>`;
    b3.appendChild(delim);
    row.appendChild(b3);

    c.appendChild(row);

    // Patrón puro de la máscara (sin datos), para visualizar la "rejilla" de ofuscación
    if (result.chosenMask >= 0) {
      const pureBlock = document.createElement('div');
      pureBlock.className = 'qr-block';
      pureBlock.innerHTML = `<h3>Patrón puro de la máscara ${result.chosenMask}
        <span style="color:var(--muted)">— solo se aplica a los módulos de datos</span></h3>`;
      pureBlock.appendChild(renderPureMaskSVG(result.size, result.chosenMask, result.dataMatrix));
      c.appendChild(pureBlock);
    }

    // Mosaico de las 8 máscaras con su puntuación
    const mosaic = document.createElement('div');
    mosaic.className = 'mask-grid';
    for (let i = 0; i < 8; i++) {
      const masked = QRLearn.applyMask(result.dataMatrix, i);
      const card = document.createElement('div');
      card.className = 'mask-card' + (i === result.chosenMask ? ' selected' : '');
      const svg = renderMatrixSVG(masked, { moduleSize: MODULE_SMALL, colorize: false, showLabels: false });
      card.appendChild(svg);
      const score = result.maskScores[i].score;
      card.innerHTML += `<div class="label">Máscara ${i} · score ${score}</div>`;
      mosaic.appendChild(card);
    }
    const mosaicWrap = document.createElement('div'); mosaicWrap.className = 'qr-block';
    mosaicWrap.innerHTML = `<h3>Las 8 máscaras posibles (menor score = mejor)</h3>`;
    mosaicWrap.appendChild(mosaic);
    c.appendChild(mosaicWrap);
  }

  // ---------------------------------------------------------------------
  // Paso 6: QR final
  // ---------------------------------------------------------------------
  function renderStep6(result) {
    const c = $('step6-content');
    c.innerHTML = '';

    const big = renderMatrixSVG(result.finalMatrix, {
      moduleSize: MODULE,
      colorize: false,
      showLabels: false,
      quietZone: 4,
    });
    const block = document.createElement('div'); block.className = 'qr-block';
    block.innerHTML = `<h3>Código QR completo</h3>`;
    block.appendChild(big);

    const colored = renderMatrixSVG(result.finalMatrix, {
      moduleSize: MODULE,
      colorize: true,
      showLabels: $('showLabels').checked,
      placement: result.placement,
      ecStart: result.codewords.dataInterleaved.length,
      codewords: result.codewords.finalSequence,
      showCodewordTags: true,
      quietZone: 4,
    });
    const block2 = document.createElement('div'); block2.className = 'qr-block';
    block2.innerHTML = `<h3>El mismo QR con cada codeword resaltado y etiquetado</h3>`;
    block2.appendChild(colored);

    const row = document.createElement('div'); row.className = 'qr-row';
    row.appendChild(block); row.appendChild(block2);
    c.appendChild(row);
  }

  // ---------------------------------------------------------------------
  // Renderizador SVG de la matriz
  // ---------------------------------------------------------------------
  function renderMatrixSVG(matrix, opts) {
    opts = opts || {};
    const m = opts.moduleSize || MODULE;
    const n = matrix.length;
    const quiet = opts.quietZone || 0;
    const total = (n + 2 * quiet) * m;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'qr-svg');
    svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
    svg.setAttribute('width', total);
    svg.setAttribute('height', total);

    // Fondo blanco
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', total); bg.setAttribute('height', total);
    bg.setAttribute('fill', 'white');
    svg.appendChild(bg);

    const cwGroupCells = new Map(); // codewordIndex → [{r,c,cell}]

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = matrix[r][c];
        const x = (c + quiet) * m;
        const y = (r + quiet) * m;

        let fill = cell.v ? '#111' : '#ffffff';

        if (opts.colorize && cell.data && !cell.padding) {
          const idx = cell.codewordIndex;
          const ecStart = opts.ecStart || 0;
          const baseColor = codewordColor(idx, ecStart);
          // Fondo tipo resaltador
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', x); rect.setAttribute('y', y);
          rect.setAttribute('width', m); rect.setAttribute('height', m);
          rect.setAttribute('fill', baseColor);
          svg.appendChild(rect);

          // Indicador del bit on/off como punto interior
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const pad = m * 0.18;
          dot.setAttribute('x', x + pad); dot.setAttribute('y', y + pad);
          dot.setAttribute('width', m - 2 * pad); dot.setAttribute('height', m - 2 * pad);
          dot.setAttribute('fill', cell.v ? '#111' : 'rgba(255,255,255,0.85)');
          dot.setAttribute('stroke', cell.v ? 'none' : 'rgba(0,0,0,0.25)');
          dot.setAttribute('stroke-width', '0.5');
          svg.appendChild(dot);

          if (opts.showLabels && m >= 14) {
            const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt.setAttribute('x', x + m / 2);
            txt.setAttribute('y', y + m * 0.84);
            txt.setAttribute('text-anchor', 'middle');
            txt.setAttribute('font-size', m * 0.38);
            txt.setAttribute('fill', cell.v ? '#fff' : '#222');
            txt.setAttribute('font-family', 'monospace');
            txt.textContent = cell.bitIndex;
            svg.appendChild(txt);
          }

          // Guardar para etiqueta posterior y bordes de codeword
          if (!cwGroupCells.has(idx)) cwGroupCells.set(idx, []);
          cwGroupCells.get(idx).push({ r, c, cell });
          continue;
        }

        if (opts.highlightMask && cell.masked) {
          fill = cell.v ? '#b88800' : '#fff3a8';
        } else if (cell.fn) {
          fill = cell.v ? '#222' : '#e8edf3';
        }

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        rect.setAttribute('width', m); rect.setAttribute('height', m);
        rect.setAttribute('fill', fill);
        svg.appendChild(rect);
      }
    }

    // Delimitar las celdas afectadas por la máscara con un borde fucsia
    if (opts.delimitMask) {
      const ref = opts.delimitMask; // matriz original (sin máscara) para saber celdas data
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const cell = matrix[r][c];
          if (!cell.masked) continue;
          const x = (c + quiet) * m;
          const y = (r + quiet) * m;
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const off = 1;
          rect.setAttribute('x', x + off); rect.setAttribute('y', y + off);
          rect.setAttribute('width', m - 2 * off); rect.setAttribute('height', m - 2 * off);
          rect.setAttribute('fill', 'none');
          rect.setAttribute('stroke', '#e91e63');
          rect.setAttribute('stroke-width', Math.max(1, m * 0.12));
          rect.setAttribute('stroke-dasharray', `${m * 0.25},${m * 0.15}`);
          svg.appendChild(rect);
        }
      }
    }

    // Etiquetas de codeword (hex + carácter ASCII si lo hay)
    if (opts.colorize && opts.showCodewordTags && opts.codewords && m >= 14) {
      const ecStart = opts.ecStart || 0;
      for (const [idx, cells] of cwGroupCells) {
        if (idx >= ecStart) continue; // etiquetar solo los de datos para no saturar
        const byte = opts.codewords[idx];
        if (byte === undefined) continue;
        const lbl = codewordLabel(byte);

        // Centro de masa
        let sx = 0, sy = 0;
        for (const ce of cells) { sx += ce.c; sy += ce.r; }
        const cx = ((sx / cells.length) + quiet) * m + m / 2;
        const cy = ((sy / cells.length) + quiet) * m + m / 2;

        // Fondo del badge
        const text = lbl.ch ? `${lbl.hex} ${lbl.ch}` : lbl.hex;
        const charW = m * 0.42;
        const padX = m * 0.25, padY = m * 0.15;
        const boxW = text.length * charW * 0.62 + 2 * padX;
        const boxH = m * 0.85;
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', cx - boxW / 2); bg.setAttribute('y', cy - boxH / 2);
        bg.setAttribute('width', boxW); bg.setAttribute('height', boxH);
        bg.setAttribute('rx', 4); bg.setAttribute('ry', 4);
        bg.setAttribute('fill', 'rgba(255,255,255,0.92)');
        bg.setAttribute('stroke', codewordSolidColor(idx, ecStart));
        bg.setAttribute('stroke-width', '1.2');
        svg.appendChild(bg);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', cx); txt.setAttribute('y', cy + boxH * 0.15);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', charW);
        txt.setAttribute('fill', '#0a0a0a');
        txt.setAttribute('font-family', 'ui-monospace, "SF Mono", Menlo, monospace');
        txt.setAttribute('font-weight', '600');
        txt.textContent = text;
        svg.appendChild(txt);
      }
    }

    // Líneas de cuadrícula sutiles para versiones grandes con módulos pequeños
    if (opts.colorize && m >= 12) {
      for (let i = 0; i <= n; i++) {
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', (i + quiet) * m); line1.setAttribute('y1', quiet * m);
        line1.setAttribute('x2', (i + quiet) * m); line1.setAttribute('y2', (n + quiet) * m);
        line1.setAttribute('stroke', 'rgba(0,0,0,0.05)');
        line1.setAttribute('stroke-width', '0.4');
        svg.appendChild(line1);
      }
    }

    return svg;
  }

  // ---------------------------------------------------------------------
  // Render del patrón puro de la máscara (solo donde aplica = celdas de datos)
  // ---------------------------------------------------------------------
  function renderPureMaskSVG(n, maskNum, dataMatrix) {
    const m = MODULE;
    const total = n * m;
    const fn = QRLearn.MASK_FUNCS[maskNum];

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'qr-svg');
    svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
    svg.setAttribute('width', total); svg.setAttribute('height', total);

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', total); bg.setAttribute('height', total);
    bg.setAttribute('fill', '#fff');
    svg.appendChild(bg);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = dataMatrix[r][c];
        const x = c * m, y = r * m;

        // Las celdas de patrones funcionales no se enmascaran — las pintamos en gris claro
        if (cell.fn) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', x); rect.setAttribute('y', y);
          rect.setAttribute('width', m); rect.setAttribute('height', m);
          rect.setAttribute('fill', '#f4f5f7');
          svg.appendChild(rect);
          continue;
        }
        // Celda de datos: si la máscara la afecta, fucsia; si no, blanco con borde sutil
        const active = fn(r, c);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        rect.setAttribute('width', m); rect.setAttribute('height', m);
        rect.setAttribute('fill', active ? '#e91e63' : '#fff');
        rect.setAttribute('stroke', '#ccc');
        rect.setAttribute('stroke-width', '0.4');
        svg.appendChild(rect);
      }
    }

    return svg;
  }

  // ---------------------------------------------------------------------
  // Leyenda: 256 formas de codeword (mini matrices 2x4)
  // ---------------------------------------------------------------------
  function renderLegend() {
    const c = $('legend-content');
    c.innerHTML = '';
    const onlyPrintable = $('legendAscii').checked;
    const grid = document.createElement('div');
    grid.className = 'legend-grid';

    const start = onlyPrintable ? 32 : 0;
    const end = onlyPrintable ? 127 : 256;

    for (let b = start; b < end; b++) {
      const cell = document.createElement('div');
      cell.className = 'legend-cell';
      const ch = (b >= 32 && b < 127) ? String.fromCharCode(b) : '·';
      cell.innerHTML = `
        <div class="ch">${escapeHtml(ch)}</div>
        <div>${legendShape(b)}</div>
        <div class="bx">0x${b.toString(16).padStart(2, '0').toUpperCase()}</div>
      `;
      grid.appendChild(cell);
    }
    c.appendChild(grid);
  }

  // Dibuja la forma 2×4 estándar de un codeword (tira ascendente, derecha primero)
  function legendShape(byte) {
    // Bits MSB→LSB en orden de colocación: 7,6,5,4,3,2,1,0
    // Posiciones (r,c) en bloque 2x4 (col 0=izda, col 1=dcha; tira ascendente):
    // bit 7: r=3, c=1 ; bit 6: r=3, c=0
    // bit 5: r=2, c=1 ; bit 4: r=2, c=0
    // bit 3: r=1, c=1 ; bit 2: r=1, c=0
    // bit 1: r=0, c=1 ; bit 0: r=0, c=0
    const cells = [];
    for (let r = 0; r < 4; r++) {
      const row = [];
      for (let col = 0; col < 2; col++) {
        const bitInPair = col === 1 ? 1 : 0; // derecha primero
        const bitIdx = (3 - r) * 2 + (1 - bitInPair); // bit más alto arriba a la dcha
        // Actualmente: (r=3,col=1)→bitIdx 7 ✓
        // (r=3,col=0)→6 ✓; (r=0,col=0)→0 ✓
        const v = (byte >> bitIdx) & 1;
        row.push(v);
      }
      cells.push(row);
    }

    const svgNs = 'http://www.w3.org/2000/svg';
    const m = 7;
    const w = 2 * m, h = 4 * m;
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w * 2);
    svg.setAttribute('height', h * 2);
    svg.style.background = '#fff';
    svg.style.borderRadius = '2px';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const rect = document.createElementNS(svgNs, 'rect');
        rect.setAttribute('x', c * m); rect.setAttribute('y', r * m);
        rect.setAttribute('width', m); rect.setAttribute('height', m);
        rect.setAttribute('fill', cells[r][c] ? '#111' : '#fff');
        rect.setAttribute('stroke', '#ccc');
        rect.setAttribute('stroke-width', '0.4');
        svg.appendChild(rect);
      }
    }
    return svg.outerHTML;
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[c]));
  }

  // ---------------------------------------------------------------------
  // Wire-up
  // ---------------------------------------------------------------------
  function generate() {
    try {
      const text = $('text').value;
      const mode = $('mode').value;
      const version = $('version').value;
      const ecLevel = $('ecLevel').value;
      const mask = $('mask').value;

      const result = QRLearn.encode(text, { mode, version, ecLevel, mask });

      renderStep1(result);
      renderStep2(result);
      renderStep3(result);
      renderStep4(result);
      renderStep5(result);
      renderStep6(result);
    } catch (e) {
      alert('Error: ' + e.message);
      console.error(e);
    }
  }

  $('generate').addEventListener('click', generate);
  $('text').addEventListener('keydown', (e) => { if (e.key === 'Enter') generate(); });
  $('showLabels').addEventListener('change', generate);
  $('colorize').addEventListener('change', generate);
  $('legendAscii').addEventListener('change', renderLegend);

  generate();
  renderLegend();
})();
