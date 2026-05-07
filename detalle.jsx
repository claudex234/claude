/* global React, Icon, fmtMoney, fmtTime, PROFORMA_DETAIL */
const { useState: useState_d, useMemo: useMemo_d, useRef: useRef_d, useEffect: useEffect_d } = React;

// === Mini-mapa "world" SVG simplificado para visualizar reenvíos ===
const PeruMap = ({ pins }) => {
  // Coordenadas aproximadas para ciudades clave
  const cities = {
    "Lima, PE": { x: 80, y: 130 },
    "Arequipa, PE": { x: 145, y: 200 },
    "Trujillo, PE": { x: 90, y: 75 },
    "Cusco, PE": { x: 160, y: 165 },
  };
  return (
    <svg viewBox="0 0 240 260" style={{ width: "100%", height: "auto" }}>
      {/* Silueta esquemática Perú */}
      <path d="M50,30 L70,22 L95,28 L110,45 L120,60 L135,55 L155,70 L175,90 L185,115 L195,145 L190,175 L180,200 L165,225 L140,240 L120,245 L100,240 L80,225 L65,200 L55,170 L45,140 L40,110 L42,80 L46,55 Z"
        fill="var(--bg-sunken)" stroke="var(--border-strong)" strokeWidth=".5" />
      {Object.entries(cities).map(([name, p]) => {
        const found = pins.find(pin => pin.ciudad === name);
        const count = found ? found.count : 0;
        const main = name === "Lima, PE";
        return (
          <g key={name}>
            {count > 0 && (
              <>
                <circle cx={p.x} cy={p.y} r={6 + Math.min(count, 12)} fill={main ? "var(--accent)" : "var(--warn)"} opacity=".18" />
                <circle cx={p.x} cy={p.y} r="4" fill={main ? "var(--accent)" : "var(--warn)"} stroke="white" strokeWidth="1.5" />
                <text x={p.x + 8} y={p.y + 3} fontSize="9" fontWeight="600" fill="var(--text)" fontFamily="var(--font-sans)">
                  {name.split(",")[0]} <tspan fill="var(--text-mute)">· {count}</tspan>
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// === Sparkline para tiempo en cada apertura ===
const Spark = ({ data, color = "var(--accent)", height = 36 }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const w = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
      <polyline points={`${points} ${w},${height} 0,${height}`} fill={color} opacity=".1" stroke="none" />
    </svg>
  );
};

// === Detalle ===
const Detalle = ({ goBack }) => {
  const p = PROFORMA_DETAIL;
  const [tab, setTab] = useState_d("tracking");
  const [liveTick, setLiveTick] = useState_d(0);

  // Animación "live" - simula nueva apertura cada cierto tiempo
  useEffect_d(() => {
    const t = setInterval(() => setLiveTick(x => x + 1), 4000);
    return () => clearInterval(t);
  }, []);

  // Detección de IP fija recurrente
  const ipCounts = useMemo_d(() => {
    const map = {};
    p.timeline.filter(t => t.ip).forEach(t => { map[t.ip] = (map[t.ip] || 0) + 1; });
    return Object.entries(map).map(([ip, c]) => ({ ip, count: c })).sort((a,b) => b.count - a.count);
  }, []);
  const ipFija = ipCounts[0];

  // Aggregations para el mapa
  const cityAgg = useMemo_d(() => {
    const map = {};
    p.timeline.filter(t => t.ip).forEach(t => { map[t.ciudad] = (map[t.ciudad] || 0) + 1; });
    return Object.entries(map).map(([ciudad, count]) => ({ ciudad, count }));
  }, []);

  const aperturas = p.timeline.filter(t => t.ip);
  const sparkData = aperturas.map(a => a.tiempo);

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={goBack} style={{ marginBottom: 10, marginLeft: -6 }}>
            <Icon name="chevron" size={12} style={{ transform: "rotate(180deg)" }} /> Proformas
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <span className="cell-mono" style={{ fontSize: 13, color: "var(--text-mute)" }}>{p.id}</span>
            <span className="badge badge-info"><span className="badge-dot" /> Vista por cliente</span>
            <span className="badge badge-accent"><Icon name="link" size={10} /> Cliente recurrente · {p.cotizacionesPrevias} cotizaciones previas</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>· última hace 18 minutos</span>
          </div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{p.cliente}</h1>
          <p className="page-sub">{p.asunto} · {fmtMoney(p.monto, p.moneda)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="btn"><Icon name="copy" /> Duplicar</button>
          <button className="btn"><Icon name="download" /> PDF</button>
          <button className="btn"><Icon name="link" /> Copiar link</button>
          <button className="btn btn-primary"><Icon name="file" /> Editar</button>
        </div>
      </div>

      {/* Edit-live banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--info-soft)", border: "1px solid var(--info)", borderRadius: "var(--radius)", marginBottom: 20, fontSize: 12.5, color: "var(--text)" }}>
          <Icon name="link" size={14} />
          <div style={{ flex: 1 }}>
            <b>Esta proforma vive en un link.</b> El cliente siempre ve la versión actualizada — puedes editar precios, agregar líneas o cambiar términos y se reflejará al instante. <span style={{ color: "var(--text-3)" }}>(no enviamos archivos PDF)</span>
          </div>
          <button className="btn btn-sm">Ver historial de cambios</button>
      </div>

      {/* Top stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Aperturas</div>
          <div className="stat-value">{p.stats.aperturas}</div>
          <div className="stat-delta up"><Icon name="arrowUp" size={11} /> +3 hoy</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tiempo total</div>
          <div className="stat-value">{Math.floor(p.stats.tiempoTotal / 60)}<span style={{ fontSize: 18, color: "var(--text-3)" }}>m</span></div>
          <div className="stat-delta up">{fmtTime(Math.round(p.stats.tiempoTotal / p.stats.aperturas))} promedio</div>
        </div>
        <div className="stat">
          <div className="stat-label">Reenvíos</div>
          <div className="stat-value" style={{ color: "var(--warn)" }}>{p.stats.reenvios}</div>
          <div className="stat-delta" style={{ color: "var(--warn)" }}><Icon name="forward" size={11} /> 3 ciudades</div>
        </div>
        <div className="stat">
          <div className="stat-label">Descargas</div>
          <div className="stat-value">{p.stats.descargas}</div>
          <div className="stat-delta">{p.stats.impresiones} impresiones</div>
        </div>
        <div className="stat" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }}>
          <div className="stat-label" style={{ color: "var(--accent-strong)" }}>
            <Icon name="rotate" size={11} /> Giroscopio
          </div>
          <div className="stat-value" style={{ color: "var(--accent-strong)" }}>{p.stats.gyroEvents}</div>
          <div className="stat-delta" style={{ color: "var(--accent-strong)" }}>3 dispositivos</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === "tracking" ? "active" : ""}`} onClick={() => setTab("tracking")}>
          <Icon name="eye" size={13} /> Tracking <span style={{ marginLeft: 6, fontSize: 11, padding: "1px 7px", background: "var(--accent-soft)", color: "var(--accent-strong)", borderRadius: 999 }}>{p.stats.aperturas}</span>
        </button>
        <button className={`tab ${tab === "documento" ? "active" : ""}`} onClick={() => setTab("documento")}>
          <Icon name="file" size={13} /> Documento
        </button>
        <button className={`tab ${tab === "cliente" ? "active" : ""}`} onClick={() => setTab("cliente")}>
          <Icon name="user" size={13} /> Cliente
        </button>
        <button className={`tab ${tab === "actividad" ? "active" : ""}`} onClick={() => setTab("actividad")}>
          <Icon name="clock" size={13} /> Actividad
        </button>
      </div>

      {tab === "tracking" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
          {/* MAIN col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Live activity */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span className="live-dot" /> Actividad en tiempo real
                </div>
                <span style={{ fontSize: 12, color: "var(--text-mute)" }}>actualizado {liveTick > 0 && "ahora"}</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {/* Latest event */}
                <div style={{ padding: 18, background: "linear-gradient(180deg, var(--accent-soft) 0%, transparent 100%)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="eye" size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Roberto Salazar acaba de abrir el PDF</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                        <Icon name="pin" size={11} /> Lima, PE · 190.232.45.12 · MacBook · Chrome · página 4 de 9
                      </div>
                    </div>
                    <span className="badge badge-success">Hace 18 min</span>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ padding: "8px 18px 18px", maxHeight: 380, overflowY: "auto" }}>
                  {[...p.timeline].reverse().map((ev, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 12, padding: "10px 0", borderBottom: idx === p.timeline.length - 1 ? "none" : "1px solid var(--border)" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%",
                          background: ev.evento.includes("Enviada") ? "var(--info-soft)" : ev.reenvio ? "var(--warn-soft)" : "var(--accent-soft)",
                          color: ev.evento.includes("Enviada") ? "var(--info)" : ev.reenvio ? "var(--warn)" : "var(--accent)",
                          display: "grid", placeItems: "center", border: "2px solid var(--surface)" }}>
                          <Icon name={ev.evento.includes("Enviada") ? "send" : ev.reenvio ? "forward" : "eye"} size={11} />
                        </div>
                        {idx < p.timeline.length - 1 && <div style={{ position: "absolute", left: 12, top: 26, bottom: -10, width: 2, background: "var(--border)" }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {ev.evento}
                          {ev.gyro && ev.os === "android" && <span className="badge badge-accent" style={{ fontSize: 10 }}><Icon name="rotate" size={9} /> giró {ev.gyroEvents}x</span>}
                        {ev.os === "ios" && <span className="badge" style={{ fontSize: 10, color: "var(--text-mute)" }}>iOS · sin giro</span>}
                          {ev.descarga && <span className="badge" style={{ fontSize: 10 }}><Icon name="download" size={9} /> descargó</span>}
                          {ev.impresion && <span className="badge" style={{ fontSize: 10 }}><Icon name="print" size={9} /> imprimió</span>}
                        </div>
                        {ev.ip && (
                          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span><Icon name="pin" size={10} /> {ev.ciudad}</span>
                            <span style={{ fontFamily: "var(--font-mono)" }}>{ev.ip}</span>
                            <span><Icon name={ev.dispositivo.includes("iPhone") || ev.dispositivo.includes("Samsung") ? "smartphone" : "device"} size={10} /> {ev.dispositivo}</span>
                            {ev.tiempo && <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{fmtTime(ev.tiempo)}</span>}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{ev.fecha.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Page heatmap */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Tiempo por página</div>
                <span style={{ fontSize: 12, color: "var(--text-mute)" }}>agregado de {p.stats.aperturas} aperturas</span>
              </div>
              <div className="card-body">
                {p.pageHeatmap.map((pg, idx) => {
                  const maxTime = Math.max(...p.pageHeatmap.map(x => x.time));
                  const pct = (pg.time / maxTime) * 100;
                  const isHot = pct > 60;
                  return (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "32px 180px 1fr 60px 50px", gap: 14, alignItems: "center", padding: "8px 0" }}>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-mute)", textAlign: "center", fontWeight: 600 }}>P{pg.page}</div>
                      <div style={{ fontSize: 13, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                        {pg.label}
                        {isHot && <Icon name="flame" size={11} />}
                      </div>
                      <div className="heat-bar" style={{ position: "relative" }}>
                        <div className="heat-fill" style={{ width: `${pct}%`, background: isHot ? "linear-gradient(90deg, var(--warn), var(--danger))" : undefined }} />
                      </div>
                      <div style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", textAlign: "right", fontWeight: 600 }}>{fmtTime(pg.time)}</div>
                      <div style={{ fontSize: 11, color: "var(--text-mute)", textAlign: "right" }}>{pg.views} vistas</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tiempo de lectura por apertura */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Tiempo por apertura</div>
                <span style={{ fontSize: 12, color: "var(--text-mute)" }}>{aperturas.length} sesiones</span>
              </div>
              <div className="card-body" style={{ paddingBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${aperturas.length}, 1fr)`, gap: 4, alignItems: "flex-end", height: 120 }}>
                  {aperturas.map((a, idx) => {
                    const max = Math.max(...sparkData);
                    const h = (a.tiempo / max) * 100;
                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-mute)" }}>{Math.round(a.tiempo / 60)}m</div>
                        <div title={`${a.tiempo}s`} style={{
                          width: "100%",
                          height: `${h}%`,
                          background: a.reenvio ? "var(--warn)" : "var(--accent)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height .3s"
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${aperturas.length}, 1fr)`, gap: 4, marginTop: 6 }}>
                  {aperturas.map((a, idx) => (
                    <div key={idx} style={{ fontSize: 9, color: "var(--text-mute)", textAlign: "center", fontFamily: "var(--font-mono)" }}>#{idx + 1}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 11, color: "var(--text-3)", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, background: "var(--accent)", borderRadius: 2 }} /> Apertura directa</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, background: "var(--warn)", borderRadius: 2 }} /> Reenvío detectado</span>
                </div>
              </div>
            </div>
          </div>

          {/* SIDE col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Map */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Ubicación de aperturas</div>
                <span className="badge">{cityAgg.length} ciudades</span>
              </div>
              <div className="card-body" style={{ padding: 14 }}>
                <PeruMap pins={cityAgg} />
                <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  {cityAgg.sort((a, b) => b.count - a.count).map(c => (
                    <div key={c.ciudad} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12.5 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.ciudad.includes("Lima") ? "var(--accent)" : "var(--warn)" }} />
                        {c.ciudad}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{c.count} aperturas</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reenvíos detectados */}
            <div className="card" style={{ borderColor: "var(--warn)" }}>
              <div className="card-header" style={{ background: "var(--warn-soft)" }}>
                <div className="card-title" style={{ color: "var(--warn)" }}>
                  <Icon name="forward" size={14} /> Reenvíos detectados
                </div>
                <span className="badge badge-warn">{p.stats.reenvios}</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {p.timeline.filter(t => t.reenvio).map((ev, idx) => (
                  <div key={idx} style={{ padding: "10px 14px", borderBottom: idx === 3 ? "none" : "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{ev.ciudad}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{ev.ip}</span>
                      <span>{ev.fecha.slice(5, 16)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{ev.dispositivo} · {fmtTime(ev.tiempo)}</div>
                  </div>
                ))}
                <div style={{ padding: 12, background: "var(--bg-soft)", fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                  <Icon name="shield" size={11} /> Detectado por cambio de IP, dispositivo o navegador en el mismo link.
                </div>
              </div>
            </div>

            {/* Giroscopio */}
            <div className="card" style={{ borderColor: "var(--accent)", borderWidth: 1 }}>
              <div className="card-header" style={{ background: "var(--accent-soft)" }}>
                <div className="card-title" style={{ color: "var(--accent-strong)" }}>
                  <Icon name="rotate" size={14} /> Movimiento del dispositivo
                </div>
                <span className="badge badge-accent">{p.stats.gyroEvents} eventos</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 12, color: "var(--text-2)", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Solo medimos esto cuando el cliente abre el PDF en <b>Android</b> (acceso libre al sensor). En iOS no medimos para evitar pedirle permisos.
                  Una rotación brusca suele indicar que <b>está mostrándole el PDF a otra persona</b>.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: 10, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .4, fontWeight: 600 }}>Inclinaciones</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)" }}>34</div>
                  </div>
                  <div style={{ padding: 10, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .4, fontWeight: 600 }}>Rotaciones 90°+</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-strong)" }}>13</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: 10, background: "var(--accent-soft)", borderRadius: "var(--radius-sm)", fontSize: 11.5, color: "var(--accent-strong)" }}>
                  <b>Insight:</b> en la apertura del 28/04 desde Arequipa hubo 14 rotaciones — probable demostración a alguien.
                </div>
              </div>
            </div>

            {/* IP fija detectada */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Icon name="shield" size={13} /> IP fija del cliente</div>
              </div>
              <div className="card-body" style={{ paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .4, fontWeight: 600 }}>IP recurrente verificada</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--accent-strong)", marginTop: 4 }}>{ipFija?.ip}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{ipFija?.count} aperturas desde esta IP · oficina del cliente</div>
                <div style={{ marginTop: 12, padding: 10, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)", fontSize: 11.5, lineHeight: 1.5, color: "var(--text-2)" }}>
                  Esta IP también aparece en sus 3 cotizaciones previas. Es el contacto principal abriendo desde la oficina.
                </div>
              </div>
            </div>

            {/* Otras cotizaciones del cliente */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Icon name="layers" size={13} /> Otras cotizaciones</div>
                <span className="badge">{window.PROFORMA_DETAIL_LINKED.length - 1}</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {window.PROFORMA_DETAIL_LINKED.filter(c => !c.current).map((c, idx, arr) => (
                  <div key={c.id} style={{ padding: "10px 14px", borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{c.asunto}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                      <span>{c.id} · {c.fecha}</span>
                      <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{fmtMoney(c.monto)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <span className={`badge ${c.estado === "aceptada" ? "badge-success" : "badge-danger"}`} style={{ fontSize: 10 }}>{c.estado}</span>
                      <span className="badge" style={{ fontSize: 10 }}><Icon name="eye" size={9} /> {c.aperturas}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Datos del cliente</div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {[
                  { i: "user", l: "Contacto", v: `${p.contacto} · ${p.cargo}` },
                  { i: "mail", l: "Email", v: p.email },
                  { i: "phone", l: "Teléfono", v: p.telefono },
                  { i: "file", l: "RUC", v: p.ruc, mono: true },
                ].map(r => (
                  <div key={r.l} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10 }}>
                    <Icon name={r.i} size={14} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .4, fontWeight: 600 }}>{r.l}</div>
                      <div style={{ fontSize: 12.5, fontFamily: r.mono ? "var(--font-mono)" : undefined, marginTop: 1, overflowWrap: "anywhere" }}>{r.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "documento" && <DocumentoTab p={p} />}
      {tab === "cliente" && <ClienteTab p={p} />}
      {tab === "actividad" && <ActividadTab p={p} />}
    </div>
  );
};

const DocumentoTab = ({ p }) => (
  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    <div className="card-header">
      <div className="card-title">{p.id} · vista previa</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-sm"><Icon name="download" size={12} /> Descargar</button>
        <button className="btn btn-sm"><Icon name="copy" size={12} /> Copiar link</button>
      </div>
    </div>
    <div style={{ padding: "32px", background: "var(--bg-soft)", display: "flex", justifyContent: "center" }}>
      <div className="pdf-frame" style={{ width: 600, padding: "48px 52px", minHeight: 800 }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0a2540", paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#0a2540" }}>Duecaz Tecnología</div>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0a2540" }}>{p.id}</div>
        </div>
        <div style={{ background: "#f6f9fc", padding: 14, borderRadius: 6, marginBottom: 20 }}>
          <div style={{ fontWeight: 700 }}>{p.cliente}</div>
          <div style={{ fontSize: 11, color: "#6b7c93", marginTop: 4 }}>RUC {p.ruc} · {p.contacto} · {p.email}</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #cbd2d9", color: "#6b7c93" }}>
              <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: .5 }}>Cant</th>
              <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: .5 }}>Descripción</th>
              <th style={{ textAlign: "right", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: .5 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f0f4f8" }}>
                <td style={{ padding: "10px 4px", verticalAlign: "top" }}>{it.qty}</td>
                <td style={{ padding: "10px 4px", color: "#0a2540" }}>{it.desc}</td>
                <td style={{ padding: "10px 4px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmtMoney(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <div style={{ width: 220, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#425466" }}>
              <span>Subtotal</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmtMoney(p.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#425466" }}>
              <span>IGV (18%)</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmtMoney(p.igv)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #0a2540", fontWeight: 700, fontSize: 14, color: "#0a2540" }}>
              <span>Total</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmtMoney(p.monto)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ClienteTab = ({ p }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
    <div className="card">
      <div className="card-header"><div className="card-title">Información</div></div>
      <div className="card-body">
        <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px 16px", margin: 0, fontSize: 13 }}>
          <dt style={{ color: "var(--text-mute)" }}>Razón social</dt><dd style={{ margin: 0, fontWeight: 600 }}>{p.cliente}</dd>
          <dt style={{ color: "var(--text-mute)" }}>RUC</dt><dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>{p.ruc}</dd>
          <dt style={{ color: "var(--text-mute)" }}>Contacto</dt><dd style={{ margin: 0 }}>{p.contacto} · {p.cargo}</dd>
          <dt style={{ color: "var(--text-mute)" }}>Email</dt><dd style={{ margin: 0 }}>{p.email}</dd>
          <dt style={{ color: "var(--text-mute)" }}>Teléfono</dt><dd style={{ margin: 0 }}>{p.telefono}</dd>
        </dl>
      </div>
    </div>
    <div className="card">
      <div className="card-header"><div className="card-title">Historial con este cliente</div></div>
      <div className="card-body" style={{ padding: 0 }}>
        {[
          { id: "PRF-2025-0098", asunto: "Pantalla aula directorio", monto: 4250, fecha: "Nov 2025", estado: "aceptada" },
          { id: "PRF-2025-0067", asunto: "Soporte técnico anual", monto: 8400, fecha: "Ago 2025", estado: "aceptada" },
          { id: "PRF-2025-0042", asunto: "2 pantallas sala juntas", monto: 9600, fecha: "May 2025", estado: "rechazada" },
        ].map((h, idx) => (
          <div key={idx} style={{ padding: "12px 16px", borderBottom: idx < 2 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{h.asunto}</div>
              <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{h.id} · {h.fecha}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmtMoney(h.monto)}</div>
              <span className={`badge ${h.estado === "aceptada" ? "badge-success" : "badge-danger"}`} style={{ marginTop: 2 }}>{h.estado}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ActividadTab = ({ p }) => (
  <div className="card">
    <div className="card-body" style={{ padding: 0 }}>
      {p.timeline.slice().reverse().map((ev, idx) => (
        <div key={idx} style={{ padding: "14px 18px", borderBottom: idx < p.timeline.length - 1 ? "1px solid var(--border)" : "none", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center" }}>
            <Icon name={ev.evento.includes("Enviada") ? "send" : "eye"} size={14} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{ev.evento}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              {ev.ip ? `${ev.ciudad} · ${ev.dispositivo} · ${fmtTime(ev.tiempo)}` : "Email enviado a " + p.email}
            </div>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{ev.fecha}</span>
        </div>
      ))}
    </div>
  </div>
);

window.Detalle = Detalle;
