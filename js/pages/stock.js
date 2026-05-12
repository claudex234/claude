import { html, raw, el } from "../lib/utils.js";
import { icon } from "../lib/icons.js";
import { PRODUCTOS } from "../data/productos.js";

const ROWS = [
  { codigo: "PLUS", almacen: "Lima", stock: 12, reservado: 5, minimo: 8 },
  { codigo: "PLUS", almacen: "Arequipa", stock: 4, reservado: 1, minimo: 6 },
  { codigo: "PRO", almacen: "Lima", stock: 18, reservado: 7, minimo: 10 },
  { codigo: "PRO", almacen: "Arequipa", stock: 9, reservado: 3, minimo: 4 },
  { codigo: "ELITE", almacen: "Lima", stock: 6, reservado: 2, minimo: 3 },
  { codigo: "ELITE", almacen: "Arequipa", stock: 1, reservado: 0, minimo: 2 },
];

export const render = (root) => {
  const node = el(html`
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Stock</h1>
          <p class="page-sub">Información de inventario · solo lectura</p>
        </div>
      </div>

      <div class="card" style="background:var(--bg-soft);border:1px dashed var(--border);padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:var(--text-3)">
        Esta página es informativa. No descuenta stock al generar proformas
        (no hay módulo de facturación). Para gestionar inventario real, usá
        tu sistema de facturación.
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Almacén</th>
                <th style="text-align:right">Disponible</th>
                <th style="text-align:right">Reservado</th>
                <th style="text-align:right">Stock total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${raw(ROWS.map(r => {
                const prod = PRODUCTOS[r.codigo];
                const total = r.stock + r.reservado;
                const bajo = r.stock < r.minimo;
                return `
                  <tr class="row">
                    <td>
                      <div class="cell-strong">${prod?.nombre || r.codigo}</div>
                      <div style="font-size:11px;color:var(--text-mute);font-family:var(--font-mono);margin-top:2px">${r.codigo}</div>
                    </td>
                    <td>${r.almacen}</td>
                    <td style="text-align:right;font-family:var(--font-mono);font-weight:600">${r.stock}</td>
                    <td style="text-align:right;font-family:var(--font-mono);color:var(--text-3)">${r.reservado}</td>
                    <td style="text-align:right;font-family:var(--font-mono)">${total}</td>
                    <td>${bajo
                      ? `<span class="badge" style="color:var(--danger);border-color:var(--danger)">Bajo · mín ${r.minimo}</span>`
                      : `<span class="badge badge-info">OK</span>`}</td>
                  </tr>
                `;
              }).join(""))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `);
  root.appendChild(node);
};
