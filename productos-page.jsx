/* global React, Icon, fmtMoney, PRODUCTOS */
const { useState: useState_pp } = React;

const ProductosPage = ({ goToAdjuntos }) => {
  const [filter, setFilter] = useState_pp("todos");
  const [editing, setEditing] = useState_pp(null);
  const productos = Object.values(PRODUCTOS);

  const stockMock = { PRO: 8, PLUS: 5, ELITE: 2 };
  const ventasMock = { PRO: 23, PLUS: 17, ELITE: 6 };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-sub">Catálogo de pantallas interactivas. Edita specs, precios y descripciones desde aquí.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="download" /> Exportar</button>
          <button className="btn btn-primary" onClick={() => setEditing({ codigo: "", nombre: "", precioDefault: 0, specs: [], incluye: [] })}><Icon name="plus" /> Nuevo producto</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Productos en catálogo</div>
          <div className="stat-value">{productos.length}</div>
          <div className="stat-delta">3 activos · 0 archivados</div>
        </div>
        <div className="stat">
          <div className="stat-label">Más cotizado (30d)</div>
          <div className="stat-value" style={{ fontSize: 22 }}>PRO 75"</div>
          <div className="stat-delta up"><Icon name="arrowUp" size={11} /> 23 cotizaciones</div>
        </div>
        <div className="stat">
          <div className="stat-label">Stock total</div>
          <div className="stat-value">15</div>
          <div className="stat-delta">unidades disponibles</div>
        </div>
      </div>

      {false && (
        <div style={{ display: "none" }}>
          {/* Resumen stock */}
          <div className="stat-grid">
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
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
      )}

      {/* Filtros */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div className="search-input" style={{ flex: 1, maxWidth: 360 }}>
          <Icon name="search" size={14} />
          <input placeholder="Buscar por nombre o código…" />
        </div>
        <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)" }}>
          {[
            { id: "todos", label: "Todos" },
            { id: "pantalla", label: "Pantallas" },
            { id: "accesorio", label: "Accesorios" },
            { id: "servicio", label: "Servicios" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="btn btn-sm" style={{
              background: filter === f.id ? "var(--surface)" : "transparent",
              border: "none",
              boxShadow: filter === f.id ? "var(--shadow-sm)" : "none",
              color: filter === f.id ? "var(--text)" : "var(--text-3)",
              fontWeight: filter === f.id ? 600 : 500,
            }}>{f.label}</button>
          ))}
        </div>
        <button className="btn btn-sm"><Icon name="filter" size={12} /> Más filtros</button>
      </div>

      {/* Grid de productos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {productos.map(p => {
          const stock = stockMock[p.codigo];
          const ventas = ventasMock[p.codigo];
          const stockColor = stock > 5 ? "success" : stock > 2 ? "warn" : "danger";
          return (
            <div key={p.codigo} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Hero */}
              <div style={{
                height: 140,
                background: "var(--bg-sunken)",
                position: "relative",
                display: "grid",
                placeItems: "center",
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{
                  width: "70%", height: "65%",
                  background: "linear-gradient(135deg, var(--surface-2), var(--bg-soft))",
                  border: "2px solid var(--border-strong)",
                  borderRadius: 6,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-mute)",
                  letterSpacing: 1,
                }}>{p.tamano}</div>
                <span className="badge" style={{
                  position: "absolute", top: 10, left: 10,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)", fontWeight: 700,
                }}>{p.codigo}</span>
                <span className={`badge badge-${stockColor}`} style={{ position: "absolute", top: 10, right: 10 }}>
                  {stock} en stock
                </span>
              </div>

              <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14.5, fontWeight: 650, marginBottom: 4, lineHeight: 1.3 }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
                  {p.specs[0]} · {p.specs[6] || p.specs[5]}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14, padding: "10px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .4, fontWeight: 600 }}>Precio</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-strong)" }}>{fmtMoney(p.precioDefault).replace(".00", "")}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .4, fontWeight: 600 }}>Vendidos (30d)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{ventas}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: .4, fontWeight: 600 }}>Adjuntos</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      {p.codigo === "PRO" ? 5 : p.codigo === "PLUS" ? 7 : 4}
                    </div>
                  </div>
                </div>

                <details style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 14 }}>
                  <summary style={{ cursor: "pointer", color: "var(--text-3)", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: .4 }}>
                    {p.specs.length} specs · {p.incluye.length} accesorios
                  </summary>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 16, lineHeight: 1.6 }}>
                    {p.specs.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
                    {p.specs.length > 5 && <li style={{ color: "var(--text-mute)", listStyle: "none", marginLeft: -16 }}>+ {p.specs.length - 5} más…</li>}
                  </ul>
                </details>

                <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                  <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setEditing(p)}><Icon name="edit" size={11} /> Editar</button>
                  <button className="btn btn-sm" onClick={goToAdjuntos}><Icon name="paperclip" size={11} /> Adjuntos</button>
                  <button className="btn btn-sm btn-icon" title="Más opciones"><Icon name="more" size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer de edición */}
      {editing && <ProductoDrawer producto={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

const ProductoDrawer = ({ producto, onClose }) => {
  const [tab, setTab] = useState_pp("info");
  const isNew = !producto.codigo;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 50, animation: "fadeIn .15s" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 580, maxWidth: "92vw",
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)", zIndex: 51,
        display: "flex", flexDirection: "column",
        animation: "slideRight .25s ease",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-mute)", fontWeight: 600, letterSpacing: .4, textTransform: "uppercase" }}>{isNew ? "Nuevo producto" : "Editar producto"}</div>
            <div style={{ fontSize: 16, fontWeight: 650, marginTop: 2 }}>{producto.nombre || "Sin nombre"}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "0 20px", borderBottom: "1px solid var(--border)" }}>
          {[
            { id: "info", l: "Información" },
            { id: "specs", l: `Specs (${producto.specs?.length || 0})` },
            { id: "incluye", l: `Incluye (${producto.incluye?.length || 0})` },
            { id: "stock", l: "Stock & precios" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 12px", background: "transparent", border: "none",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t.id ? "var(--text)" : "var(--text-3)",
              fontWeight: tab === t.id ? 600 : 500, fontSize: 13, cursor: "pointer",
              marginBottom: -1,
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {tab === "info" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label className="field-label">Código</label>
                <input className="input" defaultValue={producto.codigo} placeholder="PRO, PLUS, ELITE…" />
              </div>
              <div>
                <label className="field-label">Nombre completo</label>
                <input className="input" defaultValue={producto.nombre} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="field-label">Tamaño</label>
                  <input className="input" defaultValue={producto.tamano} placeholder='75"' />
                </div>
                <div>
                  <label className="field-label">Tipo</label>
                  <select className="input" defaultValue={producto.tipo || "pantalla"}>
                    <option>pantalla</option><option>accesorio</option><option>servicio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Descripción corta</label>
                <textarea className="input" rows={3} defaultValue="" placeholder="Breve descripción para tarjetas y miniaturas…" />
              </div>
            </div>
          )}
          {tab === "specs" && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>Una spec por línea. Aparecen en el PDF de la proforma.</div>
              <textarea className="input" rows={20} defaultValue={(producto.specs || []).join("\n")} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />
            </div>
          )}
          {tab === "incluye" && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>Accesorios y materiales que se entregan con el producto.</div>
              <textarea className="input" rows={14} defaultValue={(producto.incluye || []).join("\n")} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />
            </div>
          )}
          {tab === "stock" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="field-label">Precio default (S/)</label>
                  <input className="input" type="number" defaultValue={producto.precioDefault} />
                </div>
                <div>
                  <label className="field-label">Precio mínimo permitido (S/)</label>
                  <input className="input" type="number" defaultValue={Math.round((producto.precioDefault || 0) * .75)} />
                </div>
                <div>
                  <label className="field-label">Stock actual</label>
                  <input className="input" type="number" defaultValue="8" />
                </div>
                <div>
                  <label className="field-label">Stock de alerta</label>
                  <input className="input" type="number" defaultValue="3" />
                </div>
              </div>
              <div>
                <label className="field-label">Tiempo de entrega</label>
                <input className="input" defaultValue="7-10 días hábiles" />
              </div>
              <div>
                <label className="field-label">Garantía</label>
                <input className="input" defaultValue="2 años" />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 8 }}>
          {!isNew && <button className="btn" style={{ color: "var(--danger)" }}><Icon name="trash" size={13} /> Eliminar</button>}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary"><Icon name="check" size={13} /> Guardar cambios</button>
          </div>
        </div>
      </div>
    </>
  );
};

window.ProductosPage = ProductosPage;
