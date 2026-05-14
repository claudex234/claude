# Proyecto: Proforma + Tracking + Competidores

Sistema de proformas con tracking detallado de visitas al link público,
detección de competidores y dictado por voz. **Solo proformas** — no es
sistema de inventario/facturación.

## Branches

- **Trabajo**: `claude/continue-proforma-skins-znIeO` (ahí van todos los commits)
- **Deploy** (GitHub Pages): `claude/design-clade-website-HrBA4`

Flujo: commit en working → push → merge ff-only a deploy → push deploy → vuelvo a working.

URL deploy: `https://duecaz.github.io/test/`

## Stack

- **Frontend**: vanilla JS + ESM (sin frameworks). Libs externas vía `esm.sh`.
- **Backend**: Supabase. Project id: `epyzxfchztyplrckxgku`.
- **Storage**: bucket `productos` (público) para imágenes.
- **Auth**: email+password (admin crea desde panel Supabase).
- **Tests**: `node --test` (29 casos del parser). `package.json` tiene `type:module`.

## Estado actual

Versión: **0.13.1**

### Hecho

| # | Feature |
|---|---|
| ✅ | Auth password con gate al boot |
| ✅ | Smart paste parser PE (RUC, móvil/fijo, edu, capitalize, lower email) |
| ✅ | Dictado por voz (Web Speech API es-PE) con wave animation + normalizador (arroba→@, palabras-número→dígitos, dígitos en grupos colapsados) |
| ✅ | Listado paginado (50/pág) con **split layout**: lista izquierda + panel tracking inline derecha (≥1180px viewport) |
| ✅ | Generador con preview live + autosave borrador (localStorage) + `beforeunload` confirmation |
| ✅ | Edición de proformas (`#/generador/<numero>`) |
| ✅ | Detalle real desde Supabase con tracking completo |
| ✅ | Productos CRUD + upload imagen a Storage (`<userId>/<codigo>/<filename>`) |
| ✅ | Skins HTML/CSS separados (DB + archivos fallback corporate/warm) + manager con editor tabs |
| ✅ | Visor público con anti-capture, watermark opt-in (`?wm=1`) |
| ✅ | PDF interno (`#/print/<numero>`) via `window.print()` |
| ✅ | Tracking real: geo (api.country.is), IP server-side, UA-CH (Win10 vs 11), heartbeat 5s, IP refresca en cada tick (sigue VPN switches) |
| ✅ | Live indicator "Abierta ahora" — dot verde pulsante en filas + en panel. Open detection ≤4s, close ≤3s (tick con `p_closing=true`) |
| ✅ | Sesión actual rediseñada: **hero** (icono device + título + país + red) + **tag visitante** (bot/cliente/reenvío/extranjero/etc) + **engagement score 0-100** + **detalles colapsables** |
| ✅ | Heatmap por zona de la hoja A4 (4 franjas) + sparkline 30 días |
| ✅ | Device fingerprint pasivo: GPU vía WebGL, deviceMemory, pixel_ratio, network (4G/Mbps/RTT), languages, do_not_track, **webdriver=true** (bot detection), arch+bitness vía UA-CH |
| ✅ | Competidores: páginas rastreadas tipo `link`/`html`/`pixel`. Renderer público `#/t/<slug>` + `track.js` standalone ES5 para embeber snippet en sitios externos |
| ✅ | Configuración con datos de empresa + defaults del generador + toggle solo-PE |
| ✅ | Tests del parser (29 casos, `npm test`) |

### Pendiente

| Prioridad | Tarea |
|---|---|
| Alta | **Empresa data consumida por planillas** — hoy se guarda en `user_settings.empresa` pero las planillas siguen leyendo `EMISOR` hardcoded de `data/empresa.js`. Extender `get_public_proforma` RPC para devolver empresa del owner; merge en `planilla_data.js` |
| Alta | **Adjuntos reales** (plan listo): cada producto tiene PDF/video. Al generar proforma, sus adjuntos se incluyen. Visor muestra adjuntos clickeables. Tracking registra clicks. Implementar: SQL + API + UI productos + visor + detalle |
| Media | **Más planillas** (minimal/bold/editorial/tech). Hoy solo corporate + warm. Las 4 placeholder de DB se borraron — hay que crear nuevas desde la UI |
| Media | **Geo server-side** (hoy client-side, falsificable). Edge function de Supabase o `pg_net` extension |
| Media | **Notificación email** al primer `open_apertura` de una proforma. Trigger SQL → edge function → email |
| Media | **Mobile responsive del admin** (visor sí está optimizado). El listado/generador no testeado en mobile |
| Baja | **Heatmap por coordenadas X/Y** de clicks (hoy solo por zona) — requiere guardar coords en cada click |
| Baja | **Movimientos del dispositivo segmentados** (vertical/horizontal/rotación/quieto/agitado) con timeline — requiere samplear gyro con timestamps |
| Baja | **Mini mapa de ubicación**, indicador de red visual tipo señal wifi, comparativa apertura vs promedio del cliente |

### Decisiones explícitas del usuario

- **Aceptación/rechazo descartada**: la app es solo de proformas, no se hace seguimiento de cierre comercial
- **Stock**: queda como página informativa estática (no descuenta inventario)
- **Adjuntos**: solo placeholder por ahora, plan listo para implementar
- **Tab Clientes eliminado**: los clientes se crean implícitos al guardar una proforma (`findOrCreateCliente`). No hay UI para gestionarlos.
- **Privacy disclosure** descartado (no se necesita aviso visible, solo el solo-PE)

## Arquitectura

### Estructura de archivos

```
/
├── index.html
├── styles.css           (885 → ~1000 líneas)
├── package.json         ("type":"module", npm test)
├── track.js             (pixel snippet ES5 standalone)
├── .nojekyll            (GitHub Pages: permite archivos con _)
├── planillas/
│   ├── corporate/{template.html, styles.css}
│   └── warm/{template.html, styles.css}
├── js/
│   ├── main.js          (boot: público / print / tracker / admin)
│   ├── lib/
│   │   ├── a4_fit.js              transform:scale + ResizeObserver para hoja A4
│   │   ├── auth.js                login screen + waitForSession
│   │   ├── clipboard.js           copyToClipboard con fallback execCommand
│   │   ├── device_fingerprint.js  recolección pasiva (GPU, RAM, net, UA-CH...)
│   │   ├── dictation.js           Web Speech API wrapper
│   │   ├── icons.js               SVG lucide-style
│   │   ├── mic_styles.js          @keyframes del wave dictado
│   │   ├── parser.js              smart paste + normalizeDictation
│   │   ├── planilla_data.js       fromEditorState/fromRpcPayload/fromDetail
│   │   ├── planillas.js           resolvePlanilla con FILE_BACKED + empty flag
│   │   ├── router.js              hash router
│   │   ├── sample_data.js         data fake para previews del manager de skins
│   │   ├── share.js               publicUrl + copyAndToast
│   │   ├── store.js               { theme, sidebarCollapsed, tweaksOpen }
│   │   ├── supabase.js            cliente + SUPABASE_URL + KEY exportados
│   │   ├── template_engine.js     Mustache mini, parser balanceado
│   │   ├── toast.js               notifs
│   │   ├── tracking.js            startTracking del visor (geo + open + heartbeat + zones)
│   │   ├── tracking_view.js       renderTracking: hero + tag + engagement + details
│   │   ├── ua_parser.js           parseUA + enrichUA (Client Hints)
│   │   ├── utils.js               html``, raw, el, on, fmtMoney, fmtDate, ago...
│   │   ├── version.js             APP_VERSION + clearCacheAndReload
│   │   └── visor_protection.js    anti-capture: contextmenu, dragstart, atajos
│   ├── data/
│   │   ├── api.js                 barrel de data/api/*
│   │   ├── api/
│   │   │   ├── helpers.js         requireUser, randomSlug, findOrCreateCliente, computeTotals, resolveSkinId
│   │   │   ├── proformas.js       create/update/ensureLink/fetchDetail/nextNumero
│   │   │   ├── skins.js           upsert/delete/setDefault/fetch
│   │   │   ├── productos.js       upsert/archive/restore/fetch/uploadImagen
│   │   │   ├── settings.js        fetch/save user_settings
│   │   │   ├── aperturas.js       fetchAperturas, fetchLiveProformaIds, isLiveApertura, LIVE_WINDOW_S=15
│   │   │   └── tracking.js        pages/hits de Competidores
│   │   ├── config.js              CONFIG global (publico_solo_pe, empresa, defaults)
│   │   ├── empresa.js             EMISOR hardcoded + FORMAS_PAGO + BLOQUES_PANTALLA
│   │   ├── loader.js              loadAll (productos, skins, clientes, proformas, settings)
│   │   ├── productos.js           PRODUCTOS catálogo + adaptProducto
│   │   ├── proformas.js           PROFORMAS array + adaptProforma + toMemoryProforma
│   │   └── skins.js               SKINS array + adaptSkin + defaultSkinCodigo
│   ├── pages/
│   │   ├── adjuntos.js            (mock placeholder con banner "en desarrollo")
│   │   ├── competidores.js        manager + detalle de páginas rastreadas
│   │   ├── config.js              empresa / defaults / solo-PE
│   │   ├── detalle.js             proforma detail completa
│   │   ├── generador.js           editor + autosave + dictado + mic wave
│   │   ├── listado.js             split: lista + panel tracking
│   │   ├── print.js               versión imprimible (#/print/<numero>)
│   │   ├── productos.js           CRUD con upload imagen
│   │   ├── publico.js             visor proforma público
│   │   ├── stock.js               (mock placeholder con banner "informativo")
│   │   ├── templates.js           manager de skins con editor HTML/CSS tabs
│   │   └── tracker.js             renderer público de Competidores (#/t/<slug>)
│   └── components/
│       ├── sidebar.js             nav lateral (hidrata user-card con auth.getUser)
│       ├── topbar.js              breadcrumb + clear-cache + signout
│       └── tweaks.js              panel de tweaks (tema + nav alterna)
└── tests/
    └── parser.test.js             29 casos (normalizeDictation + parsePaste)
```

### Rutas

| Hash | Descripción | Auth |
|---|---|---|
| `#/proformas` | Listado split con panel tracking | sí |
| `#/generador` | Nueva proforma | sí |
| `#/generador/<numero>` | Editar proforma existente | sí |
| `#/detalle/<numero>` | Detalle completo | sí |
| `#/productos` | CRUD productos | sí |
| `#/templates` | Manager de skins | sí |
| `#/competidores` | Manager páginas rastreadas | sí |
| `#/competidores/<id>` | Detalle de una página | sí |
| `#/stock`, `#/adjuntos` | mock placeholders | sí |
| `#/config` | Settings | sí |
| `#/p/<slug>` | Visor público de proforma | **no** |
| `#/print/<numero>` | Versión imprimible | sí |
| `#/t/<slug>` | Renderer público de Competidores | **no** |
| `/track.js?s=<slug>` | Pixel standalone (sitios externos) | **no** |

### Supabase — tablas

| Tabla | Notas |
|---|---|
| `clientes` | RLS por owner. Solo se crean implícitos al guardar proforma. |
| `productos` | RLS por owner. Soft delete vía `activo=false` |
| `stock` | placeholder |
| `skins` | corporate + warm tienen archivos en `/planillas/`. Otras viven solo en DB |
| `proformas` | `numero` (PRF-YYYY-NNNN), `estado` check (borrador/enviada/vista/aceptada/rechazada/vencida) |
| `proforma_items` | embed con productos vía LEFT JOIN |
| `proforma_links` | `slug` único, FK a proforma |
| `proforma_aperturas` | link_id + ip + geo + ua + dispositivo + os + duracion_s + scroll_pct + clicks + gyro_events + print_screen_attempts + descarga + impresion + reenvio + zonas_s jsonb + meta jsonb + abierta_at + ultima_actividad_at |
| `tracking_pages` | competidores: slug + tipo (pixel/link/html) + destino_url/contenido_html |
| `tracking_hits` | + page_id + ip + geo + ua + dispositivo + os + referrer + query_params + meta + duracion_s |
| `user_settings` | user_id PK + publico_solo_pe + empresa jsonb + defaults jsonb |
| `adjuntos` | tabla creada pero UI placeholder |
| `plantillas` | legacy (no usada) |

### Supabase — RPCs

| RPC | Quién la llama | Descripción |
|---|---|---|
| `get_public_proforma(slug)` | anon (visor) | Devuelve proforma + cliente + items + skin |
| `open_apertura(slug, ua, dispositivo, os, referrer, idioma, timezone, pais, ciudad, region, meta)` | anon | Crea apertura, gate por solo_pe |
| `tick_apertura(id, duracion_s, scroll_pct, clicks, gyro_events, prntscr, descarga, impresion, zonas, ua, dispositivo, os, closing)` | anon | Heartbeat. Idempotente y monótono. `closing=true` expira la sesión |
| `get_tracking_page(slug)` | anon | Datos mínimos para renderer de Competidores |
| `track_hit(slug, ua, dispositivo, os, referrer, idioma, timezone, pais, ciudad, region, query, meta)` | anon | Crea hit en tracking_hits |
| `tick_tracking_hit(id, duracion_s)` | anon | Heartbeat para tipo html |

Todas son `SECURITY DEFINER` y leen `x-forwarded-for` del request para IP.

Trigger `detect_reenvio` antes de insertar en `proforma_aperturas`: si hay otra con IP o UA distinto del mismo link, marca `reenvio=true`.

## Convenciones

- **Idioma**: español rioplatense, comunicación corta y directa
- **NO emojis** salvo que el usuario los pida
- **Commits descriptivos en español**
- Cada deploy bumpear `js/lib/version.js` (semver)
- Sin frameworks; módulos ESM nativos
- **Cada cosa en su sitio**:
  - `lib/` = reutilizable puro (sin DOM-side effects al import)
  - `data/` = state mutable + API
  - `pages/` = vistas full-screen
  - `components/` = layout shells
- Tests con `node --test` (no jest, no vitest). Archivo: `tests/*.test.js`

## Trampas conocidas

1. **`transform: scale` del `.pv-doc`** rompe libs externas (Rough Notation). Highlight es CSS-only.
2. **supabase.rpc(...)** NO expone `.catch` directo — siempre `await` en try/catch.
3. **Skins en DB pueden tener html/css null** — fallback FILE_BACKED ({corporate, warm}) en `lib/planillas.js`.
4. **bootPublic / bootPrint / bootTracker** NO llaman `loadAll` (SKINS vacío). `resolvePlanilla` es defensivo: file-backed primero, ignora SKINS para corporate/warm.
5. **GitHub Pages bloquea archivos con prefijo `_`** (Jekyll). No nombrar `_helpers.js`. `.nojekyll` está en el root.
6. **`location.hash = "..."` dispara `hashchange` async**. En boot, usar `history.replaceState` para evitar doble renderRoute.
7. **El visor manda `os`/`dispositivo`/`ua` en cada heartbeat**. Sesiones viejas se autocorrigen al deploy nuevo (no hace falta reload del visor del cliente).
8. **Heartbeat tick con `p_closing=true`** pone `ultima_actividad_at` en el pasado → admin ve "no live" instantáneo.

## Comandos útiles

```bash
# Tests
npm test

# Verificar sintaxis de todos los JS
for f in js/lib/*.js js/data/*.js js/data/api/*.js js/pages/*.js js/components/*.js js/main.js; do
  node --check "$f" || echo "FAIL $f"
done

# Workflow de commit
git add -A
git commit -m "Mensaje en español"
git push -u origin claude/continue-proforma-skins-znIeO
git checkout claude/design-clade-website-HrBA4
git merge --ff-only claude/continue-proforma-skins-znIeO
git push origin claude/design-clade-website-HrBA4
git checkout claude/continue-proforma-skins-znIeO
```

## Acceso MCP a Supabase

Disponible: `mcp__b1cc245e-b430-40b0-91a1-98bfd7109d2a__*` con project_id `epyzxfchztyplrckxgku`. Tools usados: `apply_migration`, `execute_sql`, `list_tables`, `get_advisors`.
