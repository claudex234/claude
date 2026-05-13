// Datos de muestra para renderizar previews de planillas (tab Plantillas
// y editor de skin). Permite ver cómo queda una skin sin tener una
// proforma real. NO se usa en el visor público ni en el generador.

export const SAMPLE_DATA = {
  numero: "PRF-2026-0001",
  fecha: "08/05/2026",
  emisor: {
    razonSocial: "EDUBOARD EIRL",
    ruc: "20603573758",
    firmante: "Manuel Dueñas Cazani",
    logoSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 36"><g fill="none" stroke="#0a0a0a" stroke-width="2"><line x1="8" y1="1" x2="162" y2="1"/><line x1="169" y1="8" x2="169" y2="28"/><line x1="8" y1="35" x2="162" y2="35"/><line x1="1" y1="8" x2="1" y2="28"/><path d="M8 1 Q 1 1 1 8"/><path d="M162 1 Q 169 1 169 8"/><path d="M8 35 Q 1 35 1 28"/><path d="M162 35 Q 169 35 169 28"/></g><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-family="system-ui" fill="#0a0a0a" letter-spacing="3"><tspan font-weight="700">EDU</tspan><tspan>BOARD</tspan></text></svg>',
    cuentas: [{ banco: "BCP", moneda: "Soles", numero: "194-…", cci: "002 …" }],
  },
  cliente: { razon: "Cliente Demo S.A.C.", ruc: "20512345678", contacto: "María Q.", email: "demo@x.pe", telefono: "+51 987 654 321" },
  terminos: { tiempoEntrega: "07 días", lugarEntrega: "Lima", garantia: "2 años", validez: 15, condiciones: "T/T" },
  items: [{ qty: 1, precio: "8,500.00", total: "8,500.00", nombre: "Pantalla PRO 75″", codigo: "PRO", imagen: "", specs: ["4K UHD", "Android 13"], specsHighlight: ["RAM 8 GB", "IA educativa"], incluye: ["Cable USB", "Manual"] }],
  totales: { subtotal: "8,500.00", igv: "1,530.00", total: "10,030.00" },
  showBloques: true,
  bloques: { servicios: ["Entrega e instalación"], noIncluido: ["Cables eléctricos"] },
};
