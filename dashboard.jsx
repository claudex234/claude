/* global React, Icon, fmtMoney, fmtTime, METRICS, PROFORMAS, TEMPLATES */
const { useState: useState_p, useRef: useRef_p, useEffect: useEffect_p } = React;

// === Drag-and-drop wrapper para tarjetas ===
const DEFAULT_LAYOUT = [
  { id: "stats", row: 0 },
  { id: "chart", row: 1, col: 0 },
  { id: "clientes", row: 1, col: 1 },
  { id: "recientes", row: 2, col: 0 },
  { id: "insights", row: 2, col: 1 },
];

const useDashLayout = () => {
  const [layout, setLayout] = useState_p(() => {
    try {
      const saved = localStorage.getItem("dash-layout-v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_LAYOUT;
  });
  useEffect_p(() => {
    try { localStorage.setItem("dash-layout-v1", JSON.stringify(layout)); } catch (e) {}
  }, [layout]);
  return [layout, setLayout];
};

const DragCard = ({ id, layout, setLayout, children, style }) => {
  const ref = useRef_p(null);
  const [dragging, setDragging] = useState_p(false);
  const [over, setOver] = useState_p(false);
  return (
    <div
      ref={ref}
      className={"dash-card " + (dragging ? "dragging " : "") + (over ? "drag-over" : "")}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        const fromId = e.dataTransfer.getData("text/plain");
        if (!fromId || fromId === id) return;
        const next = layout.map(x => ({ ...x }));
        const a = next.find(x => x.id === fromId);
        const b = next.find(x => x.id === id);
        if (!a || !b) return;
        // Swap row + col
        const tmp = { row: a.row, col: a.col };
        a.row = b.row; a.col = b.col;
        b.row = tmp.row; b.col = tmp.col;
        setLayout(next);
      }}
      style={style}
    >
      {children}
    </div>
  );
};

const DragHandle = () => (
  <span className="dash-handle" title="Arrastra para reordenar" style={{ display: "inline-flex" }}>
    <Icon name="drag" size={14} />
  </span>
);

// === Dashboard de métricas ===
const Dashboard = ({ goToDetail, goToGenerador }) => {
  const m = METRICS;
  const max = Math.max(...m.aperturasDia);
  const recientes = PROFORMAS.slice(0, 5);
  const [layout, setLayout] = useDashLayout();

  // Helpers para encontrar qué card va en cada slot
  const findCard = (row, col) => layout.find(x => x.row === row && x.col === col);
  const cardAt = (row, col) => findCard(row, col)?.id;

  // Render de cada card por id
  const renderCard = (cardId) => {
    if (cardId === "chart") return chartCard;
    if (cardId === "clientes") return clientesCard;
    if (cardId === "recientes") return recientesCard;
    if (cardId === "insights") return insightsCard;
    return null;
  };

  const resetLayout = () => setLayout(DEFAULT_LAYOUT);
  const isCustom = JSON.stringify(layout) !== JSON.stringify(DEFAULT_LAYOUT);

  // === Definición de cada tarjeta ===
  const chartCard = (
    <>
      <div className="card-header">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DragHandle />Aperturas diarias · 30 días
        </div>
        <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)" }}>
          {["7d", "30d", "90d"].map((p, idx) => (
            <button key={p} className="btn btn-sm" style={{ background: idx === 1 ? "var(--surface)" : "transparent", border: "none", boxShadow: idx === 1 ? "var(--shadow-sm)" : "none", padding: "3px 8px" }}>{p}</button>
          ))}
        </div>
      </div>
      <div className="card-body">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${m.aperturasDia.length}, 1fr)`, gap: 3, alignItems: "flex-end", height: 200 }}>
          {m.aperturasDia.map((v, idx) => (
            <div key={idx} title={`Día ${idx + 1}: ${v} aperturas`}
              style={{
                height: `${(v / max) * 100}%`,
                background: idx === m.aperturasDia.length - 1 ? "var(--accent)" : "var(--accent-soft)",
                borderRadius: "3px 3px 0 0",
                minHeight: 4,
                transition: "all .2s",
                cursor: "pointer",
              }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
          <span>5 abr</span>
          <span>15 abr</span>
          <span>25 abr</span>
          <span>5 may</span>
        </div>
      </div>
    </>
  );

  const clientesCard = (
    <>
      <div className="card-header">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><DragHandle /><Icon name="flame" size={13} /> Clientes más activos</div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {m.topClientes.map((c, idx) => {
          const maxAp = Math.max(...m.topClientes.map(x => x.aperturas));
          return (
            <div key={idx} style={{ padding: "12px 16px", borderBottom: idx < m.topClientes.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
                <div style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-2)", flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontWeight: 700 }}>{c.aperturas}</span> · {fmtTime(c.tiempo)}
                </div>
              </div>
              <div className="heat-bar">
                <div className="heat-fill" style={{ width: `${(c.aperturas / maxAp) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const recientesCard = (
    <>
      <div className="card-header">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><DragHandle />Proformas recientes</div>
        <button className="btn btn-sm">Ver todas</button>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {recientes.map((p, idx) => (
          <div key={p.id}
            onClick={() => goToDetail(p.id)}
            style={{ padding: "12px 16px", borderBottom: idx < recientes.length - 1 ? "1px solid var(--border)" : "none", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center", cursor: "pointer" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{p.id} · {fmtMoney(p.monto)}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {p.aperturas > 0 && (
                <span className="badge"><Icon name="eye" size={10} /> {p.aperturas}</span>
              )}
              {p.reenvios > 0 && (
                <span className="badge badge-warn"><Icon name="forward" size={10} /> {p.reenvios}</span>
              )}
              {p.estado === "enviada" && (
                <span className="badge badge-info">enviada</span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-mute)", textAlign: "right", whiteSpace: "nowrap" }}>{p.ultimaVista}</div>
          </div>
        ))}
      </div>
    </>
  );

  const insightsCard = (
    <>
      <div className="card-header" style={{ borderBottom: "none" }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><DragHandle /><Icon name="sparkle" size={14} /> Insights de la semana</div>
      </div>
      <div className="card-body" style={{ paddingTop: 0 }}>
        {[
          { i: "forward", t: "Innova Schools reenvió la proforma 4 veces", s: "Probablemente está siendo evaluada por el comité. Buen momento para llamar." },
          { i: "rotate", t: "Universidad Continental abrió 23 veces", s: "23 aperturas en 5 días desde 3 ciudades. Considera ofrecer una demo." },
          { i: "clock", t: "8 proformas vencen esta semana", s: "Por valor total de S/ 287k. Reenvía con un recordatorio." },
        ].map((it, idx) => (
          <div key={idx} style={{ padding: "10px 0", borderTop: idx > 0 ? "1px solid var(--border)" : "none", display: "flex", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--accent-strong)" }}>
              <Icon name={it.i} size={13} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.t}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, lineHeight: 1.4 }}>{it.s}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Buenos días, Diego</h1>
          <p className="page-sub">Esto es lo que pasa con tus proformas en los últimos 30 días. <span style={{ color: "var(--text-mute)" }}>· Arrastra las tarjetas para reordenar.</span></p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isCustom && (
            <button className="btn" onClick={resetLayout} title="Restaurar orden por defecto"><Icon name="refresh" size={13} /> Reset</button>
          )}
          <button className="btn btn-primary" onClick={goToGenerador}><Icon name="plus" /> Nueva proforma</button>
        </div>
      </div>

      {/* Top stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Proformas enviadas</div>
          <div className="stat-value">{m.enviadasMes}</div>
          <div className="stat-delta up"><Icon name="arrowUp" size={11} /> +12% vs. mes pasado</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tasa de apertura</div>
          <div className="stat-value">{m.tasaApertura}<span style={{ fontSize: 18, color: "var(--text-3)" }}>%</span></div>
          <div className="stat-delta up"><Icon name="arrowUp" size={11} /> +4 pts</div>
        </div>
        <div className="stat">
          <div className="stat-label">Monto enviado</div>
          <div className="stat-value">S/ {(m.montoEnviado / 1000).toFixed(0)}k</div>
          <div className="stat-delta">{fmtMoney(m.montoVisto)} visto por clientes</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tiempo promedio leyendo</div>
          <div className="stat-value">{Math.floor(m.promedioTiempo / 60)}<span style={{ fontSize: 18, color: "var(--text-3)" }}>m {m.promedioTiempo % 60}s</span></div>
          <div className="stat-delta up">{m.promedioVistas} aperturas/proforma</div>
        </div>
      </div>

      {/* Fila 1: chart + clientes */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        <DragCard id={cardAt(1, 0)} layout={layout} setLayout={setLayout} style={{}}>
          <div className="card" style={{ height: "100%" }}>
            {renderCard(cardAt(1, 0))}
          </div>
        </DragCard>
        <DragCard id={cardAt(1, 1)} layout={layout} setLayout={setLayout} style={{}}>
          <div className="card" style={{ height: "100%", background: cardAt(1,1) === "insights" ? "linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 60%)" : undefined }}>
            {renderCard(cardAt(1, 1))}
          </div>
        </DragCard>
      </div>

      {/* Fila 2: recientes + insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginTop: 20 }}>
        <DragCard id={cardAt(2, 0)} layout={layout} setLayout={setLayout} style={{}}>
          <div className="card" style={{ height: "100%" }}>
            {renderCard(cardAt(2, 0))}
          </div>
        </DragCard>
        <DragCard id={cardAt(2, 1)} layout={layout} setLayout={setLayout} style={{}}>
          <div className="card" style={{ height: "100%", background: cardAt(2,1) === "insights" ? "linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 60%)" : undefined }}>
            {renderCard(cardAt(2, 1))}
          </div>
        </DragCard>
      </div>

    </div>
  );
};

// === Plantillas (Skins visuales para proformas) ===
const SKINS = [
  {
    id: "minimal",
    nombre: "Minimal",
    desc: "Limpio y directo. Tipografía sans-serif, mucho whitespace.",
    cover: { bg: "#ffffff", accent: "#0a2540", font: "sans" },
    activa: true,
    uso: 28,
  },
  {
    id: "corporate",
    nombre: "Corporativo",
    desc: "Header sólido, líneas marcadas. Ideal para sector educativo y gobierno.",
    cover: { bg: "#1e3a8a", accent: "#fbbf24", font: "sans" },
    uso: 12,
  },
  {
    id: "warm",
    nombre: "Cálido",
    desc: "Tonos tierra, serif para títulos. Más humano y cercano.",
    cover: { bg: "#fef7ed", accent: "#9a3412", font: "serif" },
    uso: 6,
  },
  {
    id: "bold",
    nombre: "Bold",
    desc: "Tipografía grande, alto contraste. Llama la atención.",
    cover: { bg: "#0f172a", accent: "#f97316", font: "display" },
    uso: 4,
  },
  {
    id: "editorial",
    nombre: "Editorial",
    desc: "Mucho whitespace, tipografía grande, mood premium.",
    cover: { bg: "#fafaf9", accent: "#000", font: "serif" },
    uso: 9,
  },
  {
    id: "tech",
    nombre: "Tech",
    desc: "Mono para datos, layout denso, vibe SaaS B2B.",
    cover: { bg: "#0a0a0a", accent: "#10b981", font: "mono" },
    uso: 3,
  },
];

const SkinPreview = ({ skin }) => {
  const fontFam = skin.cover.font === "serif" ? '"Fraunces", serif' :
                  skin.cover.font === "mono" ? '"JetBrains Mono", monospace' :
                  '"Inter", sans-serif';
  return (
    <div style={{
      height: 180, background: skin.cover.bg,
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
      fontFamily: fontFam, position: "relative",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ width: 36, height: 6, background: skin.cover.accent, marginBottom: 4, borderRadius: 1 }} />
          <div style={{ width: 60, height: 4, background: skin.cover.accent, opacity: .4, borderRadius: 1 }} />
        </div>
        <div style={{ fontSize: 8, color: skin.cover.accent, fontWeight: 700, letterSpacing: 1 }}>PROFORMA</div>
      </div>
      {/* Title */}
      <div style={{ fontSize: 11, fontWeight: 700, color: skin.cover.accent, marginTop: 4 }}>Cliente Demo S.A.C.</div>
      {/* Lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
        {[80, 65, 90, 55].map((w, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ width: `${w}%`, height: 3, background: skin.cover.accent, opacity: .25, borderRadius: 1 }} />
            <div style={{ width: 22, height: 3, background: skin.cover.accent, opacity: .5, borderRadius: 1 }} />
          </div>
        ))}
      </div>
      {/* Total bar */}
      <div style={{ marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${skin.cover.accent}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 30, height: 4, background: skin.cover.accent, opacity: .6, borderRadius: 1 }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: skin.cover.accent }}>S/ 12,400</div>
      </div>
    </div>
  );
};

const Plantillas = () => {
  const [tab, setTab] = useState_p("skins");
  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Plantillas</h1>
          <p className="page-sub">Skins visuales para tus proformas y plantillas de contenido reutilizables.</p>
        </div>
        <button className="btn btn-primary"><Icon name="plus" /> {tab === "skins" ? "Nuevo skin" : "Nueva plantilla"}</button>
      </div>

      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)", marginBottom: 20, width: "fit-content" }}>
        {[
          { id: "skins", l: "Skins visuales", c: SKINS.length },
          { id: "contenido", l: "Plantillas de contenido", c: TEMPLATES.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="btn btn-sm" style={{
            background: tab === t.id ? "var(--surface)" : "transparent", border: "none",
            boxShadow: tab === t.id ? "var(--shadow-sm)" : "none",
            color: tab === t.id ? "var(--text)" : "var(--text-3)",
            fontWeight: tab === t.id ? 600 : 500,
          }}>{t.l} <span style={{ marginLeft: 4, color: "var(--text-mute)" }}>{t.c}</span></button>
        ))}
      </div>

      {tab === "skins" && (
        <>
          <div style={{ padding: "12px 14px", background: "var(--info-soft)", border: "1px solid var(--info)", borderRadius: "var(--radius)", marginBottom: 16, fontSize: 12.5, display: "flex", gap: 10, alignItems: "center" }}>
            <Icon name="palette" size={14} />
            <div style={{ flex: 1 }}>El skin define cómo se ve el PDF que recibe el cliente. Puedes asignar uno por defecto y cambiarlo por proforma.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {SKINS.map(s => (
              <div key={s.id} className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer", borderColor: s.activa ? "var(--accent)" : "var(--border)", borderWidth: s.activa ? 2 : 1 }}>
                <SkinPreview skin={s} />
                <div style={{ padding: 14, position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 650 }}>{s.nombre}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                    </div>
                    {s.activa && <span className="badge badge-accent" style={{ flexShrink: 0 }}>Activo</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{s.uso} proformas con este skin</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm"><Icon name="edit" size={11} /> Editar</button>
                      {!s.activa && <button className="btn btn-sm btn-primary">Usar</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{ padding: 0, border: "2px dashed var(--border-strong)", boxShadow: "none", background: "transparent", display: "grid", placeItems: "center", minHeight: 320, cursor: "pointer", color: "var(--text-mute)" }}>
              <div style={{ textAlign: "center" }}>
                <Icon name="plus" size={28} />
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>Crear skin personalizado</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>colores, tipografía, layout</div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "contenido" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {TEMPLATES.map(t => (
            <div key={t.id} className="card" style={{ padding: 0, cursor: "pointer" }}>
              <div style={{ height: 100, background: t.default ? "linear-gradient(135deg, var(--accent), var(--accent-strong))" : "var(--bg-sunken)", borderRadius: "var(--radius) var(--radius) 0 0", display: "grid", placeItems: "center", color: t.default ? "white" : "var(--text-mute)", position: "relative" }}>
                <Icon name="template" size={32} />
                {t.default && <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,.2)", borderRadius: 999, color: "white", fontWeight: 600 }}>POR DEFECTO</span>}
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.nombre}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", justifyContent: "space-between" }}>
                  <span>{t.items} líneas</span>
                  <span>{t.uso} usos</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// === Configuración ===
const Config = () => (
  <div className="page fade-in" style={{ maxWidth: 760 }}>
    <div className="page-header">
      <div>
        <h1 className="page-title">Configuración</h1>
        <p className="page-sub">Datos de tu empresa, branding y preferencias de tracking.</p>
      </div>
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><div className="card-title">Datos de la empresa</div></div>
      <div className="card-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className="field-label">Razón social</label><input className="input" defaultValue="Duecaz Tecnología S.A.C." /></div>
          <div><label className="field-label">RUC</label><input className="input" defaultValue="20601234567" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="field-label">Dirección</label><input className="input" defaultValue="Av. Petit Thouars 5500, Miraflores, Lima" /></div>
          <div><label className="field-label">Teléfono</label><input className="input" defaultValue="+51 1 555 0123" /></div>
          <div><label className="field-label">Email comercial</label><input className="input" defaultValue="ventas@duecaz.com" /></div>
        </div>
      </div>
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><div className="card-title"><Icon name="shield" size={13} /> Tracking del PDF</div></div>
      <div className="card-body" style={{ padding: 0 }}>
        {[
          { l: "Aperturas e IP", s: "Registrar cada vez que el cliente abre el PDF", on: true },
          { l: "Tiempo por página", s: "Medir cuánto tiempo pasa en cada página del PDF", on: true },
          { l: "Descargas e impresiones", s: "Detectar cuando el cliente descarga o manda imprimir", on: true },
          { l: "Reenvíos", s: "Detectar aperturas desde IPs / dispositivos distintos al original", on: true },
          { l: "Giroscopio (móvil)", s: "Medir rotaciones — útil para detectar si está mostrando el PDF a otra persona", on: true },
          { l: "Geolocalización precisa", s: "Pedir permiso al cliente (no recomendado)", on: false },
        ].map((s, idx) => (
          <div key={idx} style={{ padding: "12px 16px", borderBottom: idx < 5 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.l}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{s.s}</div>
            </div>
            <Toggle on={s.on} />
          </div>
        ))}
      </div>
    </div>

    <div className="card">
      <div className="card-header"><div className="card-title">Notificaciones</div></div>
      <div className="card-body" style={{ padding: 0 }}>
        {[
          { l: "Email cuando un cliente abre la proforma", on: true },
          { l: "Notificación push para reenvíos detectados", on: true },
          { l: "Resumen diario por email", on: false },
        ].map((s, idx) => (
          <div key={idx} style={{ padding: "12px 16px", borderBottom: idx < 2 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13.5 }}>{s.l}</div>
            <Toggle on={s.on} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Toggle = ({ on: defaultOn }) => {
  const [on, setOn] = useState_p(defaultOn);
  return (
    <button onClick={() => setOn(!on)} style={{
      width: 36, height: 20, borderRadius: 10, border: "none",
      background: on ? "var(--accent)" : "var(--border-strong)",
      position: "relative", cursor: "pointer", transition: "background .15s", padding: 0
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%", background: "white",
        transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)"
      }} />
    </button>
  );
};

window.Dashboard = Dashboard;
window.Plantillas = Plantillas;
window.Config = Config;
