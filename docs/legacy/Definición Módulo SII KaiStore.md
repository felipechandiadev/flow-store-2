# **Diseño e Implementación del Módulo de Facturación Electrónica (SII) para KaiStore**

## **1\. Marco legal y regulatorio (Chile)**

### **1.1 Normativa aplicable a la emisión de Documentos Tributarios Electrónicos (DTE)**

La emisión de Documentos Tributarios Electrónicos (DTE) en Chile está estrictamente regulada por un conjunto de leyes y resoluciones exentas emitidas por el Servicio de Impuestos Internos (SII). El pilar fundamental de este ecosistema es la Ley N° 20.727 de 2014, la cual estableció la obligatoriedad del uso de la factura electrónica, junto con otros documentos como liquidaciones factura, notas de crédito, notas de débito y guías de despacho.1 Posteriormente, la Ley N° 21.210 de Modernización Tributaria introdujo la obligatoriedad de emitir boletas de ventas y servicios en formato electrónico, lo cual fue normado de manera específica mediante la Resolución Exenta SII N° 74 de 2020\.2  
Esta resolución definió los requisitos tecnológicos para la emisión de boletas electrónicas, la obligatoriedad de desglosar el Impuesto al Valor Agregado (IVA) en el comprobante entregado al consumidor y el envío del Reporte de Consumo de Folios (RCO).2 Asimismo, el traslado de mercancías se rige por la Resolución Exenta SII N° 154 de 2025, la cual actualiza las especificaciones técnicas obligatorias para las Guías de Despacho Electrónicas, exigiendo una mayor rigurosidad en los datos de patentes de vehículos, RUT del transportista y direcciones de despacho bajo apercibimiento de multas graves.3

### **1.2 Obligación de facturar electrónicamente**

La obligación de constituirse como emisor electrónico recae sobre todos los contribuyentes que realicen operaciones comerciales de venta de bienes o prestación de servicios gravadas con los impuestos de la Ley sobre Impuesto a las Ventas y Servicios (Decreto Ley N° 825).1 Toda persona natural o jurídica que inicie actividades en Primera Categoría ante el SII está obligada a emitir DTE.1  
Las empresas acogidas al Régimen Pro Pyme General o Pro Pyme Transparente (establecidos en el Artículo 14 D de la Ley de Impuesto a la Renta) están igualmente obligadas a la emisión de DTE, beneficiándose de la simplificación de registros que el SII ofrece a través del Registro de Compras y Ventas (RCV).3 Las excepciones a la facturación electrónica son extremadamente limitadas y de carácter geográfico, aplicando únicamente a contribuyentes que desarrollen su actividad económica en lugares declarados sin conectividad a internet por el SII, o zonas bajo decretos de catástrofe, lo cual requiere una resolución aprobatoria expresa de la Dirección Regional correspondiente \`\`.

### **1.3 Tipos de documentos tributarios electrónicos (Códigos SII)**

El Servicio de Impuestos Internos de Chile clasifica cada transacción comercial mediante códigos estandarizados obligatorios para la estructura del XML del DTE y su representación gráfica:

| Código SII | Documento Tributario Electrónico | Uso Típico en POS (pwa-pos) | Uso Típico en E-commerce (pwa-eshop) |
| :---- | :---- | :---- | :---- |
| **33** | Factura Electrónica 5 | Ventas mayoristas o corporativas (B2B) en mesón donde el comprador exige derecho a Crédito Fiscal de IVA.1 | Checkout web corporativo donde se solicita RUT de empresa, Razón Social, Giro y Dirección.1 |
| **34** | Factura No Afecta o Exenta Electrónica 5 | Transacciones de servicios puros exentos de IVA o venta de bienes no gravados. | Ventas de libros, software de exportación o capacitaciones exentas. |
| **39** | Boleta Electrónica 3 | Emisión masiva por defecto para ventas a consumidores finales (B2C) en el POS.9 | Emisión automatizada al confirmar el pago de un carro de compra por un usuario final.8 |
| **41** | Boleta No Afecta o Exenta Electrónica 5 | Ventas masivas B2C de productos o servicios que legalmente no devengan el 19% de IVA. | Checkout automatizado de servicios educativos o de salud exentos. |
| **52** | Guía de Despacho Electrónica 3 | Emisión para el traslado de stock de productos vendidos pendientes de retiro o traslados internos de inventario.10 | Despacho logístico de productos físicos desde el centro de distribución al domicilio del comprador final. |
| **56** | Nota de Débito Electrónica 3 | Aplicación de cobros adicionales, intereses o corrección de subvaloraciones en facturas previas.10 | Ajustes de precios post-pago o recargos logísticos de última milla. |
| **61** | Nota de Crédito Electrónica 3 | Devolución de mercaderías compradas, anulaciones de venta o corrección de datos del receptor en el POS.8 | Reembolsos automáticos por quiebres de stock o cancelaciones de transacciones web.8 |

### **1.4 Reglas de correlatividad de folios y anulaciones**

La correlatividad de los folios es estrictamente secuencial y ascendente para cada tipo de DTE por cada RUT emisor. El software de facturación no puede emitir folios duplicados, desordenados cronológicamente o saltarse números de la secuencia autorizada por el SII. La autorización de estos folios se realiza mediante la obtención del archivo de Código de Autorización de Folios (CAF), un archivo XML firmado por el SII que habilita un rango específico (ej. del 1000 al 2000).4  
Respecto a las anulaciones y modificaciones de montos, la ley prohíbe la eliminación física o lógica de un DTE ya emitido y transmitido.9 Cualquier alteración debe realizarse obligatoriamente mediante una Nota de Crédito (61) o Nota de Débito (56).5 Estos documentos de ajuste deben incluir de manera obligatoria en su estructura XML el nodo \<Referencia\>, detallando el tipo de documento de origen (ej. 33), el folio específico, la fecha de emisión del documento referenciado y el código de motivo de referencia (Código 1 para anulación completa, Código 2 para corrección de textos, y Código 3 para devoluciones parciales de mercadería).3  
En el ámbito B2B, rige adicionalmente la Ley N° 19.983 (Ley de Mérito Ejecutivo de la Factura), la cual establece que el receptor de una Factura Electrónica (33) dispone de un plazo fatal de ocho (8) días corridos desde su recepción para aceptar comercialmente o reclamar (rechazar) el contenido del documento.1 Si no se realiza acción alguna dentro de ese periodo, opera la "Aceptación Tácita", convirtiendo a la factura en un título ejecutivo cobrable.1

### **1.5 Libro de ventas/compras electrónico, RCO y cesión de folios CAF**

A partir de la automatización del SII, el Libro de Compras y Ventas físico o digital generado por el software del contribuyente fue reemplazado por el Registro de Compras y Ventas (RCV) centralizado en la plataforma web del SII.3 El SII alimenta este registro de forma automática en tiempo real con cada DTE emitido y recibido.4 No obstante, el software del ERP KaiStore asume la responsabilidad crítica de gestionar el inventario de folios locales (CAF).4  
La obtención de folios CAF es una tarea que el software de facturación puede delegar al contador mediante la automatización de la consulta en el portal del SII o permitir que el administrador cargue manualmente los archivos XML autorizados.4 El software debe controlar de forma rigurosa la correlatividad interna y emitir el Reporte de Consumo de Folios (RCO) de forma diaria para las boletas electrónicas emitidas, consolidando la información de folios utilizados, anulados y exentos en las últimas 24 horas.

### **1.6 Retenciones, IVA, boleta vs. factura: Criterios para elegir documento**

El Impuesto al Valor Agregado (IVA) en Chile corresponde a una tasa general del 19% aplicada sobre el valor neto de los productos o servicios afectos.

* **Boleta Electrónica (39):** Emitida por defecto cuando la contraparte es un consumidor final (persona natural sin inicio de actividades en primera categoría).9 El precio final mostrado al consumidor incluye siempre el IVA. La Resolución 74 de 2020 exige que la representación gráfica de la boleta desglose el valor neto, el IVA y el total, permitiendo al consumidor conocer el impuesto implícito en su compra.2  
* **Factura Electrónica (33):** Emitida exclusivamente a contribuyentes de primera categoría con RUT comercial vigente que necesitan respaldar un gasto comercial y recuperar el IVA de la compra como Crédito Fiscal.1 El sistema debe exigir de forma obligatoria el ingreso del RUT del receptor, Razón Social, Giro Comercial, Dirección, Comuna y Ciudad de origen.1

### **1.7 Multas y riesgos operativos por incumplimiento**

El incumplimiento en la correcta emisión y transmisión de DTE expone a los contribuyentes (tenants de KaiStore) a sanciones severas tipificadas en el Artículo 97 N° 10 del Código Tributario chileno. Las multas por emitir documentos fuera de plazo, omitir la emisión de boletas o facturas, o circular mercancía sin guías de despacho electrónicas válidas varían entre el 50% y el 500% del monto total de la operación, junto con la pena de clausura del establecimiento comercial de hasta 20 días.  
Para KaiStore, como proveedor de software SaaS multi-tenant, los riesgos operativos son de continuidad de servicio: si la plataforma presenta caídas en su motor de timbrado, folios agotados por fallas de sincronización o firmas con certificados digitales expirados, detendrá por completo la operación comercial de sus clientes, haciéndose responsable civilmente por daños de lucro cesante \`\`.

## **2\. Modelos de integración (decisión arquitectónica)**

| Modelo | Descripción | Pros | Contras | Costo estimado | Tiempo go-live | Certificación SII requerida del desarrollador |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **A. Integración directa con SII (SOAP/REST)** | El backend de NestJS implementa directamente el firmado XML con FES, generación de TED, compresión zip, envío SOAP al SII y consulta de estado.14 | Independencia total de terceros; sin costo de intermediación por DTE; control absoluto de la latencia de red. | Curva de aprendizaje técnica empinada; mantenimiento continuo ante cambios de infraestructura del SII.4 | Costo de ingeniería inicial muy elevado (\~$15.000 USD de tiempo de desarrollo). | 6 a 9 meses debido al desarrollo de criptografía nativa y firma XML-DSIG.16 | **Sí.** Se requiere que los desarrolladores de KaiStore sometan su software al riguroso proceso de certificación ante el SII por cada tipo de documento.17 |
| **B. Proveedor intermediario tipo LibreDTE / API REST** | Integración mediante llamadas HTTP REST de NestJS hacia el Web Service de un proveedor SaaS especializado que procesa la firma y transmisión.5 | Abstracción de protocolos SOAP complejos; soporte multi-tenant nativo 18; actualización fiscal delegada en el proveedor. | Costo mensual variable en función del volumen transaccional de DTEs emitidos por los tenants.19 | LibreDTE: Plan de $40.000 CLP/mes por RUT para hasta 2.000 documentos ($15 CLP por DTE extra).19 | 2 a 3 meses. | **No.** Se hereda la certificación técnica del motor del intermediario, requiriendo solo una declaración de cumplimiento por parte de cada cliente.13 |
| **C. Haulmer / OpenFactura / otros facturadores** | Consumo de APIs REST de facturadores empresariales consolidados con APIs modernas de alto rendimiento y webhooks inmediatos.3 | APIs sumamente estables; manejo robusto de webhooks y colas de reintentos; excelente soporte técnico de integración.3 | Menor flexibilidad para la personalización de la representación gráfica del PDF; costo por RUT elevado para comercios pequeños. | Pyme: $360.000 CLP anual más IVA por RUT (emisión ilimitada de documentos).21 | 1 a 2 meses. | **No.** El motor y la responsabilidad de certificación de emisión de software corresponden al proveedor tecnológico.20 |
| **D. Partner white-label (Bsale API, etc.)** | Alianza comercial para revender el módulo de facturación de un ERP líder en el mercado chileno bajo la marca de KaiStore.10 | Respaldo comercial y de marca; soporte especializado de segundo nivel; infraestructura probada a nivel nacional.10 | Cláusula de permanencia mínima obligatoria de 12 meses 10; costos de setup fijos y comisiones por transacciones. | Setup: 0.6 UF. Mensual: 1.5 UF \+ IVA por 3.000 DTE.10 | 2 a 3 meses. | **No.** Totalmente delegado en la homologación del software de Bsale.9 |
| **E. Híbrido: intermediario \+ lógica propia en KaiStore** | Uso del microservicio core de LibreDTE Edición Comunidad autohospedado por KaiStore, consumido internamente por NestJS.23 | Control total del código fuente y los datos; sin cargos recurrentes por DTE de terceros; escalabilidad de infraestructura propia. | Requiere mantener y actualizar servidores Linux dedicados al microservicio de firma PHP/SowerPHP.24 | Costo de servidores (\~$80 USD/mes de AWS EC2/RDS) \+ costo de ingeniería de mantenimiento continuo. | 4 a 5 meses. | **Sí.** Si se modifica el core, se requiere certificar el empaque de software local bajo la marca de KaiStore ante el SII.17 |
| **F. SDK de código fuente de pago único (SimpleAPI)** | Adquisición del código de timbrado e integración en C\#/.NET Standard, desplegando un servicio satélite Dockerizado.13 | Cero costos transaccionales fijos mensuales 13; control absoluto de la propiedad intelectual de la firma y el PDF417.13 | El código fuente está escrito en C\# 13, requiriendo un contenedor satélite que dialogue por gRPC o HTTP local con NestJS. | Pago único de 70 UF \+ IVA por el código fuente sin restricciones del SDK.17 | 3 a 4 meses. | **Sí.** Se requiere pasar por el proceso de certificación en el SII con el acompañamiento directo del proveedor del SDK.17 |

### **Responsabilidades de Certificación y Cumplimiento de SLA**

* **Certificación de Software:** En los modelos directos e híbridos (A, E, F), KaiStore debe registrarse ante el SII como Proveedor Oficial de Software de Facturación Electrónica, asumiendo el costo de certificar técnicamente su monorepo ante la autoridad. En los modelos B, C y D, el software del intermediario ya está certificado, por lo que KaiStore opera bajo una homologación simplificada libre de auditorías de código del SII.10  
* **Responsabilidad Legal:** Ante el Servicio de Impuestos Internos, el responsable legal de toda información transmitida, impuestos devengados u omisión de envío es estrictamente el Emisor (el cliente de KaiStore). El proveedor tecnológico asume una responsabilidad estrictamente civil y contractual por la continuidad del servicio SaaS.  
* **SLA y Soporte Multi-Tenant:** APIs como Haulmer (OpenFactura) o Tupana.ai aseguran un SLA de disponibilidad superior al 99.9%, manejando de forma transparente las caídas periódicas de los servidores del SII.3 Adicionalmente, el diseño multi-tenant exige que la API elegida permita el aprovisionamiento dinámico de subcuentas aisladas vía API, posibilitando cargar las credenciales y folios de cada RUT de forma segura.7

### **Recomendación para KaiStore**

Para el desarrollo del **MVP en un plazo de 3 a 6 meses**, se recomienda encarecidamente adoptar el **Modelo B utilizando la API de SimpleAPI** o el **Modelo C con OpenFactura (Haulmer)**.3 Esta estrategia minimiza la curva de aprendizaje inicial, descarga de forma absoluta el riesgo de certificación ante el SII y permite que el equipo de desarrollo de KaiStore (3 desarrolladores) se concentre en la interfaz del POS (pwa-pos) y e-commerce (pwa-eshop).13  
A **largo plazo (más de 12 meses)**, una vez validado el producto y con más de 100 clientes activos en producción, la decisión de arquitectura más inteligente consiste en migrar hacia el **Modelo F (SimpleAPI On-Premise con adquisición de código fuente)** o **Modelo E (Híbrido autohospedado)**.13 Esto detendrá la fuga de capital por pagos recurrentes de comisiones por DTE, transformando el módulo fiscal en una unidad de negocio sumamente rentable para KaiStore.

## **3\. Proceso de habilitación SII (onboarding por empresa)**

Para habilitar a un nuevo cliente (tenant) en el módulo fiscal de KaiStore, se debe seguir de manera estricta el siguiente runbook operativo:

### **3.1 Postulación como emisor de facturación electrónica**

El representante legal de la empresa cliente debe ingresar al portal oficial del SII (www.sii.cl) autenticándose con su Certificado Digital tributario. La ruta de navegación obligatoria para la inscripción es: **Servicios Online** \-\> **Factura Electrónica** \-\> **Sistema de facturación de mercado** \-\> **Inscripción y postulación**. El SII validará de forma automática que la empresa posea inicio de actividades vigente en Primera Categoría y que no registre situaciones de incumplimiento tributario pendientes.

### **3.2 Obtención e instalación del Certificado Digital (FES)**

El cliente debe adquirir un Certificado Digital de Firma Electrónica Simple (FES) a través de un certificador acreditado (ej. Acepta, e-Sign, Chilefirmas, o SimpleAPI).17 Este certificado se entrega en un archivo criptográfico con extensión .pfx o .p12 que contiene la llave privada del usuario.13

* **Almacenamiento Seguro en KaiStore:** El archivo .pfx cargado desde pwa-admin debe procesarse en el backend NestJS. Se encripta utilizando el estándar simétrico robusto **AES-256-GCM** inyectando un vector de inicialización (IV) único por cada tenant. La contraseña del certificado se cifra bajo el mismo esquema. Las claves de desencriptado se almacenan fuera de la base de datos principal, administradas mediante un servicio de gestión de llaves como AWS KMS o HashiCorp Vault, garantizando protección de nivel bancario contra filtraciones.

### **3.3 Descarga e importación de folios CAF**

El cliente debe ingresar al portal de timbrado del SII y descargar los archivos de Código de Autorización de Folios (CAF) para los documentos requeridos (Códigos 39, 33, 61).4

1. El usuario sube el archivo CAF (XML) en el panel pwa-admin.  
2. El backend NestJS parsea el XML y extrae el nodo \<AUTORIZACION\> que contiene la clave pública RSA del SII y el nodo \<RSASK\> con la clave privada de 512 bits exclusiva para firmar el timbre del DTE.12  
3. Se registran las propiedades del CAF en PostgreSQL, validando que el rango de folios no se solape con folios cargados previamente.  
4. Se configura la regla de alerta: al consumir el 85% de los folios del rango habilitado, el sistema despacha notificaciones automáticas vía push al POS y correo electrónico al administrador indicando: *"Atención: Folios próximos a agotarse. Cargue un nuevo CAF"*.

### **3.4 Set de pruebas y simulación (Certificación)**

En caso de optar por un motor propio o SDK no homologado, el emisor debe ejecutar y aprobar el Set de Pruebas que el SII exige para validar que el software genera la estructura XML y las representaciones impresas de forma correcta.17 El set consiste en la emisión dirigida de un lote de documentos simulados con montos específicos, líneas de descuento global y notas de crédito de anulación.17 Al integrar a KaiStore a través de APIs intermediarias pre-certificadas (como SimpleAPI o Haulmer), este proceso de certificación del software se encuentra simplificado y se reduce a una verificación automática de conectividad en modo sandbox.7

### **3.5 Go-live de producción e inhabilitación mutua**

Una vez superado el set de pruebas, el representante legal firma la solicitud de paso a producción en la plataforma del SII. Es crucial asegurar la **inhabilitación mutua**: si el comercio operaba con otro sistema emisor (como Bsale, Fudo o el facturador gratuito del SII), debe inhabilitar de forma inmediata el uso de folios en el software anterior. Dos sistemas no pueden consumir folios paralelos de un mismo rango CAF de forma simultánea, ya que esto causaría colisiones de folios, rechazos masivos de DTEs y desajustes irreconciliables en el RCV del SII.4

### **3.6 Checklist de documentos para el cliente antes del Día 1**

* \[ \] Inicio de actividades vigente en Primera Categoría ante el SII.  
* \[ \] Adquisición de Certificado Digital simple (FES) vigente.17  
* \[ \] Inscripción aprobada en el Sistema de Facturación de Mercado en sii.cl.  
* \[ \] Descarga de archivos CAF vigentes para Boletas (39), Facturas (33) y Notas de Crédito (61).4  
* \[ \] Configuración de actividades económicas (ACTECO) y sucursales en pwa-admin.3

### **3.7 Experiencia de usuario (UX) para Onboarding en KaiStore**

Para asegurar una baja fricción, KaiStore diseñará un **Wizard de Onboarding 100% Autónomo e Interactivo** en el panel pwa-admin, contrastando positivamente con el servicio asistido y lento de competidores tradicionales:

* **Paso 1: Identidad Fiscal:** El cliente digita el RUT de la empresa. El backend consume la API de consulta de contribuyentes y pre-llena de forma mágica la Razón Social, Dirección Fiscal y Códigos ACTECO vigentes en el SII.3  
* **Paso 2: Firma Digital:** Drag-and-drop para cargar el archivo .pfx o .p12.13 El sistema solicita la clave del certificado, verifica criptográficamente su validez, vigencia y encripta el secreto en tiempo real.13  
* **Paso 3: Carga de CAF:** El usuario arrastra el archivo XML del CAF descargado desde el SII.13 El sistema detecta automáticamente el tipo de DTE, el rango de folios autorizado y valida que coincida exactamente con el RUT de la empresa cargada.12  
* **Paso 4: Test de Timbrado:** Se genera una boleta de prueba de $1 CLP en ambiente sandbox para verificar el correcto funcionamiento del ecosistema.7

Fragmento de código  
flowchart TD  
    A \--\> B  
    B \--\> C\[Postula como Emisor en Mercado en sii.cl\]  
    C \--\> D  
    D \--\> E  
    E \--\> F  
    F \-- Error de Clave/Vigencia \--\> E  
    F \-- Exitoso \--\> G  
    G \--\> H  
    H \--\> I  
    I \--\> J  
    J \--\> K  
    K \--\> L

## **4\. Especificación técnica DTE (ingeniería)**

La correcta codificación de un DTE requiere ajustarse minuciosamente a la documentación técnica oficial del SII:

### **4.1 Formato XML DTE Chile**

La estructura del documento está definida bajo la codificación de caracteres ISO-8859-1 (exigida de forma obligatoria por los parseadores del SII). El namespace de validación es http://www.sii.cl/XMLSchema y se procesa bajo la versión de esquema 1.0.

#### **Estructura jerárquica del XML:**

* \<DTE version="1.0"\>: Nodo raíz del documento.  
  * \<Documento ID="K\_39\_F\_1502"\>: Contenedor del DTE. El atributo ID debe ser una cadena alfanumérica única (típicamente se compone de la inicial de KaiStore, el código de documento y el folio).  
    * \<Encabezado\>: Contiene la metadata de la transacción comercial.  
      * \<IdDoc\>: Identificación del documento (TipoDTE, Folio, FchEmis, FmaPago, FchVenc).3  
      * \<Emisor\>: Información legal de la sucursal emisora (RUTEmisor, RznSoc, GiroEmis, Acteco, DirOrigen, CmnaOrigen).3  
      * \<Receptor\>: Información del comprador (RUTRecep, RznSocRecep, GiroRecep, DirRecep, CmnaRecep).3  
      * \<Totales\>: Consolidación numérica financiera (MntNeto, MntExe, IVA, MntTotal).3  
    * \<Detalle\>: Colección de nodos que detallan cada artículo comercializado.  
      * \<NroLinDet\>: Correlativo numérico secuencial de la línea de detalle.3  
      * \<NmbItem\>: Nombre comercial exacto del artículo.3  
      * \<QtyItem\>: Cantidad comercializada con soporte de hasta 6 decimales.3  
      * \<PrcItem\>: Precio unitario neto del artículo.3  
      * \<MontoItem\>: Valor final de la línea calculado como Neto \* Cantidad.3  
    * \<Referencia\>: Nodo obligatorio para Notas de Crédito (61) y Notas de Débito (56) que detalla el documento original de referencia.3  
    * \<TED version="1.0"\>: Timbre Electrónico DTE estructurado.12  
  * \<Signature\>: Nodo de firma digital basado en el estándar XML-DSIG de la W3C, calculado sobre el nodo \<Documento\> utilizando la llave privada del certificado digital.16

### **4.2 Proceso de timbrado y firma del TED (PDF417)**

El Timbre Electrónico DTE (TED) otorga validez jurídica y de autenticidad a la representación impresa.12

1. **Construcción del nodo \<DD\> (Datos del Documento):** Contiene el RUT del Emisor, RUT del Receptor, Tipo de Documento, Folio, Fecha, Monto Total, Nombre abreviado del primer ítem vendido, el nodo completo del archivo CAF (\<CAF\>) y la fecha y hora de timbrado (\<TSTAMP\>).12  
2. **Firma del TED (FRMT):** Se extrae la clave privada RSA de 512 bits provista en el CAF (\<RSASK\>).12 Se calcula el hash SHA-1 del bloque de texto limpio del nodo \<DD\> y se firma con dicha clave privada RSA.12 El valor binario resultante se codifica en Base64 y se inyecta en la etiqueta \<FRMT algoritmo="SHA1withRSA"\>.12  
3. **Firma XML-DSIG:** La firma completa del documento DTE se realiza utilizando el certificado digital simple (FES).16 Se realiza la canonicalización (C14N) del nodo \<Documento\> y se calcula su firma con la clave privada de 1024 o 2048 bits del FES.16  
4. **Generación de la representación del código PDF417:** La cadena XML completa del nodo \<TED\> (incluyendo \<DD\> y \<FRMT\>) se procesa mediante una librería de generación de código de barra bidimensional PDF417 en NodeJS (ej. pdf417-generator o similar).29 La imagen resultante se renderiza a alta resolución en el lienzo del ticket de venta o PDF.13

### **4.3 Protocolo de envío al SII**

El envío consolidado de los DTEs se realiza mediante un archivo contenedor XML denominado EnvioDTE (o EnvioBOLETA), el cual agrupa los documentos firmados y es firmado digitalmente en su totalidad bajo el estándar XML-DSIG.16  
El microservicio NestJS debe orquestar la comunicación SOAP con el SII de la siguiente forma:

1. **getSeed:** Consume el endpoint SOAP https://palena.sii.cl/DTEWS/CrSeed.jws?WSDL (o la versión de pruebas maullin.sii.cl) para obtener una cadena semilla aleatoria única.31  
2. **getToken:** El backend firma digitalmente la semilla XML con el certificado digital FES del contribuyente.15 Se consume el endpoint SOAP GetTokenFromSeed.jws enviando la firma de la semilla, recibiendo de vuelta un token de sesión dinámico válido por un lapso máximo de 2 horas.15  
3. **UploadDTE:** Se realiza una petición HTTP POST Multipart/Form-Data enviando el archivo XML de envío comprimido en formato .zip a la ruta de recepción del SII, inyectando el token de sesión obtenido en las cabeceras HTTP de autenticación (cookies).15  
4. **Respuesta TrackID:** El servidor de recepción del SII procesa la cabecera y retorna de forma inmediata un identificador numérico único denominado TrackID.5

### **4.4 Polling de consulta de estado**

La obtención del TrackID solo confirma la recepción física del archivo por parte del SII, no su aprobación tributaria.5 El backend de KaiStore debe programar una rutina de consulta periódica (polling) consumiendo el servicio web SOAP QueryEstUp.jws del SII.14 Se envía el RUT del emisor, el TrackID y el token de sesión activo.14 El SII retornará un XML de respuesta indicando el estado del procesamiento del lote 14:

* **EPR (Envío Procesado):** El documento es aceptado con validez fiscal.14  
* **RCH (Rechazado):** El documento presenta fallas críticas de formato o consistencia de montos.14 Se debe levantar una alerta en el panel de control y bloquear la venta para su corrección.  
* **LDR (Aceptado con reparos):** El documento tiene inconsistencias menores; es válido fiscalmente pero requiere correcciones.14

### **4.5 Generación de PDF y Layout Mínimo Legal**

La representación impresa del DTE debe respetar estrictamente la estructura espacial normada por la Guía Técnica del SII:

* **Recuadro Fiscal Rojo:** Ubicado de forma obligatoria en la esquina superior derecha, con dimensiones mínimas de 8 cm de ancho por 3 cm de alto, encerrado por una línea de color rojo de 1 mm de grosor. En su interior debe imprimirse en letras mayúsculas el RUT del Emisor, el Nombre del Tipo de DTE (ej: "FACTURA ELECTRONICA") y el número de Folio.  
* **Timbre Electrónico DTE (TED):** Renderizado perfecto del código PDF417 en la parte inferior del documento.13 Las dimensiones del timbre no deben ser inferiores a 6 cm de ancho por 3 cm de alto para asegurar que los lectores de barras de los fiscalizadores puedan escanearlo con facilidad.  
* **Leyenda de Resolución:** Inmediatamente debajo del timbre se debe imprimir de forma legible la leyenda: *"Resolución Exenta SII N° de \[Año\] \- Verifique documento en www.sii.cl"*.2

### **4.6 Intercambio B2B de mensajería DTE**

La normativa tributaria exige que al emitirse una Factura Electrónica (33) a otra empresa, se despache de forma automatizada una copia en formato XML firmado al buzón de correo electrónico de intercambio DTE declarado por la empresa compradora ante el SII.5 Este proceso permite la automatización contable cruzada del ecosistema comercial chileno.18

### **4.7 Boleta con vs. sin RUT e Información de Factura**

* **Boleta sin RUT:** Es la transacción estándar en tiendas minoristas. El receptor se identifica de forma anónima con el RUT simplificado 66666666-6.  
* **Boleta con RUT:** Requerido obligatoriamente si el monto total de la venta excede las 135 UF, o a solicitud del cliente final para su registro contable.3 Se debe validar que el RUT sea chileno y cumpla con el algoritmo del dígito verificador módulo 11\.3  
* **Factura Electrónica:** Requiere de manera mandatoria la validación estructural de la existencia del RUT del comprador en la base de datos de contribuyentes vigentes del SII, capturando adicionalmente de forma exacta la Razón Social, Dirección, Comuna de destino y Giro comercial del receptor.3

### **4.8 Mapeo de campos técnicos de KaiStore a DTE**

Para asegurar una implementación de software limpia dentro del monorepo, se establece el siguiente mapeo lógico de datos:

| Atributo del Esquema XML SII | Tipo de Dato | Origen de Datos en KaiStore (PostgreSQL) |
| :---- | :---- | :---- |
| /DTE/Documento/Encabezado/IdDoc/TipoDTE | Integer | transactions.document\_type mapeado a código SII (33, 39, 61, etc.). |
| /DTE/Documento/Encabezado/IdDoc/Folio | Integer | dte\_emissions.folio consumido dinámicamente de dte\_folio\_cafs. |
| /DTE/Documento/Encabezado/IdDoc/FchEmis | Date (YYYY-MM-DD) | transactions.created\_at (convertido a hora local Chile). |
| /DTE/Documento/Encabezado/Emisor/RUTEmisor | String | fiscal\_profiles.rut del tenant de la empresa. |
| /DTE/Documento/Encabezado/Emisor/RznSoc | String | fiscal\_profiles.legal\_name. |
| /DTE/Documento/Encabezado/Emisor/GiroEmis | String | fiscal\_profiles.giro. |
| /DTE/Documento/Encabezado/Receptor/RUTRecep | String | customers.rut o RUT de prueba para boleta genérica.3 |
| /DTE/Documento/Encabezado/Receptor/RznSocRecep | String | customers.legal\_name o "Usuario Anónimo" para boleta genérica.3 |
| /DTE/Documento/Detalle/NmbItem | String | transaction\_lines.product\_name o descripción del artículo. |
| /DTE/Documento/Detalle/QtyItem | Decimal | transaction\_lines.quantity (formateado con hasta 6 decimales).3 |
| /DTE/Documento/Detalle/PrcItem | Decimal | transaction\_lines.unit\_price (valor neto deducido de impuestos).3 |
| /DTE/Documento/Encabezado/Totales/IVA | Integer | transactions.tax\_amount (calculado como Neto \* 0.19).3 |
| /DTE/Documento/Encabezado/Totales/MntTotal | Integer | transactions.total\_amount (monto final de la venta).3 |

## **5\. Diseño de datos y APIs para KaiStore**

El desarrollo del módulo DTE en el backend NestJS con base de datos PostgreSQL requiere de un diseño estructural robusto para garantizar escalabilidad multi-tenant e inmutabilidad contable.

### **5.1 Nuevas entidades de base de datos en PostgreSQL**

Se proponen los esquemas físicos DDL para las tablas del dominio fiscal:

SQL  
\-- Perfil fiscal del contribuyente (Tenant)  
CREATE TABLE fiscal\_profiles (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    company\_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,  
    rut VARCHAR(12) NOT NULL UNIQUE, \-- Formato: 76123456-K  
    legal\_name VARCHAR(255) NOT NULL,  
    giro VARCHAR(255) NOT NULL,  
    acteco\_codes INTEGER NOT NULL, \-- Códigos de actividad económica autorizados  
    address VARCHAR(255) NOT NULL,  
    comuna VARCHAR(100) NOT NULL,  
    city VARCHAR(100) NOT NULL,  
    resolution\_number VARCHAR(50) NOT NULL,  
    resolution\_date DATE NOT NULL,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP  
);

\-- Certificados digitales cifrados  
CREATE TABLE dte\_certificates (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    fiscal\_profile\_id UUID NOT NULL REFERENCES fiscal\_profiles(id) ON DELETE CASCADE,  
    certificate\_pfx\_encrypted TEXT NOT NULL, \-- Base64 cifrado con AES-256-GCM  
    iv VARCHAR(32) NOT NULL, \-- Vector de inicialización único para el descifrado  
    expiration\_date DATE NOT NULL,  
    subject VARCHAR(255) NOT NULL,  
    is\_active BOOLEAN DEFAULT TRUE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP  
);

\-- Gestión transaccional de folios CAF  
CREATE TABLE dte\_folio\_cafs (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    fiscal\_profile\_id UUID NOT NULL REFERENCES fiscal\_profiles(id) ON DELETE CASCADE,  
    document\_type INTEGER NOT NULL, \-- Código SII (33, 39, 52, 61, etc.)  
    start\_folio INTEGER NOT NULL,  
    end\_folio INTEGER NOT NULL,  
    next\_folio\_to\_use INTEGER NOT NULL,  
    caf\_xml\_content TEXT NOT NULL, \-- Resguardo íntegro del XML provisto por el SII  
    is\_exhausted BOOLEAN DEFAULT FALSE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP,  
    CONSTRAINT chk\_folio\_limits CHECK (end\_folio \>= start\_folio),  
    CONSTRAINT chk\_next\_folio CHECK (next\_folio\_to\_use \>= start\_folio AND next\_folio\_to\_use \<= end\_folio \+ 1)  
);

\-- Emisión de DTEs y estado de cara al SII  
CREATE TABLE dte\_emissions (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    transaction\_id UUID UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,  
    fiscal\_profile\_id UUID NOT NULL REFERENCES fiscal\_profiles(id) ON DELETE RESTRICT,  
    document\_type INTEGER NOT NULL,  
    folio INTEGER NOT NULL,  
    track\_id VARCHAR(100), \-- Identificador de recepción SOAP del SII  
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING\_SII', \-- PENDING\_SII, ACCEPTED, REJECTED, ACCEPTED\_WITH\_WARNINGS  
    sii\_xml\_sent TEXT, \-- XML firmado final enviado al SII  
    sii\_response\_payload JSONB, \-- Logs de errores o glosas de reparos del SII  
    pdf\_url VARCHAR(512), \-- URL pública del PDF de impresión en S3  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP,  
    UNIQUE (fiscal\_profile\_id, document\_type, folio)  
);

\-- Auditoría de intentos de timbrado y comunicación  
CREATE TABLE dte\_emission\_attempts (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    dte\_emission\_id UUID NOT NULL REFERENCES dte\_emissions(id) ON DELETE CASCADE,  
    attempt\_number INTEGER NOT NULL,  
    request\_payload JSONB,  
    response\_payload JSONB,  
    http\_status\_code INTEGER,  
    error\_message TEXT,  
    ip\_address VARCHAR(45) NOT NULL, \-- Captura IP del cajero (auditoría obligatoria)  
    user\_id UUID REFERENCES users(id), \-- ID del cajero operador  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP  
);

### **5.2 Estados de la máquina de transición de transacciones**

Las transacciones de ventas comerciales (SALE) en el ERP de KaiStore transitan por los siguientes estados:

* **DRAFT:** Venta iniciada en el POS o carrito web en proceso de selección de productos.  
* **PENDING\_SII:** Pago confirmado y aprobado. Se ha consumido y bloqueado de forma inmediata un número de folio de la tabla dte\_folio\_cafs. El XML firmado se encuentra alojado en la cola asíncrona para su transmisión al SII.  
* **ACCEPTED:** El lote DTE ha sido aceptado con éxito por el SII (EPR).14 El documento adquiere plena validez tributaria.  
* **REJECTED:** El SII rechaza estructuralmente la boleta o factura (RCH).14 Se congela la transacción y se gatilla una alerta de corrección inmediata.  
* **VOIDED:** Venta anulada de manera posterior por la emisión y aceptación tributaria de una Nota de Crédito (61).5

### **5.3 Reemplazo del modelo genérico documentType: 'TICKET'**

El campo genérico documentType: 'TICKET' que no posee relevancia fiscal será evolucionado hacia un enum estructurado que controle la tipología contable del DTE de manera estricta:

TypeScript  
export enum FiscalDocumentType {  
  TICKET\_INTERNO \= 'TICKET\_INTERNO', // Ventas no gravadas / Control interno de inventario  
  BOLETA\_ELECTRONICA \= 'BOLETA\_ELECTRONICA', // Código SII 39  
  BOLETA\_EXENTA \= 'BOLETA\_EXENTA', // Código SII 41  
  FACTURA\_ELECTRONICA \= 'FACTURA\_ELECTRONICA', // Código SII 33  
  FACTURA\_EXENTA \= 'FACTURA\_EXENTA', // Código SII 34  
  NOTA\_CREDITO \= 'NOTA\_CREDITO', // Código SII 61  
  NOTA\_DEBITO \= 'NOTA\_DEBITO', // Código SII 56  
  GUIA\_DESPACHO \= 'GUIA\_DESPACHO' // Código SII 52  
}

### **5.4 Especificación de rutas de la API de Emisión (OpenAPI Style)**

#### **1\. Emitir Documento Fiscal**

* **POST** /api/v1/dte/emit  
* **Request Payload (JSON):**

JSON  
{  
  "transactionId": "9b1deb4d-3b7d-4ac9-9b7c-f123456789ab",  
  "documentType": "FACTURA\_ELECTRONICA",  
  "customerId": "81a97dbd-f38b-4b13-ba14-ef949bb27ef9",  
  "paymentMethod": "TRANSFERENCIA"  
}

* **Response (JSON \- 201 Created):**

JSON  
{  
  "dteEmissionId": "5c1a8bd3-0f7e-4911-8840-06c59b6fe412",  
  "folio": 420,  
  "trackId": "194052",  
  "status": "PENDING\_SII",  
  "pdfUrl": "https://s3.cl-santiago.kaistore.app/dte/invoice-33-420.pdf"  
}

#### **2\. Consultar Estado de Emisión**

* **GET** /api/v1/dte/:dteEmissionId/status  
* **Response (JSON \- 200 OK):**

JSON  
{  
  "dteEmissionId": "5c1a8bd3-0f7e-4911-8840-06c59b6fe412",  
  "status": "ACCEPTED",  
  "siiCode": "EPR",  
  "glosa": "Envio procesado correctamente sin reparos",  
  "updatedAt": "2026-05-31T09:15:30Z"  
}

### **5.5 Eventos asíncronos y arquitectura de colas (NestJS \+ BullMQ)**

La firma XML y la comunicación SOAP externa con el SII son operaciones propensas a altas latencias y fallas de conexión de red.4 No pueden ejecutarse de forma sincrónica en el hilo principal de la transacción del POS.

* **Cola de Emisión (BullMQ / Redis):** Al confirmarse un pago, NestJS genera la venta en PostgreSQL, cambia su estado a PENDING\_SII, consume un folio de forma inmediata y deposita un Job con la metadata de la venta en la cola asíncrona de Redis.  
* **Workers dedicados:** El worker de NestJS extrae el Job, lee las llaves criptográficas del tenant, genera el XML DTE estructurado, realiza la firma digital, consume la API del intermediario (SimpleAPI o Haulmer) y guarda el TrackID y la URL del PDF del timbre.3  
* **Cola de Consultas (Polling Worker):** Un proceso de fondo programado mediante cron consulta cada 5 minutos el estado de procesamiento en el SII para todos los documentos marcados en estado PENDING\_SII, actualizando de forma definitiva a ACCEPTED o REJECTED.14

### **5.6 Idempotencia y concurrencia ante la asignación de folios**

En un POS presencial multi-caja con altos flujos de transacciones, existe el riesgo crítico de colisión y duplicación de folios tributarios.

* **Mecanismo de Bloqueo Pesimista (FOR UPDATE):** La base de datos PostgreSQL debe bloquear la fila del CAF correspondiente al tenant y tipo de documento durante la transacción de asignación del folio:

SQL  
BEGIN;  
SELECT next\_folio\_to\_use   
FROM dte\_folio\_cafs   
WHERE fiscal\_profile\_id \= 'tenant\_fiscal\_profile\_id'   
  AND document\_type \= 39   
  AND is\_exhausted \= FALSE   
FOR UPDATE; \-- Bloquea la fila de forma estricta hasta completar la transacción

\-- El backend asigna el folio obtenido a la venta actual, y actualiza correlativos:  
UPDATE dte\_folio\_cafs   
SET next\_folio\_to\_use \= next\_folio\_to\_use \+ 1,  
    is\_exhausted \= CASE WHEN next\_folio\_to\_use \+ 1 \> end\_folio THEN TRUE ELSE FALSE END,  
    updated\_at \= CURRENT\_TIMESTAMP  
WHERE id \= 'caf\_id\_uuid';  
COMMIT;

### **5.7 Auditoría fiscal rigurosa**

Para cumplir con los estándares de control interno que diferencian a KaiStore de competidores básicos (como Fudo, que no audita de forma estricta el origen de la emisión), se obliga a capturar el ID del usuario cajero activo, la dirección IP física del terminal POS, la marca de tiempo exacta de la firma y el hash SHA-256 del XML final enviado en cada intento de timbrado de la tabla dte\_emission\_attempts.

### **5.8 Integración con el flujo contable existente**

El motor de contabilidad del ERP se rige por el evento TransactionCreatedEvent.

* **Regla de Contabilización:** Se establece como supuesto que los asientos contables de reconocimiento de ingresos, costo de ventas e IVA débito fiscal deben generarse de forma inmediata una vez que el documento es timbrado localmente y pasa al estado \`PENDING\_SII\`, dado que el folio tributario ya ha sido irrevocablemente impreso y entregado al consumidor final. Si el documento recibe posteriormente un rechazo estructural por parte del SII (\`REJECTED\`), el motor contable generará de manera automática un asiento de reversa o ajuste mediante un evento contable específico.

## **6\. Integración por canal**

El monorepo de KaiStore (flow-store-2) requiere de una integración específica por cada una de sus aplicaciones cliente:

### **6.1 Canal POS Presencial (pwa-pos)**

* **Gatillo de Emisión:** La asignación de folios e impresión del ticket térmico se gatilla inmediatamente al presionar el botón "Confirmar Pago" (Efectivo o Tarjeta).  
* **Modo de Contingencia Offline:** Ante la pérdida total de conectividad a internet en el local físico, el POS no debe detener las ventas. El sistema pasará automáticamente a modo "Boleta de Contingencia" de la siguiente forma:  
  1. Se emite de forma temporal un ticket interno (TICKET\_INTERNO) no tributario para el cliente presencial.  
  2. La transacción se almacena de forma local cifrada en la base de datos IndexedDB del navegador PWA.  
  3. Al restablecerse la conexión de datos, el POS sincroniza en lote las transacciones diferidas con el backend NestJS para su posterior timbrado real de Boleta Electrónica y transmisión al SII.14

### **6.2 Canal de Comercio Electrónico (pwa-eshop)**

* **Momento de Emisión:** El DTE se emite al instante de recibir la confirmación de pago exitosa (Webhook de Transbank/Webpay, Flow o Mercado Pago).8 No se debe retrasar la emisión hasta la fecha de despacho físico, dado que el devengo del IVA se concreta al momento de percibir los fondos de la compra.  
* **Visualización:** El PDF generado con el timbre TED se presenta al comprador de forma inmediata en la pantalla de confirmación de pedido y se despacha de forma automatizada al correo electrónico del cliente.5

### **6.3 Canal de Administración General (pwa-admin)**

* **Configuración Fiscal:** Interfaz intuitiva para el ingreso de metadatos fiscales de sucursales, carga y validación criptográfica de firmas .pfx y carga de archivos de folios CAF.3  
* **Dashboard Fiscal:** Métricas en tiempo real de consumo de folios, tasas de rechazos del SII y reenvío manual de DTEs rechazados por fallas lógicas subsanables.14

### **6.4 Layout de Impresión Térmica ESC/POS (80mm / 58mm)**

El diseño del ticket para impresoras térmicas debe priorizar la legibilidad y la ligereza de datos de impresión para maximizar la velocidad de la caja de cobros:

* **Encabezado:** Datos de Razón Social, RUT del emisor y datos de contacto de la sucursal.3  
* **Cuerpo de venta:** Lista de artículos detallando cantidades y precios.3  
* **Pie de página:** Recuadro obligatorio del desglose de IVA (IVA, Neto y Total).2  
* **Timbre TED (PDF417):** Inyección de la imagen del código bidimensional centrada, con un tamaño mínimo de 55 mm de ancho.13  
* **Texto Legal:** Leyenda obligatoria de resolución exenta del SII.2

## **7\. Proveedores y APIs (investigación comparativa)**

Para fundamentar la decisión técnica de la integración fiscal de KaiStore, se detalla un análisis comparativo de cinco proveedores con soporte en Chile:

### **7.1 SimpleAPI**

* **URL de la Documentación:** [https://documentacion.simpleapi.cl/](https://documentacion.simpleapi.cl/) 6  
* **Mecanismo de Autenticación:** API Key de cabecera HTTP (ApiKey) o token JWT según versión REST.17  
* **Endpoints Clave:** /api/v1/dte/emitir, /api/v1/folios/consultar, /api/v1/sii/estado.17  
* **Pricing:** Plan Básico de 5 UF anuales (hasta 10.000 consultas/mes).17 Plan Estándar de 9 UF anuales (hasta 50.000 consultas/mes).17 Opción de adquisición del código fuente del motor de firma por 70 UF de pago único.17  
* **Ambiente de Pruebas:** Sandbox de desarrollo gratuito permanente limitado a 500 consultas mensuales.13  
* **Reseller/Partner:** Excelente programa de reventa, permitiendo que KaiStore asocie múltiples RUTs emisores de manera aislada.7  
* **Ejemplo de Request de Emisión JSON (SimpleAPI):**

JSON  
{  
  "Encabezado": {  
    "IdDoc": {  
      "TipoDTE": 33,  
      "Folio": 0,  
      "FchEmis": "2026-05-31"  
    },  
    "Emisor": {  
      "Rut": "76123456-K",  
      "RazonSocial": "KaiStore SpA",  
      "Giro": "Venta minorista de articulos de hogar"  
    },  
    "Receptor": {  
      "Rut": "99555000-8",  
      "RazonSocial": "Comercializadora Pyme SpA",  
      "Giro": "Servicios logisticos"  
    }  
  },  
  "Detalle":  
}

### **7.2 Haulmer / OpenFactura**

* **URL de la Documentación:** [https://docsapi-openfactura.haulmer.com/](https://docsapi-openfactura.haulmer.com/) 3  
* **Mecanismo de Autenticación:** Clave de autenticación API de cabecera (apikey) con opción de firma idempotente (Idempotency-Key).3  
* **Endpoints Clave:** POST /v2/dte/emit, POST /registry/sync-rcv, GET /registry/purchase/{year}/{month}.3  
* **Pricing:** Costo anual por RUT emisor: Pyme $360.000 CLP/año más IVA (ventas menores a 100M CLP).21 Grandes: $1.200.000 CLP/año más IVA.21  
* **Ambiente de Pruebas:** Entorno Sandbox estable con subdominio dedicado para pruebas de certificación y QA (DEV API Haulmer).3  
* **Reseller/Partner:** Programa de integradores y revendedores formales con comisiones transaccionales de hasta un 0.10% para el partner.27  
* **Ejemplo de Request de Emisión JSON (OpenFactura):**

JSON  
{  
  "dte": {  
    "Encabezado": {  
      "IdDoc": {  
        "TipoDTE": 39,  
        "Folio": 0,  
        "FchEmis": "2026-05-31"  
      },  
      "Emisor": {  
        "RUTEmisor": "76123456-K",  
        "RznSoc": "KaiStore SpA",  
        "GiroEmis": "Venta de Software",  
        "Acteco": 620100,  
        "DirOrigen": "Av. Apoquindo 6550",  
        "CmnaOrigen": "Las Condes"  
      },  
      "Receptor": {  
        "RUTRecep": "66666666-6"  
      },  
      "Totales": {  
        "MntTotal": 11900  
      }  
    },  
    "Detalle":  
  }  
}

### **7.3 LibreDTE (Servicio Plus / API)**

* **URL de la Documentación:** [https://libredte.cl/](https://libredte.cl/) 23  
* **Mecanismo de Autenticación:** Token dynamic JWT generado mediante credenciales HTTPS de autenticación básica.5  
* **Endpoints Clave:** POST /emitir, POST /folios/consultar, GET /estado\_dte.5  
* **Pricing:** Desde $40.000 CLP/mes neto por RUT para planes de hasta 2.000 documentos ($15 CLP por DTE extra sobre la cuota).18  
* **Ambiente de Pruebas:** Periodo de evaluación gratuito limitado a 10 días en sandbox de desarrollo.18  
* **Reseller/Partner:** Excelente soporte multi-empresa y administración integrada de sub-RUTs desde un mismo panel.18  
* **Ejemplo de Request de Emisión JSON (LibreDTE):**

JSON  
{  
  "rutEmpresa": "76123456-K",  
  "documento": {  
    "Encabezado": {  
      "IdDoc": { "TipoDTE": 33, "Folio": 0, "FchEmis": "2026-05-31" },  
      "Emisor": { "RUTEmisor": "76123456-K", "RznSoc": "KaiStore SpA", "GiroEmis": "Servicios informaticos" },  
      "Receptor": { "RUTRecep": "99555000-8", "RznSocRecep": "Cliente SpA" }  
    },  
    "Detalle":  
  }  
}

### **7.4 Tupana.ai / BaseAPI**

* **URL de la Documentación:** [https://docs.tupana.ai/](https://www.tupana.ai/api-factura) 7  
* **Mecanismo de Autenticación:** Token Bearer HTTP estándar (Authorization: Bearer \<Token\>).7  
* **Endpoints Clave:** POST /v1/documents/, POST /v1/credentials/, POST /v1/webhooks/.7  
* **Pricing:** Starter $14.990 CLP/mes (hasta 100 emisiones/mes).33 Pro $39.990 CLP/mes (hasta 500 emisiones/mes).33 Business $99.990 CLP/mes (hasta 2.000 emisiones/mes).33  
* **Ambiente de Pruebas:** Sandbox de desarrollo completo con recepción integrada de eventos webhooks de prueba.7  
* **Reseller/Partner:** Soporte nativo multicredencial que permite aislar los certificados de múltiples empresas desde un solo backend.7  
* **Ejemplo de Request de Emisión JSON (Tupana.ai):**

JSON  
{  
  "dte\_type": "33",  
  "document": {  
    "IdDoc": { "FchEmis": "2026-05-31", "FmaPago": 1 },  
    "Emisor": { "RUTEmisor": "76123456-K", "RznSoc": "KaiStore SpA" },  
    "Receptor": { "RUTRecep": "99555000-8", "RznSocRecep": "Empresa Destino SpA" },  
    "Detalle":  
  }  
}

### **7.5 Integración Directa SII (SOAP Oficial)**

* **URL de la Documentación:** [https://www.sii.cl/factura\_electronica/](https://www.sii.cl/factura_electronica/factura_mercado/estado_envio.pdf) 14  
* **Mecanismo de Autenticación:** Intercambio y firma criptográfica de semilla XML para la obtención de Cookies de sesión autorizadas.15  
* **Endpoints Clave:** SOAP QueryEstUp.jws, SOAP CrSeed.jws.14  
* **Pricing:** $0 CLP de costo transaccional (completamente libre de comisiones de terceros).  
* **Ambiente de Pruebas:** Ambiente oficial de pruebas del SII de acceso restringido (maullin.sii.cl).14  
* **Reseller/Partner:** No aplica. Cada software debe pasar por auditorías de código directo del SII.17  
* **Ejemplo de Estructura de Request XML de Autenticación (SII):**

XML  
\<soapenv:Envelope xmlns:xsi\="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd\="http://www.w3.org/2001/XMLSchema" xmlns:soapenv\="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def\="http://DefaultNamespace"\>  
   \<soapenv:Header/\>  
   \<soapenv:Body\>  
      \<def:getSeed soapenv:encodingStyle\="http://schemas.xmlsoap.org/soap/encoding/"/\>  
   \</soapenv:Body\>  
\</soapenv:Envelope\>

### **Matriz de Scoring Comparativo (Escala 1 al 5\)**

| Proveedor | Costo Técnico | Time-to-Market | Soporte Multi-Tenant | Facilidad Mantenimiento | Estabilidad/SLA | Herramientas Reseller | Puntaje Total |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **SimpleAPI** | 5 | 4 | 4 | 4 | 4 | 4 | **25/30** |
| **Haulmer** | 3 | 5 | 5 | 5 | 5 | 4 | **27/30** |
| **LibreDTE** | 4 | 3 | 4 | 3 | 4 | 3 | **21/30** |
| **Tupana.ai** | 4 | 4 | 5 | 5 | 4 | 4 | **26/30** |
| **SII Directo** | 5 | 1 | 1 | 1 | 2 | 1 | **11/30** |

## **8\. Seguridad y cumplimiento**

La administración de activos criptográficos y datos personales en un modelo SaaS exige el cumplimiento estricto de las siguientes directrices de protección lógica:

### **8.1 Almacenamiento seguro de firmas digitales (.pfx / .p12)**

* **Cifrado Criptográfico:** El archivo binario de la firma digital (FES) no debe alojarse en claro en los volúmenes de almacenamiento del servidor. Se cifrará utilizando **AES-256-GCM** de forma obligatoria. La llave de cifrado maestra de la base de datos se almacena en sistemas administrados KMS (AWS Key Management Service o similar).  
* **Aislamiento en Memoria:** El descifrado se ejecuta en memoria RAM únicamente al momento de la firma digital del XML del DTE, liberando la variable inmediatamente después.15 No se almacenan archivos binarios decodificados de forma temporal en disco (/tmp).

### **8.2 Rotación de llaves y control de acceso basado en roles (RBAC)**

* **Permisos en el ERP:** Solo los usuarios con el rol Owner de la cuenta de la empresa en pwa-admin poseen privilegios para subir, rotar o revocar firmas digitales. Los roles menores (Cajeros, Contadores) se encuentran privados de la manipulación de credenciales de seguridad.  
* **Expiración de Firmas:** El backend NestJS controlará de forma diaria las fechas de vencimiento de los certificados en PostgreSQL y levantará avisos visuales automáticos al administrador del comercio 30 días antes del vencimiento técnico de su firma digital.21

### **8.3 Cumplimiento de la Ley N° 19.628 de Protección de Datos Personales**

La recolección de nombres comerciales, RUTs y direcciones físicas de los clientes en KaiStore cumple de forma lícita con una obligación legal de registro fiscal de transacciones comerciales. No obstante, se prohíbe el uso de esta información de carácter personal de ventas para el perfilamiento publicitario sin contar con el consentimiento del usuario final.

### **8.4 Gestión de logs libre de secretos**

Los middlewares de registro de logs de la aplicación de KaiStore (ej: Winston, Morgan o interceptores de NestJS) deben sanitizar de forma obligatoria las trazas de comunicación. Se bloquea de forma explícita el registro de la clave de la firma digital, el token dinámico de sesión del SII o la estructura de representación binaria en Base64 de las llaves del certificado.15

### **8.5 Respaldo y recuperación de Folios (Disaster Recovery)**

Los archivos XML CAF representan activos valiosos para los comercios.4 La base de datos de KaiStore contará con esquemas de respaldo (backups) diarios automatizados con replicación multi-zona de PostgreSQL. En caso de pérdida de datos físicos, los folios asignados pero no transmitidos se restaurarán analizando la bitácora de auditoría inmutable de la tabla dte\_emission\_attempts.

## **9\. Ambientes de prueba y certificación**

Para asegurar el aseguramiento de calidad antes de los lanzamientos a producción, se define la siguiente estrategia de pruebas:

### **9.1 Entorno oficial de pruebas del SII (QA/Sandbox)**

* **SOAP de Validación de Envíos:** Accesible en el servidor de pruebas oficial https://maullin.sii.cl/DTEWS/ para la verificación de lotes XML.14  
* **API REST de Certificación de Boletas:** Consumo del subdominio de validación de esquemas JSON y firmas https://apicert.sii.cl/recursos/v1/.15

### **9.2 Datos de prueba oficiales autorizados por el SII**

* **RUT de Empresa Emisora de Prueba (Tenant QA):** 76.123.456-K  
* **RUT de Receptor Corporativo de Prueba:** 55.555.555-5

### **9.3 Plan de pruebas lógicas unitarias y de integración**

El release del módulo SII requerirá de la aprobación exitosa de los siguientes casos de prueba:

* **QA-TC-01 (Boleta Afecta):** Venta POS exitosa; validación de desglose matemático de IVA e impresión térmica legible del TED.2  
* **QA-TC-02 (Factura B2B):** Validación estructural mandatoria de RUT receptor, Razón Social y Giro comercial.3  
* **QA-TC-03 (Nota de Crédito):** Anulación exitosa de factura previa con inyección correcta de etiqueta \<Referencia\> y motivos del ajuste.3  
* **QA-TC-04 (Control de Concurrencia):** Emisión simultánea de 20 cajeros en POS paralelos; validación de folios consecutivos secuenciales correlativos sin colisiones de red.  
* **QA-TC-05 (Alerta de Folios):** Consumo del 85% del rango CAF activo; disparo automático de notificaciones de escasez en el panel visual.  
* **QA-TC-06 (Firma Expirada):** Intento de timbrado con certificado vencido; bloqueo de la transacción en backend previniendo la transmisión de documentos inválidos.

### **9.4 Criterios de "Definition of Done" (DoD) para la Oleada 1 (POS MVP)**

* \[ \] Cobertura de pruebas automatizadas (Jest) sobre el microservicio de timbrado NestJS superior al 85%.  
* \[ \] Pruebas de integración E2E de simulación completadas y aceptadas por el Sandbox de SimpleAPI o Haulmer.7  
* \[ \] Generación correcta de la representación visual de la boleta de 80mm conteniendo el código de barra PDF417 legible.13  
* \[ \] Bitácora de auditoría registrando de forma inalterable la dirección IP, usuario operador de la caja y firma del DTE en cada intento de timbrado.

## **10\. Roadmap de implementación sugerido**

Se detalla la planificación temporal recomendada para un equipo de 3 desarrolladores de software de KaiStore:

Fase 0: Spike de Firma y Contratación ──► Fase 1: MVP Boleta Electrónica POS (80mm) ──► Fase 2: Facturas, Notas de Crédito  
                                                                                              │  
                                                                                              ▼  
Fase 4: Consolidación Contable y RCV ◄── Fase 3: Checkout Automático e-commerce

### **Fase 0: Spike de Firma y Contratación de Intermediarios (Semanas 1–2)**

* **Actividades:** Contratación del plan Sandbox del socio tecnológico elegido (OpenFactura o SimpleAPI) 17; Spike de NestJS para la codificación y firma criptográfica simétrica AES de llaves digitales.13  
* **Dependencia:** Aprobación del presupuesto de la alianza tecnológica por parte de Finanzas de KaiStore.

### **Fase 1: MVP Boleta Electrónica POS de 80mm (Semanas 3–6)**

* **Actividades:** Modelado y migración física en PostgreSQL de las tablas fiscal\_profiles y dte\_folio\_cafs; desarrollo de interfaces de configuración de sucursales en pwa-admin 3; timbrado e impresión física del timbre TED PDF417 en ticketeras térmicas de caja.13  
* **Dependencia:** Culminación exitosa del Spike de firma criptográfica de la Fase 0\.

### **Fase 2: Facturas, Notas de Crédito y Monitor de Folios (Semanas 7–10)**

* **Actividades:** Formulario de captura y validación estricta de RUT de receptores corporativos en el POS y administración 3; lógica de inyección de Notas de Crédito (61) de referencia para flujos de devoluciones de caja 3; monitor de stock de folios CAF en el panel administrativo.13  
* **Dependencia:** Despliegue estable del core de emisión asíncrona de boletas de la Fase 1\.

### **Fase 3: Checkout Automático en el e-commerce (Semanas 11–13)**

* **Actividades:** Integración del gatillo de facturación automática en el checkout web tras recibir confirmación de pasarelas de pago de Webpay 8; microservicio de despacho de correos con PDF adjunto al cliente final.5  
* **Dependencia:** Correcta recepción y procesamiento de Webhooks lógicos de la Fase 2\.

### **Fase 4: Consolidación Contable y Registro de Compra y Ventas (Semanas 14–16)**

* **Actividades:** Integración de la conciliación contable automatizada con el RCV del SII 3; refinamiento del módulo de contingencia offline del POS; auditorías finales de velocidad y latencias de timbrado de cajas.

### **Matriz de Mitigación de Riesgos Críticos de Negocio**

* **Riesgo 1: Caída de los servidores del SII durante horas de alto flujo de caja.**  
  * *Mitigación:* Diseño de colas persistentes asíncronas de reintentos exponenciales amortiguados (NestJS \+ BullMQ), aislando al POS presencial y permitiendo la impresión de boletas locales pendientes de validación externa definitiva.4  
* **Riesgo 2: Consumo de folios imprevisto (Exhaustion de Folios).**  
  * *Mitigación:* Alertas tempranas visibles en el POS y envío automatizado de correos de advertencia al administrador del comercio al traspasar la barrera del 15% de folios vigentes en base de datos.  
* **Riesgo 3: Filtración de Llaves Privadas de Certificados Digitales.**  
  * *Mitigación:* Cifrado simétrico AES-256-GCM estricto a nivel de base de datos PostgreSQL, administrando de forma externa las llaves maestras en KMS, eliminando de forma absoluta la existencia de binarios en claro en el disco físico.

## **11\. Documentación a entregar al equipo (índice de repo)**

Para asegurar la correcta adopción del módulo SII por parte de los desarrolladores de KaiStore, se crearán los siguientes archivos bajo el directorio /docs/fiscal-sii/ del monorepo:

### **11.1 DTE\_SII\_REGULATORY\_OVERVIEW.md**

* **Propósito:** Manual educativo conceptual sobre la legislación, resoluciones obligatorias, impuestos aplicados y multas del marco tributario chileno de DTEs.1  
* **Audiencia:** Product Owners, Frontend Developers, QA Engineers, Personal de Operaciones Comerciales.  
* **Esquema de Contenido:** Explicación del desglose de IVA (Decreto Ley 825); tabla con los códigos oficiales de DTE del SII 3; plazos legales obligatorios para el acuse de recibo de facturas comerciales 1; multas lógicas por circular de forma ilegal stock sin guías de despacho.3

### **11.2 DTE\_INTEGRATION\_ARCHITECTURE.md**

* **Propósito:** Manual técnico que define el diseño del microservicio de NestJS, el almacenamiento cifrado AES de firmas lógicas y las transiciones en base de datos.  
* **Audiencia:** Software Architects, Backend Developers, DevOps Engineers, Sysadmins.  
* **Esquema de Contenido:** Diagrama de arquitectura física de servicios; diseño detallado del almacenamiento criptográfico de llaves con AWS KMS; configuración de colas asíncronas BullMQ y Redis; mecanismo de concurrencia pesimista (FOR UPDATE) en PostgreSQL.

### **11.3 DTE\_PROVIDER\_COMPARISON.md**

* **Propósito:** Resumen analítico comparativo con el histórico de evaluación de los socios tecnológicos (SimpleAPI, Haulmer, LibreDTE).3  
* **Audiencia:** CTO, Product Managers, Finanzas de KaiStore.  
* **Esquema de Contenido:** Detalle de autenticación, endpoints clave, tarifas transaccionales de planes y límites de cada API analizada 3; matriz de puntuación técnica; justificación del roadmap de migración futura a On-Premises.13

### **11.4 DTE\_ONBOARDING\_RUNBOOK.md**

* **Propósito:** Guía de procedimientos para el equipo de soporte técnico encargado de dar de alta y asesorar de forma comercial a los nuevos comercios.  
* **Audiencia:** Customer Success, Soporte Técnico de KaiStore, Administradores de IT del cliente.  
* **Esquema de Contenido:** Checklist de requerimientos del Día 1; guía visual de navegación en el portal del SII para descarga de CAF y postulación 4; pasos lógicos para inhabilitar facturadores antiguos; validaciones manuales de archivos de certificados .pfx inválidos.

### **11.5 DTE\_API\_SPEC\_KAISTORE.md**

* **Propósito:** Especificación de Swagger/OpenAPI detallada conteniendo las firmas, payloads y respuestas JSON de todos los endpoints fiscales del backend NestJS.  
* **Audiencia:** Frontend Developers, QA Engineers, Desarrolladores de Integraciones de Clientes.  
* **Esquema de Contenido:** Mapeo de campos técnicos de venta del ERP a XML; firma de endpoints de emisión, anulación, descarga y consulta de DTEs; tabla de códigos de error HTTP de KaiStore.

### **11.6 DTE\_QA\_CERTIFICATION\_CHECKLIST.md**

* **Propósito:** Protocolo estricto que rige las pruebas de integración en ambientes de Staging y el paso seguro a producción (Release Check).  
* **Audiencia:** QA Engineers, Release Managers, Desarrolladores del POS.  
* **Esquema de Contenido:** RUTs oficiales de simulación del SII; set de casos de pruebas automatizadas y de estrés físico de cajas; criterios lógicos exigidos de "Definition of Done".

## **12\. Referencias y anexos**

### **Referencias Oficiales**

1. **Servicio de Impuestos Internos (SII) de Chile:** Normativas vigentes sobre la obligatoriedad de la emisión de boleta electrónica.2[https://www.sii.cl/](https://www.sii.cl/) (Consulta: Mayo 2026).  
2. **Documentación de Referencia Técnica \- QueryEstUp SOAP:** Especificación de consulta de lotes de DTE en el portal del SII [https://www.sii.cl/factura\_electronica/factura\_mercado/estado\_envio.pdf](https://www.sii.cl/factura_electronica/factura_mercado/estado_envio.pdf) 14 (Consulta: Mayo 2026).  
3. **API REST de Emisión de OpenFactura (Haulmer):** Guía de endpoints JSON y timbrado electrónico.3[https://docsapi-openfactura.haulmer.com/](https://docsapi-openfactura.haulmer.com/) (Consulta: Mayo 2026).  
4. **SimpleAPI Chile \- SDK y Certificación:** Especificaciones del motor de firmas y timbrado criptográfico.17[https://documentacion.simpleapi.cl/](https://documentacion.simpleapi.cl/) (Consulta: Mayo 2026).  
5. **LibreDTE Web Services:** Estructura de APIs para envío y generación de DTEs.5[https://libredte.cl/](https://libredte.cl/) (Consulta: Mayo 2026).

### **Glosario Técnico Tributario (Chile)**

* **DTE (Documento Tributario Electrónico):** Comprobantes de transacciones de comercio digital estructurados en formato XML firmados criptográficamente.1  
* **CAF (Código de Autorización de Folios):** XML entregado por el SII que valida a un contribuyente a emitir un determinado rango consecutivo de documentos.4  
* **TED (Timbre Electrónico DTE):** Nodo XML firmado con clave privada RSA de 512 bits que resume la transacción y se ilustra en el PDF en código PDF417.12  
* **FES (Firma Electrónica Simple):** Certificado digitalcriptográfico en formato .pfx que identifica de manera legal a un firmante tributario.17  
* **RCV (Registro de Compras y Ventas):** Repositorio fiscal digitalizado en sii.cl que resume los movimientos financieros de un RUT comercial en el mes.3

### **Anexo: Estructura de XML de Boleta Electrónica Mínima Válida**

A continuación, se detalla un ejemplo comentado de estructura XML de Boleta Electrónica (Código 39):

XML  
\<?xml version="1.0" encoding="ISO-8859-1"?\>  
\<DTE version\="1.0" xmlns\="http://www.sii.cl/XMLSchema"\>  
  \<Documento ID\="K\_39\_F\_1502"\>  
    \<Encabezado\>  
      \<IdDoc\>  
        \<TipoDTE\>39\</TipoDTE\> \<Folio\>1502\</Folio\> \<FchEmis\>2026-05-31\</FchEmis\> \<IndServicio\>3\</IndServicio\> \</IdDoc\>  
      \<Emisor\>  
        \<RUTEmisor\>76123456-K\</RUTEmisor\>  
        \<RznSoc\>KaiStore SpA\</RznSoc\>  
        \<GiroEmis\>Servicios informáticos y venta de software\</GiroEmis\>  
        \<Acteco\>620100\</Acteco\> \<DirOrigen\>Av. Apoquindo 6550\</DirOrigen\>  
        \<CmnaOrigen\>Las Condes\</CmnaOrigen\>  
        \<CiudadOrigen\>Santiago\</CiudadOrigen\>  
      \</Emisor\>  
      \<Receptor\>  
        \<RUTRecep\>66666666-6\</RUTRecep\>  
        \<RznSocRecep\>Usuario Anónimo\</RznSocRecep\>  
      \</Receptor\>  
      \<Totales\>  
        \<MntNeto\>10000\</MntNeto\> \<TasaIVA\>19\</TasaIVA\> \<IVA\>1900\</IVA\> \<MntTotal\>11900\</MntTotal\> \</Totales\>  
    \</Encabezado\>  
    \<Detalle\>  
      \<NroLinDet\>1\</NroLinDet\>  
      \<NmbItem\>Lector de Código de Barra POS USB\</NmbItem\>  
      \<QtyItem\>1\</QtyItem\>  
      \<PrcItem\>10000\</PrcItem\>  
      \<MontoItem\>11900\</MontoItem\>  
    \</Detalle\>  
    \<TED version\="1.0"\>  
      \<DD\>  
        \<RE\>76123456-K\</RE\>  
        \<TD\>39\</TD\>  
        \<F\>1502\</F\>  
        \<FE\>2026-05-31\</FE\>  
        \<RR\>66666666-6\</RR\>  
        \<RSR\>Usuario Anónimo\</RSR\>  
        \<MNT\>11900\</MNT\>  
        \<IT1\>Lector de Código de Barra POS USB\</IT1\>  
        \<CAF version\="1.0"\>...\</CAF\>  
        \<TSTAMP\>2026-05-31T09:12:00\</TSTAMP\>  
      \</DD\>  
      \<FRMT algoritmo\="SHA1withRSA"\>MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\</FRMT\>  
    \</TED\>  
  \</Documento\>  
  \<Signature xmlns\="http://www.w3.org/2000/09/xmldsig\#"\>...\</Signature\>  
\</DTE\>

### **Anexo: Tabla de Códigos de Error Frecuentes del SII**

| Código de Error SII | Glosa de Error del SII | Causa Técnica del Problema | Acción Correctiva de KaiStore |
| :---- | :---- | :---- | :---- |
| **1** | Documento Recibido, Datos No Coinciden con Registros.11 | El RUT receptor o giro no existen o están erróneos.11 | Detener la emisión en NestJS; solicitar al administrador corregir la ficha del cliente en pwa-admin. |
| **3** | Documento No Recibido por el SII.11 | Interrupción de red o XML mal estructurado.11 | El worker de BullMQ reintenta de forma automática utilizando exponencial backoff. |
| **4** | Documento No Autorizado.11 | El folio utilizado no se encuentra contemplado en los CAF activos.11 | Desactivar el CAF afectado en dte\_folio\_cafs; alertar al cliente para cargar un rango válido. |
| **9** | Firma del Documento Inválida. | El cálculo del hash criptográfico de la firma XML-DSIG es erróneo. | Verificar la integridad de la llave en dte\_certificates y recalcular el hash de la firma. |
| **12** | Existe Nota de Crédito que Modifica Textos.11 | Intento de anular con Nota de Crédito un DTE que ya fue previamente anulado de forma íntegra.11 | Bloquear en la UI del POS la emisión de devoluciones duplicadas para esa venta. |

## **Resumen Ejecutivo de Onboarding de Facturación Electrónica para KaiStore**

El mercado del software POS e e-commerce en Chile es altamente competitivo. Para que **KaiStore** (monorepo backend NestJS \+ PostgreSQL, frontend PWA) sea considerado una alternativa real para las Pymes comerciales frente a soluciones maduras (como Fudo o Bsale), debe incorporar de forma obligatoria la emisión de Documentos Tributarios Electrónicos (DTE) de manera nativa e integrada en su POS (pwa-pos) y tienda web (pwa-eshop).

### **Diagnóstico de la Infraestructura de Red de Facturación**

El desarrollo nativo de la comunicación con el SII de Chile requiere dominar la criptografía XML-DSIG de firma digital con Certificados Digitales (FES), el timbrado de códigos bidimensionales PDF417 (TED) y protocolos SOAP obsoletos de intercambio de semillas y tokens de sesión.13 Este camino (Integración Directa) representa un tiempo mínimo de desarrollo de 6 a 9 meses para un equipo pequeño, sumado a un proceso de certificación obligatorio ante los fiscalizadores del SII.17  
Para cumplir con el requerimiento de un **Go-Live en un lapso menor a 90 días**, la arquitectura de software de KaiStore debe integrar el **Modelo C utilizando la API de OpenFactura (Haulmer)** o el **Modelo B con SimpleAPI**.3 Estos proveedores tecnológicos ya cuentan con plataformas de timbrado certificadas y robustas con esquemas SLA de disponibilidad superior al 99.9%, permitiendo inyectar un módulo de timbrado de boletas y facturas asíncrono utilizando colas persistentes NestJS \+ BullMQ para aislar al terminal POS de interrupciones externas de red.7  
A nivel de base de datos PostgreSQL, se proponen esquemas físicos DDL preparados para operar con seguridad criptográfica (cifrado de firmas con AES-256-GCM), resguardo seguro de folios CAF, control de concurrencia de cajas multi-terminal y bitácoras rigurosas para auditorías contables inmutables.

## **Recomendaciones y Decisiones Técnicas Clave para el CTO**

* **Integración Inicial vía API de SimpleAPI o Haulmer en la Fase 1:** Delegar el proceso criptográfico pesado de firmas y comunicación SOAP al SII en un partner pre-certificado.13 Esto reduce los plazos de desarrollo a un rango de 30 a 45 días, eliminando de forma absoluta la necesidad de que KaiStore se someta de manera directa a auditorías de software y certificación ante el SII.13  
* **Contratar el Código Fuente del SDK (On-Premise) en la Fase 3:** Una vez consolidada la base de clientes y con más de 100 comercios activos, KaiStore debe realizar el pago único de 70 UF para adquirir el código fuente del SDK de SimpleAPI.17 Esto permitirá migrar hacia un microservicio dockerizado propio montado en la infraestructura local del monorepo, eliminando de raíz las comisiones y costos mensuales transaccionales fijos por cada DTE emitido por los clientes.13  
* **Adopción de Bloqueos Pesimistas (FOR UPDATE) para Asignación de Folios:** Es crítico implementar bloqueos de fila transaccionales estrictos en PostgreSQL sobre la tabla dte\_folio\_cafs durante la venta fiscal en caja. Esto garantiza de manera matemática la integridad secuencial y correlativa, previniendo por completo la generación de folios duplicados o desordenados en locales multi-caja bajo picos de alta demanda de ventas.

#### **Obras citadas**

1. Facturación electrónica: todo lo que necesitas saber | Bsale Chile, fecha de acceso: mayo 31, 2026, [https://www.bsale.cl/article/facturacion-electronica-todo-lo-que-necesitas-saber](https://www.bsale.cl/article/facturacion-electronica-todo-lo-que-necesitas-saber)  
2. Untitled \- Municipalidad de Contulmo, fecha de acceso: mayo 31, 2026, [https://www.contulmo.cl/Transparencia/Compras/2026/Caja%20Chica/Municipal/03-Marzo/DECRETO%20DE%20PAGO%20N%20640.pdf](https://www.contulmo.cl/Transparencia/Compras/2026/Caja%20Chica/Municipal/03-Marzo/DECRETO%20DE%20PAGO%20N%20640.pdf)  
3. Openfactura \- API, fecha de acceso: mayo 31, 2026, [https://docsapi-openfactura.haulmer.com/](https://docsapi-openfactura.haulmer.com/)  
4. API para el SII, Previred y más — API Gateway | API Gateway, fecha de acceso: mayo 31, 2026, [https://www.apigateway.cl/](https://www.apigateway.cl/)  
5. Documentación API SimpleFactura, fecha de acceso: mayo 31, 2026, [https://documentacion.simplefactura.cl/](https://documentacion.simplefactura.cl/)  
6. Simple API, fecha de acceso: mayo 31, 2026, [https://documentacion.simpleapi.cl/](https://documentacion.simpleapi.cl/)  
7. API Facturación Electrónica Chile | API SII Multicredencial — Tupana, fecha de acceso: mayo 31, 2026, [https://www.tupana.ai/api-factura](https://www.tupana.ai/api-factura)  
8. Bsale (Chile) \- Boletas y facturas automáticas, stock y precios sincronizados, fecha de acceso: mayo 31, 2026, [https://apps.shopify.com/bsale](https://apps.shopify.com/bsale)  
9. Sistema de punto de venta para pymes | Bsale Chile, fecha de acceso: mayo 31, 2026, [https://www.bsale.cl/](https://www.bsale.cl/)  
10. Bsale Partner, fecha de acceso: mayo 31, 2026, [https://www.bsale.partners/](https://www.bsale.partners/)  
11. Api Factura Electrónica Chile \- Octava Software, fecha de acceso: mayo 31, 2026, [http://www.appoctava.cl/ws/documentacion-factura-electronica-net/](http://www.appoctava.cl/ws/documentacion-factura-electronica-net/)  
12. odoo-chile/l10n\_cl\_stock\_picking/models/dte.py at master \- GitHub, fecha de acceso: mayo 31, 2026, [https://github.com/intellego-bi/odoo-chile/blob/master/l10n\_cl\_stock\_picking/models/dte.py](https://github.com/intellego-bi/odoo-chile/blob/master/l10n_cl_stock_picking/models/dte.py)  
13. SimpleAPI \- Integración de documentos electrónicos con el SII, fecha de acceso: mayo 31, 2026, [https://www.simpleapi.cl/](https://www.simpleapi.cl/)  
14. Manual de Desarrollador Externo \- SII, fecha de acceso: mayo 31, 2026, [https://www.sii.cl/factura\_electronica/factura\_mercado/estado\_envio.pdf](https://www.sii.cl/factura_electronica/factura_mercado/estado_envio.pdf)  
15. Error API Sii : r/chileIT \- Reddit, fecha de acceso: mayo 31, 2026, [https://www.reddit.com/r/chileIT/comments/1ikpq8v/error\_api\_sii/?tl=en](https://www.reddit.com/r/chileIT/comments/1ikpq8v/error_api_sii/?tl=en)  
16. XML-DSIG and the Chile SII \- Revisited 2020 \- CryptoSys.net, fecha de acceso: mayo 31, 2026, [https://cryptosys.net/pki/xmldsig-ChileSII.html](https://cryptosys.net/pki/xmldsig-ChileSII.html)  
17. Precios \- SimpleAPI, fecha de acceso: mayo 31, 2026, [https://www.simpleapi.cl/Precios](https://www.simpleapi.cl/Precios)  
18. LibreDTE: Inicio, fecha de acceso: mayo 31, 2026, [https://www.libredte.cl/](https://www.libredte.cl/)  
19. Servicio Plus \- LibreDTE, fecha de acceso: mayo 31, 2026, [https://www.libredte.cl/plus](https://www.libredte.cl/plus)  
20. ¿Cómo obtengo la API key de Documentos electrónicos?, fecha de acceso: mayo 31, 2026, [https://help.tuu.cl/temas-de-ayuda/5pKp9Zk7c41cBeKgJEzQRB/%C2%BFc%C3%B3mo-obtengo-la-api-key-de-documentos-electr%C3%B3nicos/eaoQuD5cFHJjyGNVWR9pKX](https://help.tuu.cl/temas-de-ayuda/5pKp9Zk7c41cBeKgJEzQRB/%C2%BFc%C3%B3mo-obtengo-la-api-key-de-documentos-electr%C3%B3nicos/eaoQuD5cFHJjyGNVWR9pKX)  
21. OpenFactura, fecha de acceso: mayo 31, 2026, [https://www.openfactura.cl/](https://www.openfactura.cl/)  
22. Precios | OpenFactura Chile, fecha de acceso: mayo 31, 2026, [https://www.openfactura.cl/factura-electronica/precios/](https://www.openfactura.cl/factura-electronica/precios/)  
23. LibreDTE \- GitHub, fecha de acceso: mayo 31, 2026, [https://github.com/libredte](https://github.com/libredte)  
24. LibreDTE comunidad, alguien ha podido instalarlo y configurarlo con éxito? \- Reddit, fecha de acceso: mayo 31, 2026, [https://www.reddit.com/r/chileIT/comments/1ln14d3/libredte\_comunidad\_alguien\_ha\_podido\_instalarlo\_y/](https://www.reddit.com/r/chileIT/comments/1ln14d3/libredte_comunidad_alguien_ha_podido_instalarlo_y/)  
25. simple api \- SimpleAPI \- Integración con el SII, fecha de acceso: mayo 31, 2026, [https://www.simpleapi.cl/Productos/SimpleAPI](https://www.simpleapi.cl/Productos/SimpleAPI)  
26. Productos \- SimpleAPI, fecha de acceso: mayo 31, 2026, [https://www.simpleapi.cl/Productos](https://www.simpleapi.cl/Productos)  
27. PRECIOS | Haulmer Partners Explora nuestros precios para Reseller, fecha de acceso: mayo 31, 2026, [https://www.haulmer.com/partners/precios](https://www.haulmer.com/partners/precios)  
28. odoo-chile/l10n\_cl\_stock\_picking/models/point\_of\_sale.py at master \- GitHub, fecha de acceso: mayo 31, 2026, [https://github.com/intellego-bi/odoo-chile/blob/master/l10n\_cl\_stock\_picking/models/point\_of\_sale.py](https://github.com/intellego-bi/odoo-chile/blob/master/l10n_cl_stock_picking/models/point_of_sale.py)  
29. pdf417-generator CDN by jsDelivr \- A CDN for npm and GitHub, fecha de acceso: mayo 31, 2026, [https://www.jsdelivr.com/package/npm/pdf417-generator](https://www.jsdelivr.com/package/npm/pdf417-generator)  
30. FacTronica/TimbrePdf417: Generar Timbre Pdf417 \- GitHub, fecha de acceso: mayo 31, 2026, [https://github.com/FacTronica/TimbrePdf417](https://github.com/FacTronica/TimbrePdf417)  
31. Swift palena.sii.cl getSeed SOAP Request \- Chilkat Examples, fecha de acceso: mayo 31, 2026, [http://example-code.com/swift/palena\_sii\_cl\_getSeed.asp](http://example-code.com/swift/palena_sii_cl_getSeed.asp)  
32. Documentación \- SimpleAPI, fecha de acceso: mayo 31, 2026, [https://www.simpleapi.cl/Documentacion](https://www.simpleapi.cl/Documentacion)  
33. Precios API SII Chile · Desde $14.990/mes · Plan Gratis \- BaseAPI, fecha de acceso: mayo 31, 2026, [https://baseapi.cl/precios](https://baseapi.cl/precios)