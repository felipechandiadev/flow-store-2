# KaiPrinters (Tauri)

Agente local de impresión para las PWAs KaiStore: WebSocket en `127.0.0.1`, SQLite para ajustes y mapeo de impresoras, **WSS** opcional con certificado autofirmado en el directorio de datos de la app.

Protocolo y comportamiento: [docs/print_service_app_developer_guide_v2.md](../docs/print_service_app_developer_guide_v2.md).

**Desarrollador:** Felipe Chandía Castillo

## Iconos de la app (macOS / Windows)

El logo maestro está en `pwa-admin/public/logo.png`. Para KaiPrinters:

```bash
npm run generate-icons
```

Eso copia el logo a `assets/logo.png`, genera `assets/logo-square.png` y produce `src-tauri/icons/` (`icon.icns`, `icon.ico`, PNGs de Windows). Se ejecuta automáticamente antes de `npm run tauri:build`.

## Valores por defecto

| Ajuste | Valor |
|--------|--------|
| Puerto WS | **14567** |
| Puerto WSS | **14568** |
| Base de datos | `%app_data%/print_service.sqlite3` |
| Certificado TLS | `%app_data%/agent-tls-cert.der`, `agent-tls-key.der` |

Desactivá WSS con el ajuste SQLite `wss_enabled` = `false` (requiere reiniciar el agente).

**Cierre de la ventana principal:** la ventana se oculta; el servicio sigue en la bandeja del sistema. Para salir por completo, usá «Salir» en el menú de la bandeja (macOS) o el equivalente en tu SO.

Cambiar `listen_port` / `wss_listen_port` vía `set_config` solo actualiza SQLite; **reiniciá el agente** para que los sockets vuelvan a enlazar.

## Puerto WS ocupado (`Address already in use` / os error 48)

En **macOS/Linux**, al iniciar se intenta liberar los puertos WS/WSS: se buscan procesos en `LISTEN` en esos puertos cuya línea de comando parezca este binario (`kai-printers`, `KaiPrinters`, etc.) y se les envía **SIGTERM** antes del `bind`.

Si el error persiste:

1. **Otra copia de KaiPrinters** que no coincida con el filtro. Cerrá la de la bandeja o el otro terminal.
2. Ver quién usa el puerto (macOS):
   ```bash
   lsof -nP -iTCP:14567 -sTCP:LISTEN
   ```
3. Si es un proceso que podés cerrar, salilo desde Monitor de actividad o `kill <PID>`.
