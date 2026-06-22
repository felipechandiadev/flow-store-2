# Print Service App — Guía de Desarrollo para Servicio Local de Impresión con Tauri

## 1. Resumen del proyecto

**Nombre del proyecto (carpeta / crate):** `print-service`

Alternativas válidas:

- `printer-service-app`
- `print-bridge`
- `local-print-service`

**Recomendación:** usar `print-service` porque describe claramente su función y escala bien a futuro.

---

# 2. Objetivo del sistema

Desarrollar una aplicación de escritorio liviana basada en **Tauri + Rust** que funcione como **servicio local de impresión**, permitiendo que una **PWA/Web App** se comunique con ella mediante **WebSocket** para:

- imprimir documentos PDF silenciosamente,
- imprimir tickets (ESC/POS opcional),
- administrar múltiples impresoras por propósito,
- almacenar configuración localmente,
- ejecutarse en segundo plano,
- ofrecer interfaz de configuración desde bandeja del sistema.

---

# 3. Arquitectura general

```text
┌────────────────────────────┐
│       PWA / Web App        │
│  (Chrome / navegador)      │
└──────────────┬─────────────┘
               │ WebSocket
               ▼
┌────────────────────────────┐
│     Print Service App      │
│        (Tauri/Rust)        │
│                            │
│ - WebSocket server         │
│ - Print dispatcher         │
│ - Printer manager          │
│ - Queue manager            │
│ - SQLite config            │
└──────────────┬─────────────┘
               │
       ┌───────┴─────────┐
       ▼                 ▼
  SQLite DB         Sistema de impresión
                     Windows/macOS/Linux
```

---

# 4. Stack tecnológico

## Core

- Tauri 2.x
- Rust stable
- Tokio
- tokio-tungstenite (WebSocket)
- serde / serde\_json
- rusqlite

## Frontend interno (configuración)

- React + Vite
- Tailwind (opcional)

## Plugins Tauri

- system tray
- autostart
- store
- dialog
- shell

---

# 5. Funcionalidades requeridas

## 5.1 Servicio residente

Debe ejecutarse en segundo plano.

Windows:

- visible en bandeja del sistema.

macOS:

- visible en barra superior.

Funciones del menú:

- abrir configuración
- reiniciar servicio
- ver logs
- salir

---

## 5.2 Comunicación WebSocket

Puerto sugerido:

`ws://localhost:14567`

### Mensaje ejemplo desde la PWA

```json
{
  "action": "print",
  "purpose": "documents",
  "type": "pdf",
  "payload": "https://app.cl/doc.pdf"
}
```

### Respuesta

```json
{
  "status": "queued",
  "jobId": "abc123"
}
```

Estados posibles:

- queued
- printing
- done
- error

---

## 5.3 Seguridad

Agregar token:

```text
ws://localhost:14567?token=YOUR_TOKEN
```

Validar token en backend.

Objetivo: impedir acceso de sitios externos.

---

# 6. Base de datos SQLite

Archivo:

`~/AppData/print-service/config.db`

Tabla principal:

```sql
CREATE TABLE printers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  system_name TEXT,
  purpose TEXT,
  is_default INTEGER,
  paper_size TEXT,
  copies INTEGER,
  enabled INTEGER
);
```

Valores posibles de `purpose`:

- documents
- tickets
- labels
- reports

Ejemplo:

| purpose   | printer      |
| --------- | ------------ |
| documents | HP LaserJet  |
| tickets   | Epson TM-T20 |

---

# 7. Flujo de impresión

## documentos

1. PWA envía solicitud.
2. servicio recibe.
3. busca impresora asociada a `documents`.
4. descarga/renderiza PDF.
5. imprime silenciosamente.
6. responde estado.

---

## tickets

1. PWA envía payload ESC/POS o HTML.
2. busca impresora `tickets`.
3. imprime.

---

# 8. Motor de impresión

## Windows

Usar API nativa o comando del sistema.

Opciones:

- windows-rs
- SumatraPDF CLI para PDF (alternativa)

## macOS

usar `lp`

Ejemplo:

```bash
lp archivo.pdf
```

## Linux

usar CUPS (`lp`)

---

# 9. UI de configuración

Pantallas:

## Dashboard

- estado del servicio
- versión
- impresoras detectadas

## Gestión de impresoras

- listar impresoras del sistema
- asignar propósito
- elegir predeterminada
- prueba de impresión

## Logs

- historial de trabajos
- errores

## Configuración

- token
- puerto websocket
- autostart

---

# 10. Descubrimiento de impresoras

Al iniciar:

- leer impresoras del sistema
- sincronizar con SQLite
- marcar nuevas
- mantener asignaciones existentes

Actualizar manualmente desde UI:

"Actualizar impresoras"

---

# 11. Cola de impresión

Implementar queue manager:

```text
job -> queue -> printer -> status
```

Evitar:

- doble impresión
- colisiones
- saturación

Sugerido: Tokio mpsc channel.

---

# 12. Inicio automático

Instalar plugin autostart.

Comportamiento:

- inicia con sistema operativo
- no abre ventana principal
- solo tray icon

---

# 13. Estructura del proyecto

```text
print-service/
 ├── src-tauri/
 │   ├── src/
 │   │   ├── main.rs
 │   │   ├── websocket.rs
 │   │   ├── printer.rs
 │   │   ├── queue.rs
 │   │   ├── db.rs
 │   │   └── tray.rs
 │   └── tauri.conf.json
 │
 ├── src/
 │   ├── pages/
 │   ├── components/
 │   └── App.tsx
 │
 └── README.md
```

---

# 14. Fases de desarrollo

## Fase 1 MVP

- Tauri base
- tray icon
- websocket
- impresión PDF simple
- SQLite básica

## Fase 2

- UI configuración
- múltiples impresoras
- propósitos
- logs

## Fase 3

- tickets ESC/POS
- cola avanzada
- reconexión automática

## Fase 4

- actualizaciones automáticas
- firma instalador

---

# 15. Instalación esperada

Usuario instala:

`PrintServiceAppSetup.exe`

Resultado:

- inicia automáticamente
- aparece en tray
- abre config al primer inicio
- detecta impresoras
- genera token

La PWA conecta automáticamente.

---

# 16. Recomendación final

Construir este proyecto como **Tauri service app** es la mejor arquitectura porque:

- liviano (\~10 MB)
- multiplataforma
- profesional
- seguro
- extensible
- desacopla impresión de la PWA

Este diseño permite que cualquier futura aplicación web municipal pueda reutilizar el mismo servicio local de impresión.

