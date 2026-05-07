/* global React, Icon, fmtMoney, PRODUCTOS */
const { useState: useState_aj, useMemo: useMemo_aj } = React;

// Adjuntos mock por producto
const ADJUNTOS_DATA = [
  // PRO
  { id: 1, producto: "PRO", tipo: "pdf", nombre: "Ficha técnica PRO 75\".pdf", peso: "2.4 MB", actualizado: "12 abr 2026", incluirEnPdf: true, descargas: 47 },
  { id: 2, producto: "PRO", tipo: "pdf", nombre: "Manual de instalación PRO.pdf", peso: "1.8 MB", actualizado: "08 mar 2026", incluirEnPdf: false, descargas: 18 },
  { id: 3, producto: "PRO", tipo: "video", nombre: "Demo en aula 75\" - Innova.mp4", peso: "48 MB", duracion: "2:34", actualizado: "22 abr 2026", incluirEnPdf: true, vistas: 89 },
  { id: 4, producto: "PRO", tipo: "image", nombre: "PRO - vista frontal.jpg", peso: "780 KB", actualizado: "15 ene 2026", incluirEnPdf: true },
  { id: 5, producto: "PRO", tipo: "image", nombre: "PRO - vista lateral.jpg", peso: "720 KB", actualizado: "15 ene 2026", incluirEnPdf: false },
  // PLUS
  { id: 6, producto: "PLUS", tipo: "pdf", nombre: "Ficha técnica PLUS 86\".pdf", peso: "3.1 MB", actualizado: "12 abr 2026", incluirEnPdf: true, descargas: 32 },
  { id: 7, producto: "PLUS", tipo: "pdf", nombre: "Comparativa PLUS vs competencia.pdf", peso: "1.2 MB", actualizado: "01 may 2026", incluirEnPdf: true, descargas: 24 },
  { id: 8, producto: "PLUS", tipo: "pdf", nombre: "Casos de éxito - educación.pdf", peso: "4.6 MB", actualizado: "20 mar 2026", incluirEnPdf: true, descargas: 41 },
  { id: 9, producto: "PLUS", tipo: "video", nombre: "Tutorial - IA educativa.mp4", peso: "62 MB", duracion: "4:12", actualizado: "28 abr 2026", incluirEnPdf: true, vistas: 156 },
  { id: 10, producto: "PLUS", tipo: "video", nombre: "Webinar Cibertec.mp4", peso: "210 MB", duracion: "32:18", actualizado: "10 abr 2026", incluirEnPdf: false, vistas: 73 },
  { id: 11, producto: "PLUS", tipo: "image", nombre: "PLUS instalado - U. Continental.jpg", peso: "1.4 MB", actualizado: "05 abr 2026", incluirEnPdf: true },
  { id: 12, producto: "PLUS", tipo: "image", nombre: "PLUS - render aula.png", peso: "2.2 MB", actualizado: "18 ene 2026", incluirEnPdf: true },
  // ELITE
  { id: 13, producto: "ELITE", tipo: "pdf", nombre: "Ficha técnica ELITE 98\".pdf", peso: "3.4 MB", actualizado: "12 abr 2026", incluirEnPdf: true, descargas: 12 },
  { id: 14, producto: "ELITE", tipo: "pdf", nombre: "Certificaciones técnicas.pdf", peso: "890 KB", actualizado: "15 mar 2026", incluirEnPdf: false, descargas: 6 },
  { id: 15, producto: "ELITE", tipo: "video", nombre: "ELITE en directorio - TECSUP.mp4", peso: "94 MB", duracion: "3:48", actualizado: "30 abr 2026", incluirEnPdf: true, vistas: 28 },
  { id: 16, producto: "ELITE", tipo: "image", nombre: "ELITE - sala de juntas.jpg", peso: "1.8 MB", actualizado: "10 feb 2026", incluirEnPdf: true },
];

const tipoMeta = {
  pdf: { icon: "file", color: "#ef4444", label: "PDF" },
  video: { icon: "play", color: "#8b5cf6", label: "Video" },
  image: { icon: "image", color: "#10b981", label: "Imagen" },
};

const Adjuntos = () => {
  const [productoSel, setProductoSel] = useState_aj("PRO");
  const [tipoFilter, setTipoFilter] = useState_aj("todos");
  const [view, setView] = useState_aj("grid");
  const [dragOver, setDragOver] = useState_aj(false);

  const items = useMemo_aj(() => ADJUNTOS_DATA.filter(a => {
    if (a.producto !== productoSel) return false;
    if (tipoFilter !== "todos" && a.tipo !== tipoFilter) return false;
    return true;
  }), [productoSel, tipoFilter]);

  const counts = useMemo_aj(() => {
    const c = { pdf: 0, video: 0, image: 0 };
    ADJUNTOS_DATA.filter(a => a.producto === productoSel).forEach(a => c[a.tipo]++);
    return c;
  }, [productoSel]);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Adjuntos</h1>
          <p className="page-sub">Liga PDFs, videos e imágenes a cada producto. Aparecen como anexos descargables en la proforma.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="download" /> Descargar todos</button>
          <button className="btn btn-primary"><Icon name="plus" /> Subir archivo</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        {/* Sidebar de productos */}
        <div className="card" style={{ padding: 0, alignSelf: "flex-start", position: "sticky", top: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: .4, color: "var(--text-mute)" }}>Producto</div>
          </div>
          <div style={{ padding: 6 }}>
            {Object.values(PRODUCTOS).map(p => {
              const total = ADJUNTOS_DATA.filter(a => a.producto === p.codigo).length;
              const active = productoSel === p.codigo;
              return (
                <button key={p.codigo} onClick={() => setProductoSel(p.codigo)} style={{
                  width: "100%", padding: "10px 12px", background: active ? "var(--accent-soft)" : "transparent",
                  border: "none", borderRadius: "var(--radius-sm)",
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  textAlign: "left", marginBottom: 2,
                  color: active ? "var(--accent-strong)" : "var(--text-2)",
                  fontWeight: active ? 600 : 500,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: active ? "var(--accent)" : "var(--bg-soft)",
                    color: active ? "white" : "var(--text-3)",
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11,
                  }}>{p.codigo}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.tamano} {p.codigo}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)", fontWeight: 500 }}>{total} archivos</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido principal */}
        <div>
          {/* Stats por tipo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { id: "pdf", label: "Documentos PDF" },
              { id: "video", label: "Videos" },
              { id: "image", label: "Imágenes" },
            ].map(t => {
              const meta = tipoMeta[t.id];
              const active = tipoFilter === t.id;
              return (
                <button key={t.id}
                  onClick={() => setTipoFilter(active ? "todos" : t.id)}
                  className="card"
                  style={{
                    padding: 14, cursor: "pointer", textAlign: "left",
                    border: active ? `1px solid ${meta.color}` : "1px solid var(--border)",
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: meta.color + "22",
                      color: meta.color,
                      display: "grid", placeItems: "center",
                    }}>
                      <Icon name={meta.icon} size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{counts[t.id]}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="search-input" style={{ maxWidth: 280, flex: 1 }}>
              <Icon name="search" size={14} />
              <input placeholder="Buscar archivo…" />
            </div>
            <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-soft)", borderRadius: "var(--radius-sm)" }}>
              <button onClick={() => setView("grid")} className="btn btn-sm btn-icon" style={{
                background: view === "grid" ? "var(--surface)" : "transparent", border: "none",
                boxShadow: view === "grid" ? "var(--shadow-sm)" : "none",
              }}><Icon name="home" size={13} /></button>
              <button onClick={() => setView("list")} className="btn btn-sm btn-icon" style={{
                background: view === "list" ? "var(--surface)" : "transparent", border: "none",
                boxShadow: view === "list" ? "var(--shadow-sm)" : "none",
              }}><Icon name="list" size={13} /></button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); }}
            style={{
              border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
              background: dragOver ? "var(--accent-soft)" : "var(--bg-soft)",
              borderRadius: "var(--radius)",
              padding: "20px 16px",
              textAlign: "center",
              marginBottom: 16,
              transition: "all .15s",
            }}>
            <Icon name="paperclip" size={20} />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>Arrastra archivos aquí para subirlos a {productoSel}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>PDF, MP4, JPG, PNG · máx. 250 MB por archivo</div>
          </div>

          {/* Grid de archivos */}
          {view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {items.map(a => {
                const meta = tipoMeta[a.tipo];
                return (
                  <div key={a.id} className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}>
                    {/* Thumbnail */}
                    <div style={{
                      height: 110, background: meta.color + "11",
                      position: "relative",
                      display: "grid", placeItems: "center",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <Icon name={meta.icon} size={36} />
                      <span style={{
                        position: "absolute", top: 6, left: 6,
                        fontSize: 9, fontWeight: 700, padding: "2px 6px",
                        background: meta.color, color: "white",
                        borderRadius: 3, letterSpacing: .5,
                      }}>{meta.label}</span>
                      {a.duracion && (
                        <span style={{
                          position: "absolute", bottom: 6, right: 6,
                          fontSize: 10, padding: "2px 6px",
                          background: "rgba(0,0,0,.7)", color: "white",
                          borderRadius: 3, fontFamily: "var(--font-mono)",
                        }}>{a.duracion}</span>
                      )}
                      {a.incluirEnPdf && (
                        <span style={{
                          position: "absolute", top: 6, right: 6,
                          background: "var(--success)", color: "white",
                          width: 18, height: 18, borderRadius: "50%",
                          display: "grid", placeItems: "center",
                        }}>
                          <Icon name="check" size={10} />
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} title={a.nombre}>{a.nombre}</div>
                      <div style={{ fontSize: 11, color: "var(--text-mute)", display: "flex", justifyContent: "space-between" }}>
                        <span>{a.peso}</span>
                        <span>{a.descargas ? `${a.descargas} ↓` : a.vistas ? `${a.vistas} ▶` : ""}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}></th>
                    <th>Archivo</th>
                    <th style={{ width: 80 }}>Tipo</th>
                    <th style={{ width: 80 }}>Peso</th>
                    <th style={{ width: 110 }}>Actualizado</th>
                    <th style={{ width: 110, textAlign: "center" }}>En PDF</th>
                    <th style={{ width: 80, textAlign: "right" }}>Stats</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(a => {
                    const meta = tipoMeta[a.tipo];
                    return (
                      <tr key={a.id} style={{ cursor: "pointer" }}>
                        <td>
                          <div style={{ width: 28, height: 28, borderRadius: 5, background: meta.color + "22", color: meta.color, display: "grid", placeItems: "center" }}>
                            <Icon name={meta.icon} size={13} />
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 600, fontSize: 13 }}>{a.nombre}</span>{a.duracion && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{a.duracion}</span>}</td>
                        <td><span className="badge" style={{ fontSize: 10 }}>{meta.label}</span></td>
                        <td className="cell-mono">{a.peso}</td>
                        <td style={{ fontSize: 12, color: "var(--text-3)" }}>{a.actualizado}</td>
                        <td style={{ textAlign: "center" }}>{a.incluirEnPdf ? <span style={{ color: "var(--success)" }}><Icon name="check" size={14} /></span> : <span style={{ color: "var(--text-mute)" }}>—</span>}</td>
                        <td style={{ textAlign: "right", fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{a.descargas ? `${a.descargas} ↓` : a.vistas ? `${a.vistas} ▶` : "—"}</td>
                        <td><button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

window.Adjuntos = Adjuntos;
