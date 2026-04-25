<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# pwa-admin — UI: diálogos y cards

- **Todos** los modales / diálogos deben construirse con el componente compartido `Dialog` (`@/shared/components/Dialog/Dialog.tsx`).
- Está **prohibido** crear o usar otro enfoque de diálogo (overlays con `fixed` + caja a mano, otra lib de modales, `<dialog>` alternativo, etc.) salvo excepción explícita en el repositorio.
- **IconButton** en **cards** (pies de `Card`, acciones con icono en tarjetas): **solo** `variant="basicSecondary"` (el `Card` aplica esto a acciones con `icon` + `ariaLabel`).
- Ver también `.instructions/webadmin.instruction` e `../WEBADMIN_INSTRUCTIONS.md` para el resto de reglas del frontend admin.
