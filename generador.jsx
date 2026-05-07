/* global React, Icon, fmtMoney, PRODUCTOS, BLOQUES_PANTALLA, parseProductCode */
const { useState: useState_g, useMemo: useMemo_g, useRef: useRef_g, useLayoutEffect: useLayoutEffect_g, useEffect: useEffect_g } = React;

// === Sistema de paginación A4 ===
// Renderiza children en hojas A4 reales (595×842px). Mide bloques con data-block
// y los reagrupa en páginas según altura disponible.
const A4_HEIGHT = 842;
const A4_WIDTH = 595;
const A4_PAD_V = 30;
const A4_PAD_H = 26;
const A4_CONTENT_H = A4_HEIGHT - (A4_PAD_V * 2); // 782px utilizables

const A4Sheet = ({ children, pageNum, totalPages }) => (
  <div style={{
    width: A4_WIDTH, height: A4_HEIGHT,
    margin: "0 auto 16px",
    padding: `${A4_PAD_V}px ${A4_PAD_H}px`,
    boxSizing: "border-box",
    background: "white",
    boxShadow: "0 1px 4px rgba(0,0,0,.1)",
    fontFamily: "var(--font-sans)",
    color: "#0a2540",
    position: "relative",
    overflow: "hidden",
  }}>
    {children}
    <div style={{ position: "absolute", bottom: 10, right: 14, fontSize: 8, color: "#8898aa", fontFamily: "var(--font-mono)" }}>
      {pageNum} / {totalPages}
    </div>
  </div>
);

// Componente que mide blocks y los pagina
const Paginator = ({ blocks }) => {
  const measureRef = useRef_g(null);
  const [pages, setPages] = useState_g([blocks.map((_, i) => i)]); // página inicial: todos juntos

  useLayoutEffect_g(() => {
    if (!measureRef.current) return;
    const els = measureRef.current.querySelectorAll("[data-block]");
    const heights = Array.from(els).map(el => el.offsetHeight);
    // Distribuir en páginas
    const newPages = [];
    let current = [];
    let used = 0;
    const FOOTER_RESERVE = 18;
    const available = A4_CONTENT_H - FOOTER_RESERVE;
    blocks.forEach((_, i) => {
      const h = heights[i] || 0;
      if (used + h > available && current.length > 0) {
        newPages.push(current);
        current = [i];
        used = h;
      } else {
        current.push(i);
        used += h;
      }
    });
    if (current.length) newPages.push(current);
    setPages(newPages);
  }, [blocks]);

  return (
    <>
      {/* hidden measurement layer */}
      <div ref={measureRef} style={{ position: "absolute", left: -99999, top: 0, width: A4_WIDTH - (A4_PAD_H * 2), visibility: "hidden", fontFamily: "var(--font-sans)", color: "#0a2540" }}>
        {blocks.map((b, i) => <div key={i} data-block>{b}</div>)}
      </div>
      {/* visible pages */}
      {pages.map((idxs, pi) => (
        <A4Sheet key={pi} pageNum={pi + 1} totalPages={pages.length}>
          {idxs.map(i => <div key={i}>{blocks[i]}</div>)}
        </A4Sheet>
      ))}
    </>
  );
};

// Resalta en <b> los términos técnicos clave (estilo plantilla Excel)
const BOLD_TERMS = [
  "CPU", "GPU", "NPU", "RAM", "SSD", "NFC", "huella dactilar", "MOSH", "IK7", "IK10",
  "4K UHD", "Android 13", "ePTZ", "USB-C", "USB-C full", "HDMI", "Wi-Fi", "Bluetooth",
  "TOPS", "subwoofer", "VESA", "DisplayPort", "matriz",
];
function renderBoldFragments(text) {
  const re = new RegExp("(" + BOLD_TERMS.map(t => t.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|") + ")", "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    BOLD_TERMS.some(t => t.toLowerCase() === p.toLowerCase())
      ? <b key={i}>{p}</b>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

// === Generador Split-View ===
const Generador = ({ goToDetail }) => {
  const [pasted, setPasted] = useState_g("Constructora Andina S.A.C.\nRUC 20512345678\nMaría Quispe\n+51 987 654 321\nmquispe@andina.com.pe\n3PLUS8500");
  const [parsed, setParsed] = useState_g({
    cliente: "Constructora Andina S.A.C.",
    contacto: "María Quispe",
    ruc: "20512345678",
    telefono: "+51 987 654 321",
    email: "mquispe@andina.com.pe",
  });
  const [productCode, setProductCode] = useState_g(null);
  const [items, setItems] = useState_g([
    { qty: 3, modelo: "PLUS", producto: window.PRODUCTOS.PLUS, precio: 8500, total: 25500 },
  ]);
  const [asunto, setAsunto] = useState_g("Pantallas interactivas - 3 unidades");
  const [validez, setValidez] = useState_g(15);

  // Parser mejorado: cliente + última línea = código de producto
  const parsePaste = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const out = { cliente: "", contacto: "", ruc: "", telefono: "", email: "" };
    let foundCli = false, foundCon = false;
    let codeLine = null;

    // La última línea es el código de producto si matchea
    if (lines.length > 0) {
      const lastParse = parseProductCode(lines[lines.length - 1]);
      if (lastParse) {
        codeLine = lastParse;
        lines.pop();
      }
    }

    lines.forEach(line => {
      const rucMatch = line.match(/\b(20|10|15)\d{9}\b/);
      const phoneMatch = line.match(/(?:\+51\s?)?\d{3}\s?\d{3}\s?\d{3}/);
      const emailMatch = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (rucMatch) out.ruc = rucMatch[0];
      else if (emailMatch) out.email = emailMatch[0];
      else if (phoneMatch) out.telefono = phoneMatch[0];
      else if (/s\.?a\.?c?\.?|s\.?r\.?l\.?|colegio|universidad|instituto|i\.?e\.?p?\.?/i.test(line) && !foundCli) {
        out.cliente = line; foundCli = true;
      } else if (!foundCon && line.split(" ").length >= 2 && line.split(" ").length <= 4) {
        out.contacto = line; foundCon = true;
      } else if (!foundCli) {
        out.cliente = line; foundCli = true;
      }
    });

    setParsed(out);
    if (codeLine) {
      setProductCode(codeLine);
      setItems([{
        qty: codeLine.qty,
        modelo: codeLine.modelo,
        producto: codeLine.producto,
        precio: codeLine.precio,
        total: codeLine.qty * codeLine.precio,
      }]);
      setAsunto(`${codeLine.producto.tamano} ${codeLine.producto.codigo} - ${codeLine.qty} ${codeLine.qty === 1 ? "unidad" : "unidades"}`);
    } else {
      setProductCode(null);
    }
  };

  const hasPantalla = items.some(i => i.producto && i.producto.tipo === "pantalla");
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  const updateItem = (idx, key, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    if (key === "qty" || key === "precio") next[idx].total = (next[idx].qty || 0) * (next[idx].precio || 0);
    setItems(next);
  };
  const addProduct = (modelo) => {
    const prod = PRODUCTOS[modelo];
    setItems([...items, { qty: 1, modelo, producto: prod, precio: prod.precioDefault, total: prod.precioDefault }]);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="page fade-in" style={{ padding: 0, maxWidth: "100%" }}>
      <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div>
          <input className="input" value={asunto} onChange={e => setAsunto(e.target.value)}
            style={{ border: "none", padding: 0, fontSize: 18, fontWeight: 600, background: "transparent", width: 480, fontFamily: "var(--font-display)" }} />
          <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2, fontFamily: "var(--font-mono)" }}>PRF-2026-0143 · borrador</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="copy" /> Duplicar</button>
          <button className="btn"><Icon name="download" /> PDF</button>
          <button className="btn"><Icon name="link" /> Copiar link</button>
          <button className="btn" style={{ background: "#25D366", color: "white", border: "none" }}><Icon name="whatsapp" /> WhatsApp</button>
          <button className="btn btn-primary" onClick={() => goToDetail()}><Icon name="send" /> Enviar al cliente</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "calc(100vh - 56px - 73px)", overflow: "hidden" }}>
        {/* === LEFT: editor === */}
        <div style={{ overflowY: "auto", padding: "24px 28px", borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
          {/* Pegar datos */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label className="field-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="sparkle" size={13} /> Pega datos del cliente + producto
              </label>
              <span style={{ fontSize: 11, color: "var(--text-mute)" }}>la última línea = código del producto</span>
            </div>
            <textarea
              className="textarea"
              placeholder={"Constructora Andina S.A.C.\nRUC 20512345678\nMaría Quispe\n+51 987 654 321\n3PRO6000"}
              value={pasted}
              onChange={e => { setPasted(e.target.value); parsePaste(e.target.value); }}
              rows={6}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-3)", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {parsed.ruc && <span className="badge badge-success"><Icon name="check" size={11} /> RUC</span>}
              {parsed.email && <span className="badge badge-success"><Icon name="check" size={11} /> Email</span>}
              {parsed.telefono && <span className="badge badge-success"><Icon name="check" size={11} /> Teléfono</span>}
              {parsed.contacto && <span className="badge badge-success"><Icon name="check" size={11} /> Contacto</span>}
              {productCode && (
                <span className="badge badge-accent">
                  <Icon name="sparkle" size={11} /> {productCode.qty}× {productCode.modelo} · {fmtMoney(productCode.precio)}
                </span>
              )}
            </div>
            <details style={{ marginTop: 10, fontSize: 12 }}>
              <summary style={{ cursor: "pointer", color: "var(--text-3)", fontWeight: 500 }}>Códigos de producto</summary>
              <div style={{ marginTop: 8, padding: 12, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)", lineHeight: 1.7, fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                <div><b>3PRO6000</b> → 3 unidades de PRO a S/ 6,000 c/u</div>
                <div><b>1PLUS</b> → 1 unidad de PLUS al precio default</div>
                <div><b>pro</b> → 1 unidad de PRO al precio default</div>
                <div style={{ marginTop: 6, color: "var(--text-mute)", fontFamily: "var(--font-sans)" }}>Modelos: PRO (75"), PLUS (86"), ELITE (98")</div>
              </div>
            </details>
          </section>

          {/* Datos cliente */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-2)" }}>Cliente</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Razón social</label>
                <input className="input" value={parsed.cliente} onChange={e => setParsed({ ...parsed, cliente: e.target.value })} />
              </div>
              <div>
                <label className="field-label">RUC</label>
                <input className="input" value={parsed.ruc} onChange={e => setParsed({ ...parsed, ruc: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Contacto</label>
                <input className="input" value={parsed.contacto} onChange={e => setParsed({ ...parsed, contacto: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="input" value={parsed.email} onChange={e => setParsed({ ...parsed, email: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Teléfono</label>
                <input className="input" value={parsed.telefono} onChange={e => setParsed({ ...parsed, telefono: e.target.value })} />
              </div>
            </div>
          </section>

          {/* Productos */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-2)" }}>Productos ({items.length})</h3>
              <div style={{ display: "flex", gap: 4 }}>
                {Object.keys(PRODUCTOS).map(k => (
                  <button key={k} className="btn btn-sm" onClick={() => addProduct(k)}>
                    <Icon name="plus" size={11} /> {k}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", background: "var(--surface-2)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 110px 28px", gap: 10, alignItems: "center" }}>
                    <input className="input" type="number" value={it.qty} onChange={e => updateItem(idx, "qty", +e.target.value)}
                      style={{ padding: "5px 8px", fontSize: 13, fontFamily: "var(--font-mono)", textAlign: "center" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{it.producto?.nombre || it.desc}</div>
                      {it.producto && (
                        <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                          {it.producto.specs.length} specs · {it.producto.incluye.length} accesorios
                        </div>
                      )}
                    </div>
                    <input className="input" type="number" value={it.precio} onChange={e => updateItem(idx, "precio", +e.target.value)}
                      style={{ padding: "5px 8px", fontSize: 13, fontFamily: "var(--font-mono)", textAlign: "right" }} />
                    <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{fmtMoney(it.total)}</div>
                    <button className="btn-icon btn-ghost" onClick={() => removeItem(idx)} style={{ padding: 2, color: "var(--text-mute)" }}>
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                  {it.producto && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: "pointer", fontSize: 11.5, color: "var(--text-3)", fontWeight: 500 }}>
                        Ver descripción completa
                      </summary>
                      <div style={{ marginTop: 8, padding: 10, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)", fontSize: 11.5, lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Especificaciones</div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-2)" }}>
                          {it.producto.specs.slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
                          {it.producto.specs.length > 6 && <li style={{ color: "var(--text-mute)" }}>+ {it.producto.specs.length - 6} más…</li>}
                        </ul>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Bloques automáticos */}
          {hasPantalla && (
            <section style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-2)" }}>
                Bloques automáticos <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text-mute)", textTransform: "none", letterSpacing: 0 }}>· detectada pantalla interactiva</span>
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: 12, background: "var(--success-soft)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--success)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", marginBottom: 6 }}>✓ Servicios incluidos</div>
                  {BLOQUES_PANTALLA.serviciosIncluidos.map((s, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.4 }}>· {s}</div>
                  ))}
                </div>
                <div style={{ padding: 12, background: "var(--danger-soft)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--danger)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 6 }}>✗ No incluido</div>
                  {BLOQUES_PANTALLA.noIncluido.map((s, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.4 }}>· {s}</div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-2)" }}>Términos</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label">Validez (días)</label>
                <input className="input" type="number" value={validez} onChange={e => setValidez(+e.target.value)} />
              </div>
              <div>
                <label className="field-label">Forma de pago</label>
                <select className="input" defaultValue="50/50">
                  <option>50% adelanto / 50% entrega</option>
                  <option>Contra entrega</option>
                  <option>Crédito 30 días</option>
                </select>
              </div>
              <div>
                <label className="field-label">Tiempo de entrega</label>
                <input className="input" defaultValue="15 días hábiles" />
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 14, background: "var(--accent-soft)", borderRadius: "var(--radius)", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icon name="shield" size={16} />
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)" }}>
                <b style={{ color: "var(--accent-strong)" }}>Tracking activo en este PDF:</b><br/>
                aperturas, IPs, dispositivo, tiempo por página, descargas, reenvíos y giroscopio (Android/iOS).
              </div>
            </div>
          </section>
        </div>

        {/* === RIGHT: preview — hojas A4 paginadas === */}
        <div style={{ background: "var(--bg-soft)", overflowY: "auto", padding: "32px", position: "relative" }}>
          <Paginator blocks={[
            <div key="hdr" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "2px solid #0a2540", paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: "#0a2540", color: "white", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>N</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -.2 }}>Norden Tecnología Educativa SAC</div>
                    <div style={{ fontSize: 9, color: "#6b7c93" }}>RUC 20512345678 · ventas@norden.pe · 998 765 432</div>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 8.5, color: "#8898aa", textTransform: "uppercase", letterSpacing: 1 }}>Documento</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>PRF-2026-0143</div>
                <div style={{ fontSize: 9.5, color: "#6b7c93", marginTop: 2 }}>07/05/2026</div>
              </div>
            </div>,
            <div key="title" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 12, letterSpacing: -.3, textAlign: "center" }}>Proforma</div>,
            <div key="cli" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#f6f9fc", padding: "9px 11px", borderRadius: 5 }}>
                <div style={{ fontSize: 8.5, color: "#8898aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3, fontWeight: 600 }}>Cliente</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 2 }}>{parsed.cliente || "—"}</div>
                <div style={{ fontSize: 9.5, color: "#425466", lineHeight: 1.5 }}>
                  RUC {parsed.ruc || "—"}<br/>
                  {parsed.contacto || "—"}<br/>
                  {parsed.email && <>{parsed.email}<br/></>}
                  {parsed.telefono}
                </div>
              </div>
              <div style={{ background: "#f6f9fc", padding: "9px 11px", borderRadius: 5 }}>
                <div style={{ fontSize: 8.5, color: "#8898aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3, fontWeight: 600 }}>Términos</div>
                <table style={{ fontSize: 9.5, color: "#425466", lineHeight: 1.5, borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td style={{ paddingRight: 8, color: "#6b7c93" }}>Tiempo entrega</td><td style={{ fontWeight: 600, color: "#0a2540" }}>15 días calendario</td></tr>
                    <tr><td style={{ paddingRight: 8, color: "#6b7c93" }}>Lugar entrega</td><td style={{ fontWeight: 600, color: "#0a2540" }}>Lima, según OC</td></tr>
                    <tr><td style={{ paddingRight: 8, color: "#6b7c93" }}>Garantía</td><td style={{ fontWeight: 600, color: "#0a2540" }}>2 años</td></tr>
                    <tr><td style={{ paddingRight: 8, color: "#6b7c93" }}>Validez</td><td style={{ fontWeight: 600, color: "#0a2540" }}>{validez} días</td></tr>
                    <tr><td style={{ paddingRight: 8, color: "#6b7c93" }}>Condiciones</td><td style={{ fontWeight: 600, color: "#0a2540" }}>T/T</td></tr>
                  </tbody>
                </table>
              </div>
            </div>,
            // header tabla
            <div key="thead" style={{ borderBottom: "2px solid #0a2540", display: "grid", gridTemplateColumns: "5% 70% 12.5% 12.5%", color: "#6b7c93", fontSize: 8.5, textTransform: "uppercase", letterSpacing: .5, fontWeight: 600, padding: "6px 0" }}>
              <div style={{ textAlign: "center" }}>Cant</div>
              <div style={{ paddingLeft: 4 }}>Descripción</div>
              <div style={{ textAlign: "right" }}>P. Und</div>
              <div style={{ textAlign: "right" }}>Subtotal</div>
            </div>,
            // un bloque por item
            ...items.filter(it => it.producto).map((it, idx) => {
              const p = it.producto;
              const highlightSet = new Set(p.specsHighlight || []);
              return (
                <div key={"item"+idx} style={{ borderBottom: "1px solid #e3e8ee", display: "grid", gridTemplateColumns: "5% 70% 12.5% 12.5%", padding: "8px 0", fontSize: 8.5, lineHeight: 1.4, color: "#425466" }}>
                  <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, color: "#0073e6", paddingTop: 2 }}>{it.qty}</div>
                  <div style={{ paddingLeft: 4, paddingRight: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#0a2540", marginBottom: 3 }}>{p.nombre}</div>
                    {p.specs.map((s, i) => {
                      const hl = highlightSet.has(s);
                      return (
                        <div key={i} style={{ display: "flex", gap: 4, background: hl ? "#fff8c4" : "transparent", padding: hl ? "0 3px" : 0, fontWeight: hl ? 600 : 400, color: hl ? "#0a2540" : "#425466" }}>
                          <span style={{ color: "#cbd2d9" }}>·</span>
                          <span>{renderBoldFragments(s)}</span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: "#0a2540", marginTop: 6, marginBottom: 1, textTransform: "uppercase", letterSpacing: .4 }}>Incluido en el paquete</div>
                    {p.incluye.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 4 }}>
                        <span style={{ color: "#cbd2d9" }}>·</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9, paddingTop: 2, paddingRight: 5 }}>S/ {it.precio.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, color: "#0a2540", paddingTop: 2, paddingRight: 5 }}>S/ {it.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</div>
                </div>
              );
            }),
            <div key="totales" style={{ marginTop: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontSize: 9.5, color: "#425466", padding: "3px 5px" }}>
                <div>Subtotal</div>
                <div style={{ fontFamily: "var(--font-mono)", minWidth: 75, textAlign: "right" }}>S/ {subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontSize: 9.5, color: "#425466", padding: "3px 5px" }}>
                <div>IGV (18%)</div>
                <div style={{ fontFamily: "var(--font-mono)", minWidth: 75, textAlign: "right" }}>S/ {igv.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontSize: 11.5, fontWeight: 700, color: "#0a2540", padding: "7px 5px", borderTop: "2px solid #0a2540", marginTop: 4 }}>
                <div>Total</div>
                <div style={{ fontFamily: "var(--font-mono)", minWidth: 75, textAlign: "right" }}>S/ {total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>,
            <div key="imgs" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: "#0a2540", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>Imágenes referenciales</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {items.filter(it => it.producto?.imagen).map((it, idx) => (
                  <div key={idx} style={{ width: 130 }}>
                    <img src={it.producto.imagen} alt={it.producto.codigo} style={{ width: "100%", height: "auto", display: "block", borderRadius: 3, border: "1px solid #e3e8ee" }} />
                    <div style={{ fontSize: 8.5, color: "#6b7c93", marginTop: 3, fontFamily: "var(--font-mono)", textAlign: "center" }}>{it.producto.codigo} · {it.producto.tamano}</div>
                  </div>
                ))}
              </div>
            </div>,
            ...(hasPantalla ? [
              <div key="serv" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: "9px 11px", background: "#e6faec", borderRadius: 4, borderLeft: "3px solid #00d639" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#008f25", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Servicios incluidos</div>
                  {BLOQUES_PANTALLA.serviciosIncluidos.map((s, i) => (
                    <div key={i} style={{ fontSize: 9.5, color: "#0a2540", lineHeight: 1.45 }}>· {s}</div>
                  ))}
                </div>
                <div style={{ padding: "9px 11px", background: "#fde6eb", borderRadius: 4, borderLeft: "3px solid #df1b41" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#a30b29", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>No incluido</div>
                  {BLOQUES_PANTALLA.noIncluido.map((s, i) => (
                    <div key={i} style={{ fontSize: 9.5, color: "#0a2540", lineHeight: 1.45 }}>· {s}</div>
                  ))}
                </div>
              </div>
            ] : []),
            <div key="bank" style={{ padding: "10px 12px", background: "#f6f9fc", borderRadius: 4, fontSize: 9.5, color: "#425466", lineHeight: 1.55, marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#0a2540", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Cuentas bancarias</div>
              <div><b style={{ color: "#0a2540" }}>BCP Soles:</b> 194-1234567-0-12 · <b style={{ color: "#0a2540" }}>CCI:</b> 002-194-001234567012-31</div>
              <div><b style={{ color: "#0a2540" }}>BBVA Soles:</b> 0011-0123-0200456789 · <b style={{ color: "#0a2540" }}>CCI:</b> 011-123-000200456789-46</div>
              <div style={{ marginTop: 4 }}><b style={{ color: "#0a2540" }}>Forma de pago:</b> 50% adelanto / 50% contra entrega</div>
            </div>,
            <div key="firma" style={{ fontSize: 10, color: "#6b7c93", lineHeight: 1.55 }}>
              <div style={{ fontStyle: "italic" }}>Atentamente,</div>
              <div style={{ fontWeight: 700, color: "#0a2540" }}>Manuel Cárdenas Ríos</div>
            </div>,
          ]} />
        </div>
      </div>
    </div>
  );
};

window.Generador = Generador;
