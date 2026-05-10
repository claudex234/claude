// Catálogo de clientes en memoria. Lo rellena `data/loader.js` desde la
// tabla `clientes`. Se mantiene actualizado por la página de clientes
// cuando hay altas/edits/borrados.
export const CLIENTES = [];

export const findClienteById = (id) => CLIENTES.find((c) => c.id === id);

// Cuenta de proformas por cliente_id (para mostrar "X proformas" en la
// lista). Lo arma `loader.js` después de cargar PROFORMAS.
export const PROFORMAS_POR_CLIENTE = {};
