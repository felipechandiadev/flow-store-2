# Instrucciones: Replicar Proyecto Vite + Vivliostyle (CON CONTENT/ LIMPIO)

## Resumen Ejecutivo

Proyecto generador de **reportes profesionales en HTML y PDF** usando:
- **Vite** para bundling y desarrollo rápido
- **Vivliostyle** para layout y generación de PDF con CSS Paged Media
- **Tailwind CSS** para estilos
- Stack: Node.js + npm

**Estructura final:**
```
tu-proyecto-informe/
├── content/                    # ← LIMPIO (listo para llenar con tus propias páginas)
├── src/                        # Assets y estilos base
├── public/                     # Recursos estáticos
├── .vivliostyle/              # Workspace Vivliostyle (generado automáticamente)
├── dist/                       # Salida de Vite (generado)
├── book/                       # Salida WebPub de Vivliostyle (generado)
├── output.pdf                  # PDF final (generado)
├── package.json
├── vite.config.js
├── vivliostyle.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .gitignore
└── .vivliostyle.rc.json       # (opcional)
```

---

## Paso 1: Crear Estructura de Carpetas

```bash
mkdir -p tu-proyecto-informe
cd tu-proyecto-informe

# Crear carpetas base
mkdir -p content src/assets public .vivliostyle
```

---

## Paso 2: Archivos de Configuración

### **2.1 package.json**

```json
{
  "name": "proyecto-reportes",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build && cp dist/assets/*.css public/styles.css",
    "preview": "vite preview",
    "vivliostyle:preview": "vivliostyle preview",
    "vivliostyle:build": "vivliostyle build"
  },
  "devDependencies": {
    "@vivliostyle/cli": "^9.8.2",
    "@vivliostyle/core": "^2.36.2",
    "autoprefixer": "^10.4.22",
    "postcss": "^8.5.6",
    "vite": "^7.2.4",
    "vivliostyle": "^2019.8.101"
  }
}
```

### **2.2 vite.config.js**

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    postcss: './postcss.config.js'
  }
})
```

### **2.3 vivliostyle.config.js**

```javascript
export default {
  title: 'Mi Reporte Profesional',
  author: 'Tu Organización',
  language: 'es',
  size: 'letter',
  theme: [
    'content/styles/main.css',
  ],
  entry: [
    // 'content/01-portada.html',
    // 'content/02-indice.html',
    // 'content/03-capitulo-1.html',
  ],
  output: [
    './output.pdf',
    {
      path: './book',
      format: 'webpub',
    },
  ],
  workspaceDir: '.vivliostyle',
  copyAsset: {
    includes: [
      'public/**/*',
      'src/**/*'
    ]
  },
  viewerParam: 'spread=true',
};
```

**⚠️ Nota:** Modifica `entry: []` con tus archivos HTML cuando los crees (ver Paso 3).

### **2.4 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./content/**/*.{html,js}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### **2.5 postcss.config.js**

```javascript
export default {
  plugins: {},
}
```

### **2.6 .gitignore**

```
# dependencies
node_modules/
package-lock.json
yarn.lock

# vite
dist/

# vivliostyle
.vivliostyle/
output.pdf
book/

# IDE
.VS_Code
.idea/
*.swp
*.swo
.DS_Store
```

---

## Paso 3: Archivos Base (src/ y public/)

### **3.1 index.html** (raíz del proyecto)

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generador de Reportes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <article>
      <h1>Generador de Reportes - Vivliostyle + Vite</h1>
      
      <section>
        <h2>Cómo Usar</h2>
        <ol>
          <li>Crea archivos HTML en carpeta <code>content/</code></li>
          <li>Actualiza <code>vivliostyle.config.js</code> con tus archivos en <code>entry: []</code></li>
          <li>Ejecuta: <code>npm run vivliostyle:build</code></li>
          <li>Tu PDF estará en <code>output.pdf</code></li>
        </ol>
      </section>

      <section>
        <h2>Scripts Disponibles</h2>
        <ul>
          <li><code>npm run dev</code> - Servidor Vite en desarrollo</li>
          <li><code>npm run build</code> - Build Vite + copiar CSS</li>
          <li><code>npm run vivliostyle:preview</code> - Ver documento en preview</li>
          <li><code>npm run vivliostyle:build</code> - Generar PDF final</li>
        </ul>
      </section>
    </article>
  </body>
</html>
```

### **3.2 src/style.css**

```css
/* ═══════════════════════════════════════════════════════════════ */
/* Global Styles - Vivliostyle + Vite                             */
/* ═══════════════════════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

/* Page Setup */
@page {
  size: letter;
  margin: 18mm 16mm 20mm 16mm;

  @bottom-center {
    content: counter(page);
    font-size: 9pt;
    font-weight: 500;
    color: #64748b;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    letter-spacing: 0.5px;
  }
}

@page :first {
  @bottom-center {
    content: "";
  }
}

/* Global Styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
  color: #1e293b;
  line-height: 1.6;
  font-size: 11pt;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

article {
  max-width: 100%;
}

h1 {
  font-size: 24pt;
  font-weight: 700;
  margin: 0 0 12pt 0;
  color: #0f172a;
}

h2 {
  font-size: 16pt;
  font-weight: 700;
  margin: 16pt 0 8pt 0;
  color: #1e293b;
}

h3 {
  font-size: 13pt;
  font-weight: 600;
  margin: 12pt 0 6pt 0;
  color: #334155;
}

p {
  margin: 0 0 8pt 0;
  text-align: justify;
}

ul, ol {
  margin: 0 0 8pt 0;
  padding-left: 18pt;
}

li {
  margin: 0 0 4pt 0;
}

section {
  margin: 0 0 16pt 0;
  break-inside: avoid;
}

code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 10pt;
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 3px;
  color: #e11d48;
}

pre {
  background: #f1f5f9;
  padding: 12pt;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 9pt;
  line-height: 1.4;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 12pt 0;
}

th, td {
  border: 1px solid #cbd5e1;
  padding: 8pt;
  text-align: left;
}

th {
  background: #f1f5f9;
  font-weight: 600;
  color: #1e293b;
}

/* Page Breaks */
.page-break {
  page-break-after: always;
}

.avoid-break {
  break-inside: avoid;
}
```

### **3.3 public/** (para recursos estáticos)

Crea subfolders si necesitas:
```bash
mkdir -p public/images
```

Coloca aquí:
- Logos, imágenes
- Fuentes custom (si las usas)
- Otros assets

---

## Paso 4: Estructura content/ (LIMPIA)

```bash
mkdir -p content/styles
```

### **4.1 content/styles/main.css** (hoja de estilos para reportes)

```css
/* ═══════════════════════════════════════════════════════════════ */
/* Estilos Personalizados para Reportes                            */
/* ═══════════════════════════════════════════════════════════════ */

/* Importar Tailwind si lo usas */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

:root {
  --color-primary: #3b82f6;
  --color-secondary: #1e40af;
  --color-accent: #f59e0b;
  --color-dark: #1f2937;
  --color-light: #f9fafb;
}

/* Estilos de Portada */
.cover {
  page-break-after: always;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
}

.cover h1 {
  font-size: 36pt;
  margin: 0 0 20pt 0;
}

/* Estilos de Capítulo */
.chapter {
  page-break-before: always;
  page-break-after: avoid;
}

.chapter h2 {
  border-bottom: 3px solid var(--color-primary);
  padding-bottom: 8pt;
}

/* Tabla de Contenidos */
.toc {
  page-break-after: always;
}

.toc ul {
  list-style: none;
  padding: 0;
}

.toc li {
  margin: 6pt 0;
}

.toc a {
  text-decoration: none;
  color: var(--color-primary);
}

/* Notas y Callouts */
.note, .warning, .info {
  padding: 12pt;
  margin: 12pt 0;
  border-left: 4px solid var(--color-primary);
  background: #f0f9ff;
  break-inside: avoid;
}

.warning {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.note strong, .warning strong, .info strong {
  display: block;
  margin-bottom: 4pt;
  color: var(--color-dark);
}
```

---

## Paso 5: Crear Página HTML de Ejemplo

### **5.1 content/01-portada.html**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portada</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <section class="cover">
        <h1>Mi Primer Reporte Profesional</h1>
        <p style="font-size: 14pt; margin: 20pt 0 0 0;">Generado con Vivliostyle + Vite</p>
        <p style="font-size: 12pt; margin-top: 40pt; color: rgba(255,255,255,0.8);">
            Tu Organización<br>
            Marzo 2026
        </p>
    </section>
</body>
</html>
```

### **5.2 content/02-capitulo-1.html**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Capítulo 1</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <section class="chapter">
        <h2>Capítulo 1: Introducción</h2>
        
        <p>
            Este es el contenido de tu primer capítulo. Puedes usar HTML estándar 
            combinado con CSS Paged Media para crear documentos profesionales.
        </p>

        <h3>Sección 1.1</h3>
        <p>Aquí va más contenido...</p>

        <div class="note">
            <strong>Nota Importante:</strong>
            Los estilos CSS se aplican automáticamente para generar el PDF.
        </div>
    </section>
</body>
</html>
```

---

## Paso 6: Actualizar vivliostyle.config.js

Una vez hayas creado tus archivos HTML en `content/`, actualiza el arreglo `entry`:

```javascript
// vivliostyle.config.js
export default {
  title: 'Mi Reporte',
  // ... resto de config ...
  entry: [
    'content/01-portada.html',
    'content/02-capitulo-1.html',
    // Agrega más páginas/capítulos aquí
  ],
  // ... resto ...
};
```

---

## Paso 7: Instalar Dependencias y Ejecutar

```bash
# Instalar dependencias
npm install

# Opción A: Ver preview del documento (antes de generar PDF)
npm run vivliostyle:preview

# Opción B: Generar PDF final
npm run vivliostyle:build

# Opción C: Desarrollo con Vite (para probar cambios en HTML/CSS)
npm run dev
```

### **Salidas generadas:**

- **output.pdf** — Tu PDF final (principal)
- **book/** — Versión Web Publication (EPUB-like)
- **.vivliostyle/** — Workspace interno (ignorar)

---

## Paso 8: Estructura Avanzada (Opcional)

Si quieres organización más sofisticada:

```
content/
├── styles/
│   ├── main.css              # Estilos base para reportes
│   ├── portada.css           # Estilos de portada
│   └── capitulos.css         # Estilos de capítulos
├── data/                      # Datos/fixtures JSON
│   └── config.json            # Metadata del reporte
├── 01-portada.html
├── 02-indice.html
├── 03-resumen-ejecutivo.html
├── 04-capitulo-1.html
├── 05-capitulo-2.html
└── ...
```

---

## Checklist de Inicialización

- ✅ Crear carpetas base (content, src, public, .vivliostyle)
- ✅ Copiar `package.json`
- ✅ Copiar `vite.config.js`
- ✅ Copiar `vivliostyle.config.js` (modificar `entry` según tus pages)
- ✅ Copiar `tailwind.config.js`
- ✅ Copiar `postcss.config.js`
- ✅ Copiar `index.html`
- ✅ Copiar `src/style.css`
- ✅ Crear `.gitignore`
- ✅ Crear `content/styles/main.css`
- ✅ Crear primeros HTML en `content/` (ej: 01-portada.html, 02-capitulo-1.html)
- ✅ Ejecutar `npm install`
- ✅ Ejecutar `npm run vivliostyle:build`

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| PDF vacío | Verifica `entry: []` en vivliostyle.config.js — ¿apuntan a archivos existentes? |
| Estilos no aplican | Comprueba que `<link rel="stylesheet" href="styles/main.css">` esté en cada HTML |
| Error "No such file" | Asegúrate de haber creado carpetas: `mkdir -p content/styles` |
| Fonts no cargan | Usa Google Fonts (vía @import en CSS) o coloca .woff2 en `public/` |
| Page breaks incorrectos | Usa `page-break-before: always;` o `break-inside: avoid;` en CSS |

---

## Próximos Pasos (Personalización)

1. **Agregar tu propio tema:** Modifica `content/styles/main.css` con colores y fuentes
2. **Integrar datos dinámicos:** Usa scripts en `src/main.js` para generar HTMLs (si necesitas)
3. **Multi-idioma:** Crea `content/es/` y `content/en/` con sus propias `entry`
4. **Automatización:** Script para generar HTMLs desde Markdown si lo prefieres

---

**¡ Listo!** Ahora tienes una base limpia y reproducible para generar reportes profesionales.
