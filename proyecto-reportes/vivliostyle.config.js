export default {
  title: "Mi Reporte Profesional",
  author: "Tu Organización",
  language: "es",
  size: "letter",
  theme: ["content/styles/main.css"],
  entry: [
    "content/01-portada.html",
    "content/02-tabla-de-contenidos.html",
    "content/03-seccion-1-introduccion.html",
    "content/04-seccion-2-mercado.html",
    "content/05-seccion-3-flowstore.html",
    "content/06-seccion-4-implementacion.html",
    "content/07-seccion-5-servicios.html",
    "content/08-seccion-6-cotizacion.html",
    "content/09-seccion-7-conclusiones.html",
    "content/10-seccion-8-glosario.html",
    "content/11-anexos.html",
    "content/12-contraportada.html",
  ],
  output: [
    "./output.pdf",
    {
      path: "./book",
      format: "webpub",
    },
  ],
  workspaceDir: ".vivliostyle",
  copyAsset: {
    includes: ["public/**/*", "src/**/*"],
  },
  viewerParam: "spread=true",
};
