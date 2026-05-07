// Página stub genérica para vistas todavía no convertidas a vanilla.
import { html, raw, el } from "../lib/utils.js";
import { icon } from "../lib/icons.js";

export const makeStub = (title, descripcion) => ({
  render(root) {
    const node = el(html`
      <div class="page fade-in" style="max-width:720px">
        <div class="page-header">
          <div>
            <h1 class="page-title">${title}</h1>
            <p class="page-sub">${descripcion}</p>
          </div>
        </div>
        <div class="card">
          <div class="card-body" style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--accent-soft);display:grid;place-items:center;color:var(--accent-strong);flex-shrink:0">${raw(icon("clock", 18))}</div>
            <div>
              <div style="font-size:14px;font-weight:600;margin-bottom:4px">Pendiente de convertir</div>
              <div style="font-size:13px;color:var(--text-3);line-height:1.5">
                Esta vista existe en la versión React original y se va a portar a vanilla JS en una próxima iteración.
                Mientras tanto las demás secciones funcionan: Dashboard y Configuración están listas, y la navegación, el sidebar, el panel de Tweaks y los temas funcionan.
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    root.appendChild(node);
  },
});
