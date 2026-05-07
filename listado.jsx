/* global React, Icon, fmtMoney, fmtTime, PROFORMAS, Detalle */
const { useState: useState_l, useMemo: useMemo_l } = React;

const Listado = ({ goToDetail, goToGenerador }) => {
  const [search, setSearch] = useState_l("");
  const [filter, setFilter] = useState_l("todas");
  const [productFilter, setProductFilter] = useState_l("todos");
  const [sort, setSort] = useState_l("recientes");
  const [selectedId, setSelectedId] = useState_l(PROFORMAS[0]?.id);
  const [selected, setSelected] = useState_l([]);

  const filtered = useMemo_l(() => {
    return PROFORMAS.filter(p => {
      if (filter === "vista" && p.estado !== "vista") return false;
      if (filter === "enviada" && p.estado !== "enviada") return false;
      if (productFilter !== "todos") {
        const prods = window.PROFORMAS_PRODUCTOS[p.id] || {};
        if (!Object.keys(prods).includes(productFilter)) return false;
      }
      if (search && !(p.cliente.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [search, filter, productFilter, sort]);

  const drawerProforma = filtered.find(p => p.id === selectedId) || filtered[0] || PROFORMAS[0];

  return (
    <div className="page fade-in listado-split">
      <div className="listado-main">
      <div className="page-header">
        <div>
          <h1 className="page-title">Proformas</h1>
          <p className="page-sub">{PROFORMAS.length} proformas · {PROFORMAS.filter(p => p.estado === "vista").length} vistas por el cliente</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selected.length > 0 && (
            <>
              <span style={{ alignSelf: "center", fontSize: 12.5, color: "var(--text-3)", marginRight: 4 }}>{selected.length} seleccionada{selected.length !== 1 ? "s" : ""}</span>
              <button className="btn"><Icon name="refresh" size={13} /> Actualizar estado</button>
              <button className="btn" style={{ color: "var(--danger)" }}><Icon name="trash" size={13} /> Eliminar</button>
            </>
          )}
          <button className="btn"><Icon name="download" /> Exportar</button>
          <button className="btn btn-primary" onClick={goToGenerador}><Icon name="plus" /> Nueva proforma</button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
            <input
              className="input"
              placeholder="Buscar cliente o número de proforma…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-mute)", pointerEvents: "none", display: "flex" }}>
              <Icon name="search" size={14} />
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)" }}>
            {[
              { id: "todas", label: "Todas", count: PROFORMAS.length },
              { id: "vista", label: "Vistas", count: PROFORMAS.filter(p => p.estado === "vista").length },
              { id: "enviada", label: "Sin abrir", count: PROFORMAS.filter(p => p.estado === "enviada").length },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="btn btn-sm"
                style={{
                  background: filter === f.id ? "var(--surface)" : "transparent",
                  border: "none",
                  boxShadow: filter === f.id ? "var(--shadow-sm)" : "none",
                  color: filter === f.id ? "var(--text)" : "var(--text-3)",
                  fontWeight: filter === f.id ? 600 : 500,
                }}>
                {f.label} <span style={{ color: "var(--text-mute)", marginLeft: 4 }}>{f.count}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-sm"><Icon name="filter" size={12} /> Filtros</button>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)" }}>
            {[
              { id: "todos", label: "Todos" },
              { id: "PRO", label: "PRO" },
              { id: "PLUS", label: "PLUS" },
              { id: "ELITE", label: "ELITE" },
            ].map(f => (
              <button key={f.id} onClick={() => setProductFilter(f.id)}
                className="btn btn-sm"
                style={{
                  background: productFilter === f.id ? "var(--surface)" : "transparent",
                  border: "none",
                  boxShadow: productFilter === f.id ? "var(--shadow-sm)" : "none",
                  color: productFilter === f.id ? "var(--text)" : "var(--text-3)",
                  fontWeight: productFilter === f.id ? 600 : 500,
                }}>{f.label}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-mute)" }}>
            Ordenar: <select value={sort} onChange={e => setSort(e.target.value)} style={{ border: "none", background: "transparent", fontWeight: 600, color: "var(--text-2)", cursor: "pointer" }}>
              <option value="recientes">Más recientes</option>
              <option value="actividad">Más actividad</option>
              <option value="monto">Mayor monto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" /></th>
                <th>Cliente</th>
                <th>Producto</th>
                <th style={{ textAlign: "right" }}>Última vista</th>
                <th>Estado</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const prods = window.PROFORMAS_PRODUCTOS[p.id] || {};
                const prodCode = Object.entries(prods).map(([k, v]) => `${v}${k}`).join(" + ");
                return (
                <tr key={p.id} className="row" onClick={() => setSelectedId(p.id)} style={{ background: drawerProforma?.id === p.id ? "var(--accent-soft)" : undefined, cursor: "pointer" }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={e => {
                      if (e.target.checked) setSelected([...selected, p.id]);
                      else setSelected(selected.filter(x => x !== p.id));
                    }} />
                  </td>
                  <td>
                    <div className="cell-strong">{p.cliente}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 11.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{p.telefono}</span>
                      <button
                        className="btn-icon btn-ghost"
                        title={`Copiar ${p.telefono}`}
                        onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(p.telefono); }}
                        style={{ width: 18, height: 18, padding: 0, opacity: .55 }}
                      ><Icon name="copy" size={10} /></button>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{prodCode}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{fmtMoney(p.monto)}</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {p.estado === "vista" ? (
                      <>
                        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>{p.ultimaVista}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                          <span>{fmtTime(p.tiempoTotal)}</span>
                          <span style={{ color: "var(--text-mute)" }}>·</span>
                          <Icon name="eye" size={11} /> {p.aperturas}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 12.5, color: "var(--text-mute)" }}>Sin abrir</span>
                    )}
                  </td>
                  <td>
                    {p.estado === "vista" ? (
                      <span className="badge badge-info" style={{ fontSize: 10.5 }}><span className="badge-dot" />Vista</span>
                    ) : (
                      <span className="badge" style={{ fontSize: 10.5 }}>Enviada</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                      <button className="btn btn-sm" title="Ver PDF" onClick={e => e.stopPropagation()} style={{ fontSize: 11, padding: "4px 9px", fontWeight: 600 }}>
                        <Icon name="eye" size={11} /> PDF
                      </button>
                      <button className="btn-icon btn-ghost" title="Eliminar" style={{ color: "var(--danger)", opacity: .7 }} onClick={e => e.stopPropagation()}><Icon name="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
        <span>Mostrando {filtered.length} de {PROFORMAS.length}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-sm" disabled style={{ opacity: .5 }}>← Anterior</button>
          <button className="btn btn-sm">Siguiente →</button>
        </div>
      </div>

      {/* Panel lateral de seguimiento - split view permanente */}
      </div>{/* /listado-main */}
      {drawerProforma && (
        <ProformaDrawer
          proforma={drawerProforma}
          onOpenFull={() => goToDetail(drawerProforma.id)}
        />
      )}
    </div>
  );
};

// === Drawer lateral con seguimiento rápido ===
const ProformaDrawer = ({ proforma, onOpenFull }) => {
  const p = proforma;
  // Reusar PROFORMA_DETAIL para tracking detallado (mock)
  const detail = window.PROFORMA_DETAIL;
  const aperturas = detail.timeline.filter(t => t.ip);
  const cityAgg = useMemo_l(() => {
    const map = {};
    detail.timeline.filter(t => t.ip).forEach(t => { map[t.ciudad] = (map[t.ciudad] || 0) + 1; });
    return Object.entries(map).map(([ciudad, count]) => ({ ciudad, count })).sort((a,b) => b.count - a.count);
  }, [p.id]);

  return (
    <aside className="listado-aside" style={{
      borderLeft: "1px solid var(--border)",
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
        {/* Header del drawer */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{p.id}</div>
            <div style={{ fontSize: 14, fontWeight: 650, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.cliente}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn-icon btn-ghost" title="Reenviar"><Icon name="forward" size={13} /></button>
            <button className="btn-icon btn-ghost" title="PDF"><Icon name="download" size={13} /></button>
            <button className="btn-icon btn-ghost" title="WhatsApp" style={{ color: "#25D366" }}><Icon name="whatsapp" size={13} /></button>
            <button className="btn btn-sm btn-primary" onClick={onOpenFull} style={{ marginLeft: 4 }}>Ver →</button>
          </div>
        </div>

        {/* Status compacto + link de la proforma */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            {p.estado === "vista" ? (
              <span className="badge badge-info"><span className="badge-dot" /> Vista por cliente</span>
            ) : <span className="badge">Sin abrir</span>}
            <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>· {p.ultimaVista}</span>
          </div>
          {/* Link en vivo de la proforma */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}>
            <Icon name="link" size={12} />
            <code style={{ flex: 1, fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              proforma.app/p/{p.id.toLowerCase().replace(/-/g, "")}-{p.cliente.split(" ")[0].toLowerCase()}
            </code>
            <button className="btn btn-sm" title="Copiar"><Icon name="copy" size={11} /></button>
            <button className="btn btn-sm" title="Abrir">↗</button>
          </div>
        </div>

        {/* Inline metrics: aperturas · tiempo total · última apertura */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 12 }}>
          {[
            { l: "Aperturas", v: p.aperturas },
            { l: "Tiempo total", v: fmtTime(p.tiempoTotal) },
            { l: "Última apertura", v: p.ultimaVista, mono: false },
          ].map((s, i, arr) => (
            <div key={s.l} style={{
              flex: 1,
              borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              paddingRight: i < arr.length - 1 ? 12 : 0,
            }}>
              <div style={{ fontSize: 9.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .5, fontWeight: 600 }}>{s.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3, fontFamily: s.mono === false ? "var(--font-sans)" : "var(--font-mono)" }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Body scrolleable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
          {/* Datos del equipo + geolocalización */}
          {(() => {
            const cs = detail.currentSession;
            return (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 650, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="device" size={11} /> Sesión actual · dispositivo
                  </div>
                  <span style={{ fontSize: 10.5, color: "var(--text-mute)" }}>{cs.sessionStart.slice(5,16)}</span>
                </div>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* Specs en grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 0 }}>
                    {[
                      ["Modelo", cs.deviceModel],
                      ["Sistema", cs.os],
                      ["Navegador", cs.browser],
                      ["Pantalla", cs.screen],
                      ["Red", cs.network],
                      ["IP pública", cs.ip],
                    ].map(([k, v], i, arr) => (
                      <React.Fragment key={k}>
                        <div style={{
                          padding: "7px 12px",
                          fontSize: 10.5,
                          color: "var(--text-mute)",
                          textTransform: "uppercase",
                          letterSpacing: .4,
                          fontWeight: 600,
                          borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                          background: "var(--bg-soft)",
                          minWidth: 86,
                        }}>{k}</div>
                        <div style={{
                          padding: "7px 12px",
                          fontSize: 12,
                          fontFamily: k === "IP pública" || k === "Pantalla" ? "var(--font-mono)" : "var(--font-sans)",
                          fontWeight: 550,
                          borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                          color: "var(--text)",
                        }}>{v}</div>
                      </React.Fragment>
                    ))}
                  </div>
                  {/* Mini mapa de geolocalización */}
                  <div style={{ borderTop: "1px solid var(--border)", padding: 10, display: "flex", gap: 10, alignItems: "stretch" }}>
                    <div style={{
                      width: 84, height: 64,
                      borderRadius: "var(--radius-sm)",
                      background: "linear-gradient(135deg, #e6efe5, #d9e6dc 40%, #c7d4cf)",
                      position: "relative",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}>
                      {/* trazos tipo mapa */}
                      <svg viewBox="0 0 84 64" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                        <path d="M0 22 Q 20 18 32 26 T 60 28 T 84 22" stroke="rgba(255,255,255,.7)" strokeWidth="1" fill="none" />
                        <path d="M0 38 Q 18 42 30 36 T 58 40 T 84 36" stroke="rgba(255,255,255,.5)" strokeWidth="1" fill="none" />
                        <path d="M14 0 L 22 28 L 18 64" stroke="rgba(120,140,130,.5)" strokeWidth=".8" fill="none" />
                        <path d="M52 0 L 48 22 L 60 50 L 56 64" stroke="rgba(120,140,130,.5)" strokeWidth=".8" fill="none" />
                        <circle cx="42" cy="32" r="14" fill="rgba(217,119,87,.18)" stroke="rgba(217,119,87,.4)" strokeWidth=".5" />
                        <circle cx="42" cy="32" r="4" fill="var(--accent)" stroke="#fff" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 650, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="pin" size={11} /> {cs.geo.region}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        {cs.geo.lat.toFixed(3)}, {cs.geo.lon.toFixed(3)}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-mute)", marginTop: 2 }}>
                        Precisión {cs.geo.accuracy} · vía IP
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Heatmap real de toques sobre la página estrella */}
          <div style={{ marginTop: 0, marginBottom: 18 }}>
            {(() => {
              const hotPage = detail.pageHeatmap.find(p => p.page === detail.hotspotsPage) || detail.pageHeatmap[3];
              const totalTaps = detail.pageHeatmap.reduce((a, b) => a + (b.taps || 0), 0);
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 650, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="pin" size={11} /> Mapa de toques · p.{hotPage.page}
                    </div>
                    <span style={{ fontSize: 10.5, color: "var(--text-mute)" }}>{totalTaps} toques · {hotPage.taps} aquí</span>
                  </div>
                  <div className="card" style={{ padding: 10 }}>
                    {/* Thumbnail con heatmap encima */}
                    <div style={{
                      position: "relative",
                      aspectRatio: "210 / 297",
                      width: "62%",
                      margin: "0 auto",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,.18)",
                    }}>
                      {/* simulación del contenido del PDF */}
                      <div style={{ position: "absolute", inset: 0, padding: "8% 9%", display: "flex", flexDirection: "column", gap: "3%" }}>
                        <div style={{ height: "5%", width: "55%", background: "var(--border-strong)", borderRadius: 2 }} />
                        <div style={{ height: "2.5%", width: "85%", background: "var(--border)", borderRadius: 1 }} />
                        <div style={{ height: "2.5%", width: "78%", background: "var(--border)", borderRadius: 1 }} />
                        <div style={{ height: "2.5%", width: "82%", background: "var(--border)", borderRadius: 1 }} />
                        <div style={{ height: "12%", width: "100%", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 2, marginTop: "2%" }} />
                        <div style={{ height: "2.5%", width: "70%", background: "var(--border)", borderRadius: 1, marginTop: "3%" }} />
                        <div style={{ height: "2.5%", width: "88%", background: "var(--border)", borderRadius: 1 }} />
                        <div style={{ height: "20%", width: "100%", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 2, marginTop: "2%" }} />
                        <div style={{ marginTop: "auto", height: "8%", width: "40%", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 2, alignSelf: "flex-end" }} />
                      </div>
                      {/* SVG heatmap layer */}
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                        <defs>
                          <radialGradient id="heat-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(239,68,68,.85)" />
                            <stop offset="40%" stopColor="rgba(245,158,11,.55)" />
                            <stop offset="75%" stopColor="rgba(245,158,11,.18)" />
                            <stop offset="100%" stopColor="rgba(245,158,11,0)" />
                          </radialGradient>
                        </defs>
                        {detail.hotspots.map((h, i) => (
                          <circle
                            key={i}
                            cx={h.x}
                            cy={h.y}
                            r={4 + h.w * 6}
                            fill="url(#heat-glow)"
                            style={{ mixBlendMode: "screen" }}
                          />
                        ))}
                        {/* Núcleos brillantes encima */}
                        {detail.hotspots.filter(h => h.w > 0.7).map((h, i) => (
                          <circle key={"k" + i} cx={h.x} cy={h.y} r={1.2} fill="#fef2f2" opacity={h.w} />
                        ))}
                      </svg>
                    </div>
                    {/* Insights */}
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-3)" }}>{hotPage.label}</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{fmtTime(hotPage.time)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        <span className="badge badge-warn" style={{ fontSize: 9.5 }}>🔥 Precio</span>
                        <span className="badge" style={{ fontSize: 9.5 }}>Specs</span>
                        <span className="badge" style={{ fontSize: 9.5 }}>Garantía</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Timeline */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 650, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="live-dot" /> Actividad reciente
              </div>
              <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{aperturas.length} aperturas</span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {[...detail.timeline].reverse().slice(0, 6).map((ev, idx, arr) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 12, padding: "10px 14px", borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: ev.evento.includes("Enviada") ? "var(--info-soft)" : ev.reenvio ? "var(--warn-soft)" : "var(--accent-soft)",
                    color: ev.evento.includes("Enviada") ? "var(--info)" : ev.reenvio ? "var(--warn)" : "var(--accent)",
                    display: "grid", placeItems: "center",
                  }}>
                    <Icon name={ev.evento.includes("Enviada") ? "send" : ev.reenvio ? "forward" : "eye"} size={11} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {ev.evento}
                      {ev.descarga && <span className="badge" style={{ fontSize: 9.5 }}><Icon name="download" size={9} /></span>}
                    </div>
                    {ev.ip && (
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>{ev.ciudad}</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{ev.ip}</span>
                        {ev.tiempo && <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{fmtTime(ev.tiempo)}</span>}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{ev.fecha.slice(5, 16)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Movimientos del dispositivo (giroscopio + acelerómetro) */}
          <div style={{ marginTop: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 650, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="rotate" size={11} /> Movimientos del dispositivo
              </div>
              <span style={{ fontSize: 10.5, color: "var(--text-mute)" }}>{detail.motionTimeline.length} segmentos · {detail.stats.gyroEvents} eventos</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Tira temporal con barras de tilt */}
              {(() => {
                const total = detail.motionTimeline.reduce((a, b) => a + b.dur, 0);
                const colorFor = (k) => ({
                  still: "var(--border-strong)",
                  portrait: "var(--accent)",
                  landscape: "var(--info)",
                  rotate: "var(--warn)",
                  shake: "#dc2626",
                }[k] || "var(--text-mute)");
                return (
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", height: 20, gap: 1, borderRadius: 3, overflow: "hidden", background: "var(--bg-soft)" }}>
                      {detail.motionTimeline.map((seg, i) => (
                        <div
                          key={i}
                          title={`${seg.label} · ${seg.dur}s`}
                          style={{
                            flex: seg.dur,
                            background: colorFor(seg.kind),
                            opacity: seg.kind === "still" ? 0.45 : 0.85,
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 9.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
                      <span>0:00</span>
                      <span>{Math.floor(total/60)}:{String(total%60).padStart(2,"0")}</span>
                    </div>
                    {/* leyenda */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
                      {[
                        ["portrait", "vertical"],
                        ["landscape", "horizontal"],
                        ["rotate", "rotación"],
                        ["still", "quieto"],
                        ["shake", "agitado"],
                      ].map(([k, l]) => (
                        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(k) }} />{l}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Lista narrativa de eventos */}
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {detail.motionTimeline.map((seg, i) => {
                  const colorFor = (k) => ({
                    still: "var(--border-strong)",
                    portrait: "var(--accent)",
                    landscape: "var(--info)",
                    rotate: "var(--warn)",
                    shake: "#dc2626",
                  }[k] || "var(--text-mute)");
                  const mins = Math.floor(seg.t / 60);
                  const secs = String(seg.t % 60).padStart(2, "0");
                  return (
                    <div key={i} style={{
                      display: "grid",
                      gridTemplateColumns: "44px 14px 1fr auto",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 12px",
                      borderBottom: i < detail.motionTimeline.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-mute)" }}>{mins}:{secs}</span>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(seg.kind) }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 550, color: "var(--text)" }}>{seg.label}</div>
                        {(seg.swap || seg.newGrip || seg.multi) && (
                          <div style={{ fontSize: 10, color: "var(--warn)", marginTop: 1, display: "flex", gap: 6, alignItems: "center" }}>
                            {seg.swap && <span>⚠ posible cambio de portador</span>}
                            {seg.newGrip && <span>nuevo patrón de agarre</span>}
                            {seg.multi && <span>×{seg.multi}</span>}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{seg.dur}s</span>
                    </div>
                  );
                })}
              </div>
              {/* Insights */}
              <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
                {detail.motionInsights.map((ins, i) => (
                  <div key={i} style={{
                    fontSize: 10.5,
                    color: ins.kind === "warn" ? "var(--warn)" : "var(--text-2)",
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                    padding: "3px 0",
                  }}>
                    <span style={{ flexShrink: 0 }}>{ins.kind === "warn" ? "⚠" : "›"}</span>
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer del drawer */}
          <div style={{ marginTop: 16, padding: 14, background: "var(--bg-soft)", borderRadius: "var(--radius)", textAlign: "center" }}>
            <button className="btn btn-primary" onClick={onOpenFull}>
              Ver tracking completo del PDF →
            </button>
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 8 }}>Todas las aperturas, mapa, sesiones y más</div>
          </div>
        </div>
    </aside>
  );
};

window.Listado = Listado;
