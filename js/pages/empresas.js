// Manager de empresas: lista de empresas del usuario + editor inline.
// Cada empresa tiene su razón social, RUC, datos de contacto, logo,
// cuentas bancarias y firmante. Una se marca como default.

import { html, raw, el, on, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import {
  fetchEmpresas, upsertEmpresa, deleteEmpresa,
  setDefaultEmpresa, uploadEmpresaLogo,
} from "../data/api.js";
import { EMPRESAS, adaptEmpresa } from "../data/empresas.js";
import { toast } from "../lib/toast.js";
import { EMISOR } from "../data/empresa.js";

const emptyForm = () => ({
  id: null,
  nombre: "",
  razon_social: "",
  ruc: "",
  direccion: "",
  telefono: "",
  email: "",
  firmante_nombre: "",
  firmante_cargo: "",
  tagline: "",
  subtagline: "",
  ciudad: "",
  logo_svg: "",
  logo_url: "",
  cuentas: [],
});

const fromRow = (row) => ({ ...emptyForm(), ...row, cuentas: Array.isArray(row.cuentas) ? row.cuentas : [] });

// Pre-llena con los datos hardcoded del EMISOR (la primera vez que el
// usuario crea una empresa). Si ya tenés algo, no toca nada.
const seedFromEmisor = () => ({
  ...emptyForm(),
  nombre: EMISOR.razonSocial,
  razon_social: EMISOR.razonSocial,
  ruc: EMISOR.ruc,
  telefono: EMISOR.telefono,
  email: EMISOR.email,
  firmante_nombre: EMISOR.firmante,
  firmante_cargo: "Gerente comercial",
  tagline: EMISOR.tagline,
  subtagline: EMISOR.subtagline,
  ciudad: EMISOR.ciudad,
  logo_svg: EMISOR.logoSvg,
  cuentas: [...EMISOR.cuentas],
});

const field = (key, label, value, placeholder = "") => `
  <label class="gen-field">
    <span>${label}</span>
    <input class="input" data-key="${key}" value="${e(value || "")}" placeholder="${e(placeholder)}">
  </label>`;

const fieldFull = (key, label, value, placeholder = "") => `
  <label class="gen-field gen-field-full">
    <span>${label}</span>
    <input class="input" data-key="${key}" value="${e(value || "")}" placeholder="${e(placeholder)}">
  </label>`;

const textareaFull = (key, label, value, rows = 6, hint = "") => `
  <label class="gen-field gen-field-full">
    <span>${label}${hint ? ` <span style="color:var(--text-mute);font-weight:400;text-transform:none">${e(hint)}</span>` : ""}</span>
    <textarea class="input" data-key="${key}" rows="${rows}" style="font-family:var(--font-mono);font-size:12px">${e(value || "")}</textarea>
  </label>`;

const logoPreview = (form) => {
  if (form.logo_svg) return form.logo_svg;
  if (form.logo_url) return `<img src="${e(form.logo_url)}" alt="logo" style="max-width:100%;max-height:80px;object-fit:contain">`;
  return `<span style="color:var(--text-mute);font-size:12px">Sin logo</span>`;
};

const cuentasEditor = (cuentas) => `
  <div data-cuentas>
    ${cuentas.map((c, i) => `
      <div class="card" style="padding:10px;margin-bottom:8px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1.2fr auto;gap:6px;align-items:end">
        <label class="gen-field"><span>Banco</span>
          <input class="input" data-c-idx="${i}" data-c-key="banco" value="${e(c.banco || "")}"></label>
        <label class="gen-field"><span>Moneda</span>
          <input class="input" data-c-idx="${i}" data-c-key="moneda" value="${e(c.moneda || "")}" placeholder="Soles"></label>
        <label class="gen-field"><span>Número</span>
          <input class="input" data-c-idx="${i}" data-c-key="numero" value="${e(c.numero || "")}"></label>
        <label class="gen-field"><span>CCI</span>
          <input class="input" data-c-idx="${i}" data-c-key="cci" value="${e(c.cci || "")}"></label>
        <label class="gen-field"><span>A nombre de</span>
          <input class="input" data-c-idx="${i}" data-c-key="titular" value="${e(c.titular || "")}" placeholder="Razón social"></label>
        <button class="btn btn-sm" data-action="del-cuenta" data-idx="${i}" title="Quitar" style="color:var(--danger)">${icon("trash", 12)}</button>
      </div>
    `).join("")}
    <button class="btn btn-sm" data-action="add-cuenta">${icon("plus", 12)} Agregar cuenta</button>
  </div>`;

const listCard = (emp) => `
  <div class="card" style="padding:14px;display:flex;gap:12px;align-items:center;margin-bottom:8px">
    <div style="width:80px;height:48px;display:grid;place-items:center;background:#f6f6f6;border-radius:4px;overflow:hidden">
      ${emp.logo_svg ? emp.logo_svg : emp.logo_url ? `<img src="${e(emp.logo_url)}" style="max-width:100%;max-height:100%;object-fit:contain">` : `<span style="color:var(--text-mute);font-size:10px">sin logo</span>`}
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:650;font-size:14px;display:flex;align-items:center;gap:8px">
        ${e(emp.nombre)}
        ${emp.is_default ? `<span class="badge badge-accent" style="font-size:10px">DEFAULT</span>` : ""}
      </div>
      <div style="font-size:12px;color:var(--text-3);font-family:var(--font-mono)">
        ${e(emp.razon_social || "—")} · RUC ${e(emp.ruc || "—")}
      </div>
    </div>
    <div style="display:flex;gap:6px">
      ${!emp.is_default ? `<button class="btn btn-sm" data-action="set-default" data-id="${e(emp.id)}">Marcar default</button>` : ""}
      <button class="btn btn-sm" data-action="edit" data-id="${e(emp.id)}">${icon("edit", 11)} Editar</button>
      <button class="btn btn-sm" data-action="delete" data-id="${e(emp.id)}" style="color:var(--danger)">${icon("trash", 11)}</button>
    </div>
  </div>`;

const editorPanel = (form) => `
  <div class="card" data-editor style="padding:0;margin-top:16px">
    <div class="card-header"><div class="card-title">${form.id ? `Editar empresa` : `Nueva empresa`}</div></div>
    <div class="card-body">
      <div class="gen-form">
        ${fieldFull("nombre", "Nombre interno", form.nombre, "Cómo la llamás vos (ej. Empresa A)")}
        ${field("razon_social", "Razón social", form.razon_social)}
        ${field("ruc", "RUC", form.ruc)}
        ${fieldFull("direccion", "Dirección", form.direccion)}
        ${field("telefono", "Teléfono", form.telefono)}
        ${field("email", "Email comercial", form.email)}
        ${field("ciudad", "Ciudad", form.ciudad, "Lima")}
        ${field("tagline", "Tagline", form.tagline)}
        ${fieldFull("subtagline", "Subtagline", form.subtagline)}
        ${field("firmante_nombre", "Nombre del firmante", form.firmante_nombre)}
        ${field("firmante_cargo", "Cargo del firmante", form.firmante_cargo)}
      </div>

      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2);margin-bottom:8px">Logo</div>
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="width:160px;height:80px;display:grid;place-items:center;background:#f6f6f6;border-radius:4px;border:1px solid var(--border);padding:6px;flex-shrink:0">
            ${logoPreview(form)}
          </div>
          <div style="flex:1">
            <label class="btn btn-sm" style="display:inline-block;cursor:pointer;margin-bottom:6px">
              ${icon("paperclip", 12)} Subir imagen (PNG/JPG/SVG)
              <input type="file" data-logo-file accept="image/*" style="display:none">
            </label>
            ${form.logo_url ? `<button class="btn btn-sm" data-action="clear-logo-url" style="margin-left:6px">Quitar imagen</button>` : ""}
            <div style="font-size:11px;color:var(--text-mute);margin-top:4px">o pegá el código SVG abajo (tiene prioridad si está)</div>
          </div>
        </div>
        ${textareaFull("logo_svg", "Logo SVG (markup)", form.logo_svg, 5, "<svg>...</svg> — se inserta tal cual en la planilla")}
      </div>

      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2);margin-bottom:8px">Cuentas bancarias</div>
        ${cuentasEditor(form.cuentas)}
      </div>

      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" data-action="cancel">Cancelar</button>
        <button class="btn btn-primary" data-action="save">${icon("check", 12)} Guardar empresa</button>
      </div>
    </div>
  </div>`;

export const render = async (root) => {
  let rows = [];
  let editing = null;

  try { rows = await fetchEmpresas(); }
  catch (err) { console.warn("[empresas]", err); }

  const syncMemory = () => {
    EMPRESAS.length = 0;
    for (const r of rows) EMPRESAS.push(adaptEmpresa(r));
  };
  syncMemory();

  const node = el(html`
    <div class="page fade-in" style="max-width:980px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Empresas</h1>
          <p class="page-sub">Cada empresa con su razón social, RUC, logo y cuentas. Elegís cuál usa la proforma al generarla.</p>
        </div>
        <div><button class="btn btn-primary" data-action="new">${raw(icon("plus", 12))} Nueva empresa</button></div>
      </div>

      <div data-list>
        ${rows.length
          ? raw(rows.map((r) => listCard(adaptEmpresa(r))).join(""))
          : raw(`<div class="card" style="padding:24px;text-align:center;color:var(--text-3)">
              No tenés empresas todavía. Creá la primera — se prellena con los datos hardcoded.
            </div>`)}
      </div>

      <div data-editor-slot></div>
    </div>
  `);
  root.replaceChildren(node);

  const renderList = () => {
    const slot = node.querySelector("[data-list]");
    slot.innerHTML = rows.length
      ? rows.map((r) => listCard(adaptEmpresa(r))).join("")
      : `<div class="card" style="padding:24px;text-align:center;color:var(--text-3)">No tenés empresas todavía.</div>`;
  };

  const renderEditor = () => {
    const slot = node.querySelector("[data-editor-slot]");
    slot.innerHTML = editing ? editorPanel(editing) : "";
  };

  const reload = async () => {
    rows = await fetchEmpresas();
    syncMemory();
    renderList();
  };

  // === Lista ============================================================
  on(node, "click", "[data-action='new']", () => {
    editing = rows.length === 0 ? seedFromEmisor() : emptyForm();
    renderEditor();
    node.querySelector("[data-editor]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  on(node, "click", "[data-action='edit']", (_, btn) => {
    const id = btn.dataset.id;
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    editing = fromRow(row);
    renderEditor();
    node.querySelector("[data-editor]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  on(node, "click", "[data-action='delete']", async (_, btn) => {
    const id = btn.dataset.id;
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!confirm(`¿Eliminar la empresa "${row.nombre}"? Las proformas que la usen quedarán sin empresa (usarán la default).`)) return;
    try {
      await deleteEmpresa(id);
      await reload();
      if (editing?.id === id) { editing = null; renderEditor(); }
      toast("Empresa eliminada", { type: "ok" });
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude eliminar", { type: "err" });
    }
  });

  on(node, "click", "[data-action='set-default']", async (_, btn) => {
    try {
      await setDefaultEmpresa(btn.dataset.id);
      await reload();
      toast("Default actualizada", { type: "ok" });
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude marcar default", { type: "err" });
    }
  });

  // === Editor ===========================================================
  on(node, "input", "[data-editor] [data-key]", (ev) => {
    if (!editing) return;
    editing[ev.target.dataset.key] = ev.target.value;
  });

  on(node, "input", "[data-editor] [data-c-idx]", (ev) => {
    if (!editing) return;
    const idx = parseInt(ev.target.dataset.cIdx, 10);
    const key = ev.target.dataset.cKey;
    if (!editing.cuentas[idx]) editing.cuentas[idx] = {};
    editing.cuentas[idx][key] = ev.target.value;
  });

  on(node, "click", "[data-action='add-cuenta']", () => {
    if (!editing) return;
    editing.cuentas.push({ banco: "", moneda: "Soles", numero: "", cci: "", titular: editing.razon_social || "" });
    renderEditor();
  });

  on(node, "click", "[data-action='del-cuenta']", (_, btn) => {
    if (!editing) return;
    const idx = parseInt(btn.dataset.idx, 10);
    editing.cuentas.splice(idx, 1);
    renderEditor();
  });

  on(node, "click", "[data-action='clear-logo-url']", () => {
    if (!editing) return;
    editing.logo_url = "";
    renderEditor();
  });

  on(node, "change", "[data-logo-file]", async (ev) => {
    if (!editing) return;
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadEmpresaLogo(editing.id, file);
      editing.logo_url = url;
      // Si subió imagen, asumimos que reemplaza al SVG inline.
      editing.logo_svg = "";
      renderEditor();
      toast("Logo subido", { type: "ok" });
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude subir el logo", { type: "err" });
    }
  });

  on(node, "click", "[data-action='cancel']", () => {
    editing = null;
    renderEditor();
  });

  on(node, "click", "[data-action='save']", async () => {
    if (!editing) return;
    if (!editing.nombre?.trim() && !editing.razon_social?.trim()) {
      toast("Falta el nombre o razón social", { type: "err" });
      return;
    }
    try {
      const saved = await upsertEmpresa(editing);
      // Si era la primera empresa, márcala como default automáticamente.
      if (rows.length === 0) {
        try { await setDefaultEmpresa(saved.id); } catch {}
      }
      await reload();
      editing = null;
      renderEditor();
      toast("Empresa guardada", { type: "ok" });
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
    }
  });
};
