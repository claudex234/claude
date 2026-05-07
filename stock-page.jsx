/* global React, Icon, fmtMoney, PRODUCTOS */

const StockPage = () => {
  const productos = Object.values(PRODUCTOS);
  const stockData = {
    PRO:   { actual: 8, alerta: 3, reservado: 2, enTransito: 4, ubicacion: "Lima · Almacén central", ultimaEntrada: "2026-04-12", proxLlegada: "2026-05-18", costo: 4200, vendidos30d: 23 },
    PLUS:  { actual: 5, alerta: 3, reservado: 3, enTransito: 0, ubicacion: "Lima · Almacén central", ultimaEntrada: "2026-03-28", proxLlegada: "2026-05-25", costo: 5800, vendidos30d: 17 },
    ELITE: { actual: 2, alerta: 2, reservado: 1, enTransito: 6, ubicacion: "Lima · Almacén central", ultimaEntrada: "2026-02-15", proxLlegada: "2026-05-10", costo: 7400, vendidos30d: 6  },
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-sub">Inventario en tiempo real, reservas por proforma y movimientos del almacén.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="download" /> Exportar inventario</button>
          <button className="btn btn-primary"><Icon name="plus" /> Registrar entrada</button>
        </div>
      </div>

      {/* Resumen stock */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Stock total</div>
          <div className="stat-value">{Object.values(stockData).reduce((a,b)=>a+b.actual,0)}</div>
          <div className="stat-delta">{Object.values(stockData).reduce((a,b)=>a+b.reservado,0)} reservados · {Object.values(stockData).reduce((a,b)=>a+b.enTransito,0)} en tránsito</div>
        </div>
        <div className="stat">
          <div className="stat-label">Valor inventario</div>
          <div className="stat-value">{fmtMoney(Object.values(stockData).reduce((a,b)=>a+b.actual*b.costo,0)).replace(".00", "")}</div>
          <div className="stat-delta">a costo de adquisición</div>
        </div>
        <div className="stat">
          <div className="stat-label">Productos en alerta</div>
          <div className="stat-value" style={{ color: "var(--warn)" }}>{Object.entries(stockData).filter(([,s])=>s.actual<=s.alerta).length}</div>
          <div className="stat-delta">debajo del nivel mínimo</div>
        </div>
        <div className="stat">
          <div className="stat-label">Próxima reposición</div>
          <div className="stat-value" style={{ fontSize: 18 }}>10 may</div>
          <div className="stat-delta">ELITE · 6 unidades</div>
        </div>
      </div>

      {/* Tabla de stock */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th style={{ textAlign: "center" }}>Disponible</th>
              <th style={{ textAlign: "center" }}>Reservado</th>
              <th style={{ textAlign: "center" }}>En tránsito</th>
              <th>Ubicación</th>
              <th style={{ textAlign: "right" }}>Última entrada</th>
              <th style={{ textAlign: "right" }}>Próx. llegada</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => {
              const s = stockData[p.codigo];
              const libre = s.actual - s.reservado;
              const stockColor = s.actual > s.alerta + 2 ? "success" : s.actual > s.alerta ? "warn" : "danger";
              return (
                <tr key={p.codigo} className="row">
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 28, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 3, display: "grid", placeItems: "center", fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-mute)" }}>{p.tamano}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{p.codigo} · costo {fmtMoney(s.costo).replace(".00","")}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                      <span className={`badge badge-${stockColor}`} style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12 }}>{s.actual}</span>
                      <span style={{ fontSize: 10.5, color: "var(--text-mute)" }}>({libre} libres)</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12.5, color: s.reservado > 0 ? "var(--text)" : "var(--text-mute)" }}>{s.reservado}</td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12.5, color: s.enTransito > 0 ? "var(--info)" : "var(--text-mute)" }}>{s.enTransito}</td>
                  <td style={{ fontSize: 12 }}>{s.ubicacion}</td>
                  <td style={{ textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{s.ultimaEntrada}</td>
                  <td style={{ textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent-strong)", fontWeight: 600 }}>{s.proxLlegada}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button className="btn btn-sm" title="Ajustar stock"><Icon name="edit" size={11} /></button>
                      <button className="btn btn-sm" title="Movimientos"><Icon name="clock" size={11} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Movimientos recientes */}
      <div className="card">
        <div className="card-header"><div className="card-title"><Icon name="clock" size={13} /> Movimientos recientes</div></div>
        <div className="card-body" style={{ padding: 0 }}>
          {[
            { f: "2026-05-04", tipo: "salida",  prod: "PRO 75\"",   qty: 3, ref: "PRF-2026-0142", nota: "Entrega Innova Schools" },
            { f: "2026-05-02", tipo: "entrada", prod: "PRO 75\"",   qty: 4, ref: "OC-2026-0033",  nota: "Recepción de fábrica" },
            { f: "2026-04-29", tipo: "salida",  prod: "ELITE 86\"", qty: 1, ref: "PRF-2026-0138", nota: "Entrega Continental" },
            { f: "2026-04-26", tipo: "ajuste",  prod: "PLUS 65\"",  qty: -1, ref: "AJ-008",        nota: "Daño en transporte" },
            { f: "2026-04-22", tipo: "salida",  prod: "PLUS 65\"",  qty: 2, ref: "PRF-2026-0135", nota: "Entrega Trilce" },
          ].map((m, i, arr) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 90px 1fr 110px 90px", gap: 12, padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", fontSize: 12.5 }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-mute)" }}>{m.f}</span>
              <span className={`badge badge-${m.tipo === "entrada" ? "success" : m.tipo === "salida" ? "info" : "warn"}`}>{m.tipo}</span>
              <div>
                <div style={{ fontWeight: 550 }}>{m.prod} <span style={{ color: "var(--text-mute)", fontWeight: 400 }}>· {m.nota}</span></div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)", fontSize: 11.5 }}>{m.ref}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, textAlign: "right", color: m.qty > 0 ? "var(--success)" : "var(--danger)" }}>{m.qty > 0 ? "+" : ""}{m.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.StockPage = StockPage;
