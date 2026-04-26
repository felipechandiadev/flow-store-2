<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# pwa-admin — UI: diálogos y cards

- **Todos** los modales / diálogos deben construirse con el componente compartido `Dialog` (`@/shared/components/Dialog/Dialog.tsx`).
- **Fila de acciones del `Dialog`:** por defecto **`space-between`** (`actionsJustify="between"`): cancelar/ secundario a la izquierda, primero en `actions`, confirmar/ primario a la derecha, segundo. No redefinir al `end` sin buen motivo.
- **Cabecera del `Dialog`:** no usar el botón de cierre al lado del título; **`showCloseButton` por defecto desactivado** (cierre: backdrop, `Esc`, Cancelar en el pie).
- **Títulos de diálogos de creación:** el `title` (y `aria-label` de controles que abren el diálogo) deben usar el verbo **«Crear …»** (p. ej. `Crear sucursal`, `Crear producto`). **No** usar **«Nueva …»** / **«Nuevo …»** en títulos de creación, para unificar criterio con el botón primario del pie (típicamente «Crear»).
- **Diálogos de actualización de entidad:** el `title`, el `aria-label` de apertura y el **botón primario** del pie deben usar **«Actualizar …»** (p. ej. título `Actualizar sucursal`, CTA `Actualizar`). **No** usar **«Editar …»** en títulos de esos flujos. Los componentes de modal deben nombrarse **`Update*Dialog`** (p. ej. `UpdateBranchDialog`), no `Edit*Dialog`.
- **Alertas y errores en diálogos:** la prop **`alertArea`** renderiza un **bloque propio** (hermano de la fila de botones, no dentro de `actions`); usar el componente **`Alert`**; no poner feedback de envío en `children` (ver `.instructions/webadmin.instruction`).
- Está **prohibido** crear o usar otro enfoque de diálogo (overlays con `fixed` + caja a mano, otra lib de modales, `<dialog>` alternativo, etc.) salvo excepción explícita en el repositorio.
- **IconButton** en **cards** (pies de `Card`, acciones con icono en tarjetas): **solo** `variant="basicSecondary"` (el `Card` aplica esto a acciones con `icon` + `ariaLabel`).
- **Formularios con `TextField`:** el `placeholder` de cada campo debe ser **el mismo texto que el `label`**; no textos de ejemplo en el placeholder (norma en `webadmin.instruction`).
- **Indicadores de carga (loading):** cualquier UI de carga reutilizable —`loading.tsx` de segmentos, `Suspense` fallback, `dynamic({ loading: ... })`, bloques mientras se obtienen datos, etc.— debe usar el componente compartido **`DotProgress`** (`@/shared/components/DotProgress/DotProgress` o reexport de `@/shared/components`). **No** usar `animate-spin` a mano, “skeletons” de spinner custom ni texto solo «Cargando…» sin `DotProgress`, salvo excepción explícita. El **`loading` integrado de `Button`** (icono de spinner en el propio botón) sigue siendo el patrón de ese control.
- Ver también `.instructions/webadmin.instruction` e `../WEBADMIN_INSTRUCTIONS.md` para el resto de reglas del frontend admin.
