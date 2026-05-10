// Página de clientes — listado + alta/edit/delete con un panel inline
// al costado. Hasta ahora los clientes se creaban implícitos al guardar
// una proforma; acá se editan directamente.

import { html, raw, el, on, escapeHtml as e } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { CLIENTES, PROFORMAS_POR_CLIENTE } from "../data/clientes.js";
import { upsertCliente, deleteCliente, fetchClientes } from "../data/api.js";
import { toast } from "../lib/toast.js";

const emptyForm = () => ({
  id: null,
  razon_social: "", ruc: "", contacto: "", cargo: "",
  email: "", telefono: "",
});

const toForm = (c) => ({
  id: c.id,
  razon_social: c.razon_social || "",
  ruc: c.ruc || "",
  contacto: c.contacto || "",
  cargo: c.cargo || "",
  email: c.email || "",
  telefono: c.telefono || "",
});

const matches = (c, q) => {
  if (!q) return true;
  const hay = [c.razon_social, c.ruc, c.contacto, c.email, c.telefono]
    .filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
};

export const render = (root) => {
  let q = "";
  let form = emptyForm();        // null id → modo nuevo
  let editing = false;            // true cuando hay panel abierto
  let dirty = false;

  const sortedFiltered = () =>
    [...CLIENTES].filter((c) => matches(c, q));

  const refreshClientes = async () => {
    const rows = await fetchClientes();
    CLIENTES.length = 0;
    for (const r of rows) CLIENTES.push(r);
    CLIENTES.sort((a, b) => (a.razon_social || "").localeCompare(b.razon_social || ""));
  };

  const rowHtml = (c) => {
    const count = PROFORMAS_POR_CLIENTE[c.id] || 0;
    const active = editing && form.id === c.id;
    return `
      <tr class="row${active ? " row-active" : ""}" data-id="${e(c.id)}" style="cursor:pointer">
        <td>
          <div style="font-weight:600">${e(c.razon_social || "—")}</div>
          ${c.contacto ? `<div style="font-size:11.5px;color:var(--text-3)">${e(c.contacto)}${c.cargo ? ` · ${e(c.cargo)}` : ""}</div>` : ""}
        </td>
        <td style="font-family:var(--font-mono);font-size:12px">${e(c.ruc || "—")}</td>
        <td style="font-size:12px">
          ${c.email ? `<div style="font-family:var(--font-mono)">${e(c.email)}</div>` : ""}
          ${c.telefono ? `<div style="font-family:var(--font-mono);color:var(--text-3)">${e(c.telefono)}</div>` : ""}
          ${!c.email && !c.telefono ? '<span style="color:var(--text-mute)">—</span>' : ""}
        </td>
        <td style="text-align:right;font-family:var(--font-mono)">${count}</td>
      </tr>`;
  };

  const tableHtml = () => {
    const arr = sortedFiltered();
    if (!arr.length) {
      return `<div class="card" style="padding:24px;text-align:center;color:var(--text-mute)">${q ? "Sin resultados para esa búsqueda." : "Sin clientes todavía. Click \"Nuevo cliente\"."}</div>`;
    }
    return `
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table" style="margin:0">
          <thead>
            <tr>
              <th>Razón social / contacto</th>
              <th style="width:140px">RUC</th>
              <th style="width:240px">Email / teléfono</th>
              <th style="width:90px;text-align:right">Proformas</th>
            </tr>
          </thead>
          <tbody>${arr.map(rowHtml).join("")}</tbody>
        </table>
      </div>`;
  };

  const formHtml = () => `
    <div class="card" style="padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:650">${form.id ? "Editar cliente" : "Nuevo cliente"}</div>
          ${form.id ? `<div style="font-size:11.5px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${e(form.id)}</div>` : ""}
        </div>
        <button class="btn btn-sm btn-ghost" data-action="close" title="Cerrar">${icon("x", 14)}</button>
      </div>
      <div class="gen-form">
        <label class="gen-field gen-field-full"><span>Razón social *</span><input class="input" data-f="razon_social" value="${e(form.razon_social)}" autofocus></label>
        <label class="gen-field"><span>RUC</span><input class="input" data-f="ruc" value="${e(form.ruc)}" placeholder="20…"></label>
        <label class="gen-field"><span>Contacto</span><input class="input" data-f="contacto" value="${e(form.contacto)}"></label>
        <label class="gen-field"><span>Cargo</span><input class="input" data-f="cargo" value="${e(form.cargo)}"></label>
        <label class="gen-field"><span>Email</span><input class="input" data-f="email" value="${e(form.email)}"></label>
        <label class="gen-field gen-field-full"><span>Teléfono</span><input class="input" data-f="telefono" value="${e(form.telefono)}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:space-between">
        <div>
          ${form.id ? `<button class="btn btn-sm" data-action="delete" style="color:var(--danger)">${icon("trash", 12)} Eliminar</button>` : ""}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" data-action="close">Cancelar</button>
          <button class="btn btn-sm btn-primary" data-action="save">${form.id ? "Guardar" : "Crear"}</button>
        </div>
      </div>
    </div>`;

  const buildPage = () => html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Clientes</h1>
          <p class="page-sub">${CLIENTES.length} clientes · gestionalos sin pasar por una proforma</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="input" data-search placeholder="Buscar por razón social, RUC…" value="${e(q)}" style="width:280px">
          <button class="btn btn-primary" data-action="new">${raw(icon("plus"))} Nuevo cliente</button>
        </div>
      </div>
      <div class="cli-grid" style="display:grid;grid-template-columns:${editing ? "minmax(0, 1fr) 380px" : "1fr"};gap:20px;align-items:start">
        <div data-list>${raw(tableHtml())}</div>
        ${editing ? raw(`<div data-form>${formHtml()}</div>`) : ""}
      </div>
    </div>`;

  let node = el(buildPage());
  root.appendChild(node);

  const refreshList = () => {
    const target = node.querySelector("[data-list]");
    if (target) target.innerHTML = tableHtml();
  };

  const remountAll = () => {
    const next = el(buildPage());
    node.replaceWith(next);
    node = next;
    wire();
    if (editing) {
      const first = node.querySelector("[data-f='razon_social']");
      if (first) {
        first.focus();
        const len = first.value.length;
        try { first.setSelectionRange(len, len); } catch {}
      }
    } else if (q) {
      const srch = node.querySelector("[data-search]");
      if (srch) { srch.focus(); srch.setSelectionRange(q.length, q.length); }
    }
  };

  const openNew = () => {
    if (editing && dirty && !confirm("Hay cambios sin guardar. ¿Descartar?")) return;
    form = emptyForm();
    editing = true;
    dirty = false;
    remountAll();
  };

  const openEdit = (id) => {
    const c = CLIENTES.find((x) => x.id === id);
    if (!c) return;
    if (editing && dirty && !confirm("Hay cambios sin guardar. ¿Descartar?")) return;
    form = toForm(c);
    editing = true;
    dirty = false;
    remountAll();
  };

  const closeForm = () => {
    if (dirty && !confirm("Hay cambios sin guardar. ¿Descartar?")) return;
    editing = false;
    dirty = false;
    remountAll();
  };

  const save = async () => {
    if (!form.razon_social.trim()) {
      toast("Falta la razón social", { type: "err" });
      return;
    }
    try {
      const saved = await upsertCliente(form);
      // Update in-memory CLIENTES
      const idx = CLIENTES.findIndex((c) => c.id === saved.id);
      if (idx >= 0) CLIENTES[idx] = saved;
      else CLIENTES.push(saved);
      CLIENTES.sort((a, b) => (a.razon_social || "").localeCompare(b.razon_social || ""));
      toast(form.id ? "Cliente actualizado" : "Cliente creado", { type: "ok" });
      editing = false;
      dirty = false;
      remountAll();
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude guardar", { type: "err" });
    }
  };

  const removeCurrent = async () => {
    if (!form.id) return;
    const count = PROFORMAS_POR_CLIENTE[form.id] || 0;
    if (count > 0) {
      toast(`No se puede borrar: tiene ${count} proforma(s) asociada(s)`, { type: "err", ms: 6000 });
      return;
    }
    if (!confirm(`¿Eliminar a "${form.razon_social}"?`)) return;
    try {
      await deleteCliente(form.id);
      const idx = CLIENTES.findIndex((c) => c.id === form.id);
      if (idx >= 0) CLIENTES.splice(idx, 1);
      toast("Cliente eliminado", { type: "ok" });
      editing = false;
      dirty = false;
      remountAll();
    } catch (err) {
      console.error(err);
      toast(err.message || "No pude eliminar", { type: "err" });
    }
  };

  const wire = () => {
    on(node, "click", "[data-action='new']", openNew);
    on(node, "click", "[data-action='close']", closeForm);
    on(node, "click", "[data-action='save']", save);
    on(node, "click", "[data-action='delete']", removeCurrent);
    on(node, "click", "tr.row", (_, tr) => openEdit(tr.dataset.id));
    on(node, "input", "[data-search]", (ev) => {
      q = ev.target.value;
      refreshList();
    });
    on(node, "input", "[data-f]", (ev) => {
      const k = ev.target.dataset.f;
      form[k] = ev.target.value;
      dirty = true;
    });
    // Auto-refresh sólo del listado en cambios remotos no aplica acá;
    // Enter dentro del form dispara save
    on(node, "keydown", "[data-f]", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey && ev.target.tagName === "INPUT") {
        ev.preventDefault();
        save();
      }
    });
  };

  wire();
};
