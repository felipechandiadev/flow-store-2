# FlowStore Print Service (Tauri)

Local print agent for FlowStore PWAs: WebSocket on `127.0.0.1`, SQLite for settings and printer mappings, optional **WSS** with a self-signed certificate stored under the app data directory.

Normative protocol and behavior: [docs/print_service_app_developer_guide_v2.md](../docs/print_service_app_developer_guide_v2.md).

## Defaults

| Setting | Default |
|--------|---------|
| Plain WS port | **14567** |
| WSS port | **14568** |
| DB file | `%app_data%/print_service.sqlite3` |
| TLS cert/key | `%app_data%/agent-tls-cert.der`, `agent-tls-key.der` |

Disable WSS with SQLite setting `wss_enabled` = `false` (requires restart to stop the TLS listener).

**Cierre de la ventana principal:** al usar el botón de cerrar de la ventana (no solo ocultar), la aplicación **termina por completo** y se liberan los puertos **WS** y **WSS**. Para volver a imprimir, abrí de nuevo el Print Service desde Aplicaciones o Spotlight. El ícono de bandeja desaparece junto con el proceso.

Changing `listen_port` / `wss_listen_port` via `set_config` updates SQLite only; **restart the agent** for sockets to rebind.

## Puerto WS ocupado (`Address already in use` / os error 48)

En **macOS/Linux**, al iniciar el agente se intenta liberar los puertos WS/WSS: se buscan procesos que sigan en `LISTEN` en esos puertos y cuya línea de comando parezca este binario (`print-service`, etc.); se les envía **SIGTERM** antes del `bind`. Otras apps en el mismo puerto **no** se tocan.

Nota: procesos de versiones anteriores (`print-service-app`) también se detectan durante la transición.

Si el error persiste:

1. **Otra copia del Print Service** que no coincida con el filtro (poco probable). Cerrá la de la bandeja o el otro terminal.
2. Ver quién usa el puerto (macOS):
   ```bash
   lsof -nP -iTCP:14567 -sTCP:LISTEN
   ```
3. Si es un proceso que podés cerrar, salilo desde Monitor de actividad o `kill <PID>`.
4. Si necesitás **dos** agentes, en **una** de ellas cambiá el puerto WS en la UI, guardá y reiniciá.

En **Windows** aún no hay esta limpieza automática; si el puerto está ocupado, cerrá la otra instancia o cambiá el puerto.

## Spike decisions (Fase 0)

- **PDF rendering:** not bundled in the agent. Jobs are **already PDF files**; macOS uses `lp`, Windows uses `ShellExecuteW` + `printto` to hand the file to the system spooler. A future PDFium (or similar) crate would only be needed for rasterization or server-side rendering, not for the MVP queue.
- **TLS / WSS:** self-signed cert via `rcgen`, persisted as DER; `rustls` + `tokio-rustls` for **WSS** on a second port. Trust the cert in the OS / browser when using HTTPS PWAs (mixed content: use **WSS**).
- **OS abstraction:** `platform` module (list + print) instead of a formal trait keeps the MVP small; split into a `PlatformPrinter` trait later if you add Linux.

## Dev

```bash
cd print-service
npm install   # requerido: @tauri-apps/cli + binario nativo (p. ej. darwin-arm64)
npm run tauri:dev
```

Si moviste o renombraste la carpeta del proyecto y aparece un error tipo `failed to read plugin permissions` con una ruta que ya no existe, borrá el caché de Cargo en esta app y volvé a compilar:

```bash
rm -rf src-tauri/target
npm run tauri:dev
```

## Enterprise / IT (M4)

- **Silent install (Windows):** use the generated `.msi` / NSIS bundle from `npm run tauri:build` with vendor-documented silent flags (e.g. `msiexec /i ... /qn` where supported).
- **Code signing & notarization:** follow Tauri + Apple/Microsoft docs; not automated in this repo.

## Metrics

The agent exposes `jobsCompletedTotal` via the `health` WebSocket action and the `get_metrics` Tauri command (successful jobs only).
