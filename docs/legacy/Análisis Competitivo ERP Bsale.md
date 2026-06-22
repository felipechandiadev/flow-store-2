# **El Ecosistema Competitivo de Bsale: Análisis Estratégico, Funcional y Tecnológico para el Diseño de un ERP Alternativo**

## **Posicionamiento Estratégico y Propuesta de Valor en el Mercado Latinoamericano**

El posicionamiento competitivo de Bsale en los mercados de Chile, Perú y México se basa en un enfoque estratégico dirigido a pequeñas y medianas empresas (Pymes) que buscan digitalizar su operación comercial sin la complejidad de un ERP corporativo tradicional.1 Bsale no se define a sí mismo como un ERP integral de back-office, sino como un sistema de ventas con control de inventario y facturación electrónica integrada, diseñado específicamente para optimizar la caja y el flujo de venta directa al cliente final.1 Esta distinción es crítica para un desarrollador de software, ya que Bsale captura al cliente a través de la interfaz de venta (front-office) y delega la contabilidad avanzada, la nómina y los procesos de compras complejos a plataformas externas.3  
La propuesta de valor de la compañía se apoya en tres pilares comerciales atractivos para las Pymes: la ausencia de comisiones sobre las ventas procesadas, la habilitación de usuarios ilimitados en todos sus planes tarifarios y un esquema de arriendo mensual flexible sin contratos forzosos a largo plazo.2 Esta flexibilidad contractual reduce el riesgo financiero de adopción para los microempresarios, quienes pueden dar de baja el servicio cuando lo estimen conveniente.2 Al eliminar el costo por licencia individual, Bsale incentiva la adopción masiva del software dentro de las organizaciones, promoviendo que cada colaborador posea credenciales de acceso propias para asegurar la trazabilidad operativa.4 Este modelo comercial se apoya en un despliegue puramente en la nube (SaaS), compatible con múltiples sistemas operativos, incluyendo iOS, Android y Harmony OS, lo que permite a los tomadores de decisiones monitorear el rendimiento comercial desde dispositivos móviles en tiempo real.1

## **Desglose Funcional: Del Punto de Venta a la Gestión Operativa**

La arquitectura funcional de Bsale está diseñada para resolver con rapidez y simplicidad las transacciones en el punto de venta (POS) y la emisión de Documentos Tributarios Electrónicos (DTE) bajo las normativas del Servicio de Impuestos Internos (SII) en Chile y las entidades tributarias equivalentes en Perú y México.1 La interfaz POS está optimizada para la velocidad de atención física, permitiendo la búsqueda ágil de productos mediante lectores de códigos de barra, palabras clave o códigos SKU.7 Asimismo, el sistema gestiona descuentos automáticos parametrizados por volumen de compra, perfiles de usuario o listas de precios preferenciales, y facilita la creación rápida de fichas de clientes en la misma pantalla de venta para nutrir bases de datos comerciales.7  
El control de caja en Bsale opera bajo un esquema riguroso de turnos, registrando saldos de apertura, ingresos manuales de efectivo y retiros de dinero intermedios.7 Al cierre de cada jornada, el sistema consolida un arqueo detallado que desglosa las distintas formas de pago recibidas, tales como efectivo, cheques, tarjetas bancarias y créditos de la casa, calculando de forma automática los vueltos correspondientes.7 No obstante, el sistema también incorpora funcionalidades complementarias que expanden su alcance operativo:

* **Gestión de Cotizaciones**: El módulo permite elaborar cotizaciones formales en la nube, definir fechas de vencimiento y realizar el seguimiento comercial hasta su conversión final en un documento de venta definitivo.7 Adicionalmente, el sistema admite el ingreso de abonos o anticipos vinculados a estas cotizaciones a través de cualquier medio de pago.7  
* **Gestión de Clientes y Cobranza**: Bsale integra un submódulo de cuentas por cobrar para ventas realizadas bajo la modalidad de crédito a plazo.7 Incluye un calendario interactivo de vencimientos para estimar los flujos de caja futuros y permite registrar pagos parciales y notas de cobranza.7  
* **Sistemas de Fidelización**: La plataforma cuenta con un sistema nativo de acumulación y canje de puntos por compras, permitiendo a las Pymes configurar las tasas de equivalencia y las opciones de canje para incentivar la retención de clientes.7  
* **Devoluciones y Tickets de Cambio**: Al almacenar un historial centralizado de las compras de cada cliente, el POS simplifica el proceso de cambios físicos y devoluciones de productos, automatizando la emisión de las notas de crédito o débito asociadas para mantener la consistencia tributaria.7

## **El Vacío del Back-Office: Las Limitaciones de Inventario y Abastecimiento de Bsale**

Aunque Bsale promociona un "control de inventario minuto a minuto" 1, el análisis de su backend revela que el sistema gestiona el stock de manera meramente transaccional y lineal. El inventario se actualiza automáticamente restando unidades con cada venta en el POS o e-commerce y sumándolas con cada ingreso físico de mercadería.1 Desde la aplicación móvil, los encargados pueden realizar tomas físicas de stock, recepciones de camiones y mermas por consumo interno.10 Sin embargo, la plataforma carece de funcionalidades logísticas complejas, tales como el picking por zonas, la gestión de almacenamiento por altura (WMS avanzado) o la asignación de números de serie para productos de alto valor.  
Una de las debilidades más críticas del inventario de Bsale es la ausencia nativa de campos para registrar números de lote y fechas de vencimiento durante la recepción de mercancías.12 Esta omisión excluye de facto a empresas que operan con productos perecederos, alimentos, cosméticos o insumos médicos, donde el control de caducidad es un requisito legal y operativo indispensable para evitar pérdidas de inventario por obsolescencia.12  
El vacío funcional se acentúa en el área de abastecimiento y relación con proveedores. Bsale no cuenta con un módulo estructurado de compras que gestione órdenes de compra (OC) con flujos de aprobación jerárquicos, cotizaciones comparativas de proveedores o cálculo automático de puntos de reorden basados en la velocidad de venta de los SKU. En su lugar, el sistema ofrece una herramienta simplificada denominada "Factura de Compra".13 Este módulo está diseñado principalmente para resolver un escenario fiscal específico del mercado chileno: la emisión de facturas de compra electrónicas cuando el proveedor es una persona natural o informal (por ejemplo, un agricultor) que no puede emitir facturas de venta por sí mismo.14  
Para utilizar esta funcionalidad, la Pyme debe registrar previamente al proveedor como un "cliente" en el maestro de contactos de Bsale.13 Al generar el documento, el usuario debe calcular y aplicar de forma manual los porcentajes de impuestos a retener y definir si el sistema generará de forma automática las recepciones de stock asociadas a dicha compra.13 Este proceso, aunque útil para el cumplimiento tributario básico, resulta rudimentario para empresas que requieren un control de compras estructurado y automatizado, abriendo un espacio competitivo directo para un ERP alternativo que integre compras y cuentas por pagar de manera profesional.

## **Estructura Tarifaria y el Modelo de Escalabilidad Comercial (Chile e Internacional)**

El modelo de monetización de Bsale es un sistema híbrido que combina la suscripción a planes base con la venta de microservicios y extensiones recurrentes.15 En el mercado de Chile, los valores se cotizan en Unidades de Fomento (UF) para proteger los márgenes de la empresa contra las fluctuaciones inflacionarias locales, cobrándose por mes adelantado.4  
A continuación se presenta la matriz detallada de planes mensuales de Bsale en Chile:

| Plan Comercial | Costo Mensual (UF \+ IVA) | Documentos (DTE) Incluidos | Capacidad de SKU Base | Sucursales Incluidas | Cajas por POS | Características y Canales Admitidos |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Básico** | 1,5 UF 3 | 1.000 3 | Hasta 5.000 3 | 1 Sucursal 3 | Limitadas 4 | Emisión de DTE (boletas, facturas, notas de crédito/débito). Gestión básica de clientes, cobranzas e informes simplificados.3 No incluye POS avanzado ni control de inventarios.3 |
| **Estándar** | 1,9 UF 3 | 1.000 3 | Hasta 5.000 3 | 1 Sucursal 3 | Ilimitadas 2 | Todo lo del plan Básico más módulo de Punto de Venta (POS) avanzado, control de inventario en tiempo real, cierres de caja y compatibilidad con app móvil operativa.7 |
| **Ecommerce** | 1,9 UF 4 | 1.000 18 | Hasta 5.000 18 | 1 Sucursal (Fija) 18 | No aplica | Carro de compras digital con plantillas optimizadas para móviles, cálculo de despachos por peso/volumen, control de inventario sincronizado y pasarelas de pago online.18 |
| **Full / Omnicanal** | 2,9 UF 3 | 2.000 3 | Hasta 5.000 3 | 1 Sucursal 3 | Ilimitadas 2 | Sincronización omnicanal total. Integra ventas físicas (POS) y digitales (E-commerce) bajo un inventario consolidado y reportes analíticos avanzados.3 |

Para mercados internacionales o integraciones específicas donde no se aplica la moneda local indexada (UF), Bsale estructura sus tarifas en dólares estadounidenses (USD) o moneda local (como el Sol peruano, PEN).21  
La tabla siguiente muestra las tarifas internacionales estándar identificadas para Bsale:

| Producto o Plan Internacional | Moneda de Cobro | Tarifa Mensual | Tarifa de Activación Única | Recursos Incluidos |
| :---- | :---- | :---- | :---- | :---- |
| **Plan Estándar Internacional** | USD | $63,00 22 | No especificada | 1 Casa Matriz, usuarios ilimitados, hasta 5.000 SKU.22 |
| **Plan Omnicanal Internacional** | USD | $98,00 21 | No especificada | 1 Casa Matriz, usuarios ilimitados, hasta 5.000 SKU.21 |
| **Módulo Punto de Venta** | USD | $38,00 8 | No especificada | POS físico y control de cierres de caja para tiendas.8 |
| **Módulo Ecommerce** | USD | $38,00 24 | No especificada | 1 Carro de compras digital basado en plantilla estándar.24 |
| **Implementación Sucursal** | USD | No aplica | $38,00 19 | Tarifa única de habilitación técnica para nueva sucursal.19 |
| **Plan Full Perú** | PEN (Soles) | S/ 363,00 23 | S/ 141,00 23 | Sincronización física y online con comprobantes ilimitados.23 |

Esta estructura revela una estrategia comercial de bajo costo de entrada pero con una alta dependencia de ampliaciones pagadas. La Pyme que experimenta un crecimiento en sus operaciones físicas o digitales se enfrenta a una "escalada modular de costos" en la que cada nueva sucursal, bodega o lote de productos activos (SKU) incrementa el cobro mensual recurrente de manera indefinida.10

## **Arquitectura Tecnológica: API, Sincronización y Webhooks**

La extensibilidad técnica de Bsale se gestiona mediante una API RESTful documentada que opera de manera uniforme en Chile, Perú y México.25 Esta API permite a programadores externos construir puentes de datos bidireccionales para inyectar o extraer información de clientes, productos, stock, despachos y documentos fiscales.3 El intercambio de datos se realiza exclusivamente en formato JSON, y como convención de diseño, todos los atributos y mensajes de respuesta del servidor se entregan en idioma inglés.26  
El control de la API de Bsale presenta características de diseño técnico particulares:

* **Gestión de Atributos**: Para optimizar el ancho de banda y el rendimiento de las consultas, la API implementa la variable fields, que permite al desarrollador solicitar únicamente los atributos requeridos de un recurso.26 Asimismo, mediante la variable expand, es posible obtener recursos relacionados (por ejemplo, los detalles de las líneas de un documento tributario) en un solo llamado HTTP, evitando el problema de consultas ![][image1].26  
* **Formato Temporal**: Bsale procesa todas las fechas y horas como valores enteros basados en el Tiempo Unix (Unix Timestamp), lo que simplifica la compatibilidad horaria internacional pero requiere procesos de conversión en las aplicaciones cliente.26  
* **Manejo de Errores e Identificadores**: La API utiliza códigos de estado HTTP estándar para la notificación de errores y cuenta con control de versiones integrado en la URL para evitar quiebres de servicio ante actualizaciones de la plataforma.26 Al migrar del entorno de pruebas gratuito al productivo, los tokens de acceso y los identificadores internos de los documentos y productos cambian, lo que exige rutinas de mapeo dinámico en las integraciones.3  
* **Webhooks**: La plataforma soporta la suscripción a webhooks para el envío activo de notificaciones basadas en eventos, tales como la creación de nuevos pedidos en el e-commerce o cambios inmediatos en las listas de precios, optimizando la sincronización de sistemas externos sin requerir sondeos constantes (polling).11

## **La Red de Integradores y Alianzas de Nicho (E-commerce y Gastronomía)**

Para suplir sus carencias en funcionalidades específicas, Bsale ha fomentado la creación de un ecosistema periférico compuesto por integradores externos homologados y alianzas de software complementarias.28 En el sector de comercio electrónico, Bsale carece de conectores directos y gratuitos para plataformas globales como Shopify o WooCommerce.28 Esta limitación ha sido monetizada por empresas de tecnología asociadas, tales como Pivotech, Codificando, Sidekick, Lobo Creaciones, Centry, Amplifica e Yuju.28  
La dinámica técnica y comercial de este ecosistema de e-commerce se estructura de la siguiente manera:

| Integrador / App | Plataforma Destino | Costo Mensual Adicional | Funcionalidades de Sincronización Soportadas |
| :---- | :---- | :---- | :---- |
| **Pivotech (Bsale Connect)** | Shopify, WooCommerce, Falabella, Paris, Ripley, Jumpseller 28 | $45,00 USD o escala de 0,8 a 2,6 UF 30 | Sincronización de stock en tiempo real desde 1 sucursal de Bsale hacia la tienda online. Emisión automática de boletas y facturas tras cada compra. Sincronización de dos listas de precios (normal y oferta).31 |
| **Lobo Creaciones (Bsale)** | Shopify 33 | $20,00 a $60,00 USD 33 | El plan de $20 USD ofrece sincronización sin límite de pedidos. El plan de $40 USD añade emisión de facturas y notas de venta. El plan de $60 USD soporta hasta 5 sucursales físicas con sincronización de PVP.33 |
| **Syncventory** | Uber Eats 28 | Tarifa independiente | Sincroniza de forma automática el catálogo de productos, la disponibilidad de stock y los precios del ERP con la aplicación de entrega a domicilio.3 |
| **Jumpseller (Nativo)** | Jumpseller 34 | Gratis (planes Pro) / Variable (planes Basic) 34 | Sincronización directa vía API Key. El sistema de Jumpseller realiza una llamada de inventario a Bsale antes de confirmar la compra. Valida RUT chilenos en checkout y delega el cálculo exacto del IVA a la API de Bsale para asegurar consistencia tributaria.34 |

Por otro lado, en el sector gastronómico (restaurantes, bares, cafeterías y pastelerías), Bsale no cuenta con un sistema nativo para el manejo de salones, comanda digital (KDS) o asignación de mesas.35 Para abordar esta vertical, Bsale opera mediante alianzas estrechas con softwares gastronómicos especializados como Fudo, Toteat y Restaurant.pe.3  
Bajo este modelo de alianza gastronómica, el flujo operativo se divide de la siguiente manera:

| Software Gastronómico | Tarifa Mensual del Software | Funciones de Operación en Salón | Rol de Bsale en la Integración |
| :---- | :---- | :---- | :---- |
| **Fudo** | $35,00 USD base.38 Módulos extra de $4.500 CLP (Mesas/Comensal) y $9.500 CLP (KDS/Delivery).39 | Mapa interactivo de salas y mesas web/móvil, asignación de meseros, traslado de consumos, monitor de cocina digital y despacho a domicilio.39 | Emisión automatizada del documento de cobro final (boleta o factura electrónica) autorizado ante el SII, registro del cierre de caja contable y conciliación de formas de pago.29 |
| **Toteat** | Desde $39.900 CLP hasta $179.900 CLP \+ comisión sobre venta neta (0,35% a 0,70%).40 | POS en la nube, impresión térmica de comandas, menú digital QR, control de repartidores y lector NFC para meseros.40 | Registro centralizado de las ventas en un flujo contable y fiscal unificado, consolidación de márgenes de ganancia y sincronización de inventario multilocal.36 |

Este esquema de alianzas, si bien soluciona la operación del restaurante, obliga al empresario gastronómico a pagar dos suscripciones mensuales de forma simultánea (la de Fudo o Toteat más el plan base de Bsale), incrementando los costos fijos del negocio.29

## **Debilidades Operativas y Puntos de Fricción: Vulnerabilidades Críticas para la Captura de Clientes**

El análisis estratégico de Bsale permite identificar debilidades estructurales y de servicio al cliente que representan oportunidades de entrada para un nuevo competidor de ERP.

### **El "Impuesto Financiero" de la Integración Omnicanal**

La carencia de integraciones directas y gratuitas para Shopify o WooCommerce obliga a los comercios minoristas a contratar herramientas de terceros.28 Para una Pyme que vende en su tienda física y en Shopify, el costo real mensual se compone de la suscripción de Bsale (1,9 o 2,9 UF) más el costo del integrador (por ejemplo, $45 USD de Pivotech).18 Esta fragmentación duplica el costo operativo real y crea un punto de dolor financiero constante en los clientes omnicanal.30

### **Cobros Anticipados en Procesos de Implementación Lentos**

El enrolamiento ante el SII y la configuración inicial de Bsale pueden tardar hasta 30 días hábiles antes de que la plataforma esté lista para emitir el primer documento fiscal.10 Durante este periodo, Bsale cobra la suscripción completa del plan de forma independiente del uso efectivo de la plataforma.10 Este cobro por servicios no prestados genera frustración en las Pymes que inician su operación comercial con presupuestos ajustados.

### **Rigidez en la Política de Cancelación y Reembolsos**

Aunque la plataforma permite dar de baja el servicio de forma mensual sin contratos forzosos, la política de reembolsos por arrepentimiento de compra está limitada a un periodo de 72 horas desde el pago inicial.10 Transcurrido este plazo, no se realizan devoluciones de dinero por periodos mensuales no utilizados.10 Asimismo, en cualquier reembolso aprobado por compras realizadas a través de pasarelas de pago digitales (como Webpay o PayPal), Bsale descuenta del monto devuelto la comisión de la pasarela de pagos, trasladando el costo financiero de la cancelación directamente al usuario.8

### **Deficiencias de Usabilidad en la Aplicación Móvil**

A pesar de contar con una alta calificación de descarga para tareas básicas de consulta, la app móvil de Bsale no está optimizada para la venta móvil o en terreno.10 Los usuarios reportan que es imposible generar de forma cómoda "notas de venta" o pedidos de despacho a domicilio desde un teléfono celular debido a que la interfaz móvil carece de un diseño responsivo para formularios extensos, obligando a los vendedores a lidiar con la versión web de escritorio desde pantallas táctiles de dimensiones reducidas.12

### **Limitaciones de Catálogo para Promociones Complejas**

La plataforma no permite de manera nativa la combinación dinámica de variantes de productos para la aplicación de descuentos automatizados por familias de productos.12 Si un comercio minorista desea ofrecer una promoción de tipo "lleva cualquier combinación de 3 poleras de la misma colección por un valor menor", el sistema exige configurar manualmente cada combinación de pack estático en la base de datos.9 Esta rigidez sobrecarga la administración del catálogo de SKU y limita la agilidad de las campañas de marketing de los comerciantes.12

### **Deterioro del Soporte Post-Venta por Saturación**

A medida que la base de clientes de Bsale ha crecido en la región, su soporte técnico personalizado ha comenzado a mostrar signos de desgaste.12 Los clientes reportan experiencias negativas relacionadas con la suspensión automática del servicio debido a errores administrativos internos en la aplicación de descuentos prometidos por ejecutivos comerciales.12 La falta de canales de atención inmediata ante incidencias críticas de facturación impide a las Pymes emitir DTE urgentes, provocando la pérdida directa de ventas y deteriorando la reputación comercial de los usuarios frente a sus propios clientes.12

## **Plan de Acción Recomendado para el Desarrollo del Nuevo ERP**

Para competir eficazmente contra Bsale, el nuevo ERP en desarrollo debe estructurar su diseño técnico y comercial atacando directamente las deficiencias identificadas de su competencia.

### **1\. Desarrollar Conectores Omnicanales Nativos y Gratuitos**

El nuevo ERP debe posicionarse como la solución que elimina el costo de intermediarios tecnológicos.30 Se recomienda desarrollar conexiones directas vía API con Shopify, WooCommerce y Mercado Libre integradas en los planes de precio medio, permitiendo la sincronización bidireccional de stock y la emisión automática de comprobantes de compra sin costo adicional para el usuario final.28

### **2\. Implementar una Política de "Cobro Justo" en el Onboarding**

A diferencia del cobro por adelantado e independiente del uso de Bsale, el nuevo ERP debe facturar únicamente cuando el proceso de enrolamiento tributario finalice o cuando el cliente emita su primer documento de venta real.10 Esta garantía de "no pago durante la puesta en marcha" representa un argumento de venta sólido para atraer a clientes insatisfechos de la competencia.

### **3\. Resolver las Carencias del Sector Gastronómico y Minorista Perecedero**

Se debe integrar desde la versión de lanzamiento (MVP) un control de inventario profesional que incluya de forma nativa la asignación de números de lote y alertas automáticas de fechas de vencimiento al ingresar el stock, atrayendo a sectores de alimentos, bebidas y cosmética que Bsale no puede atender eficientemente.12 Asimismo, se recomienda diseñar un POS que admita la combinación de variantes para la creación de reglas de descuento dinámicas de manera sencilla.12

### **4\. Diseñar un ERP con Enfoque "Mobile-First" para Ventas en Terreno**

En lugar de una aplicación móvil limitada a la visualización de reportes básicos, el nuevo ERP debe priorizar la experiencia móvil para vendedores en ruta.10 La app móvil debe permitir la toma de pedidos, cotizaciones, creación de notas de venta y registro de clientes con un diseño de interfaz optimizado y con capacidad de almacenamiento local en caso de pérdida de conexión a internet.12

### **5\. Integrar un Módulo de Abastecimiento Estructurado (Compras y Proveedores)**

El nuevo ERP debe diferenciarse de la herramienta rudimentaria de "Factura de Compra" de Bsale mediante el desarrollo de un módulo de compras completo.13 Este módulo debe incluir la emisión de órdenes de compra automáticas al alcanzar niveles mínimos de stock, la comparación de listas de precios de múltiples proveedores y la gestión automatizada de cuentas por pagar integradas al flujo de inventario, atrayendo a Pymes que ya han superado la etapa inicial de solo facturar ventas.

#### **Obras citadas**

1. Sistema de punto de venta para pymes | Bsale Chile, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/](https://www.bsale.cl/)  
2. Preguntas frecuentes \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/faq-bsale](https://www.bsale.cl/sheet/faq-bsale)  
3. Precios \- Pagos mensuales o anuales | Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/precios](https://www.bsale.cl/sheet/precios)  
4. Soluciones Bsale para Empresas, fecha de acceso: mayo 28, 2026, [https://empresas.entel.cl/herramientas-digitales/bsale](https://empresas.entel.cl/herramientas-digitales/bsale)  
5. Integración con Clay \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/integracion-clay](https://www.bsale.cl/sheet/integracion-clay)  
6. Precios \- Pagos mensuales o anuales \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/nuevos-precios](https://www.bsale.cl/sheet/nuevos-precios)  
7. Plan Punto de venta \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/plan-punto-venta](https://www.bsale.cl/sheet/plan-punto-venta)  
8. Módulo Punto de Venta | Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.io/product/modulo-punto-de-venta](https://www.bsale.io/product/modulo-punto-de-venta)  
9. Plan Full \- Omnicanal \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/plan-omnicanal](https://www.bsale.cl/sheet/plan-omnicanal)  
10. Plan Estándar | Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/product/plan-estandar](https://www.bsale.cl/product/plan-estandar)  
11. Preguntas frecuentes \- Bsale app, fecha de acceso: mayo 28, 2026, [https://ayuda.bsale.io/support/solutions/articles/151000216631-preguntas-frecuentes-bsale-app](https://ayuda.bsale.io/support/solutions/articles/151000216631-preguntas-frecuentes-bsale-app)  
12. Bsale App \- App Store \- Apple, fecha de acceso: mayo 28, 2026, [https://apps.apple.com/cl/app/bsale-app/id6498314695](https://apps.apple.com/cl/app/bsale-app/id6498314695)  
13. ¿Cómo generar una factura de compra? \- Bsale, fecha de acceso: mayo 28, 2026, [https://ayuda.bsale.io/support/solutions/articles/151000212276--c%C3%B3mo-generar-una-factura-de-compra-](https://ayuda.bsale.io/support/solutions/articles/151000212276--c%C3%B3mo-generar-una-factura-de-compra-)  
14. Enrolamiento Factura de Compra \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/product/enrolamiento-factura-de-compra](https://www.bsale.cl/product/enrolamiento-factura-de-compra)  
15. Plan Básico | Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/product/plan-basico](https://www.bsale.cl/product/plan-basico)  
16. Servicios Adicionales \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/servicios-adicionales](https://www.bsale.cl/sheet/servicios-adicionales)  
17. Activación Control de Inventario \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/product/activacion-control-de-inventario](https://www.bsale.cl/product/activacion-control-de-inventario)  
18. Plan Ecommerce | Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/product/plan-ecommerce](https://www.bsale.cl/product/plan-ecommerce)  
19. Implementación Sucursal Adicional \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.io/product/implementacion-sucursal-adicional](https://www.bsale.io/product/implementacion-sucursal-adicional)  
20. Módulo ecommerce | Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/product/modulo-ecommerce](https://www.bsale.cl/product/modulo-ecommerce)  
21. Plan Bsale Omnicanal, fecha de acceso: mayo 28, 2026, [https://www.bsale.io/product/plan-bsale-omnicanal](https://www.bsale.io/product/plan-bsale-omnicanal)  
22. Plan Bsale Estándar, fecha de acceso: mayo 28, 2026, [https://www.bsale.io/product/plan-bsale-estandar](https://www.bsale.io/product/plan-bsale-estandar)  
23. Activación Ecommerce \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.com.pe/product/activacion-ecommerce](https://www.bsale.com.pe/product/activacion-ecommerce)  
24. Módulo Ecommerce | Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.io/product/modulo-ecommerce](https://www.bsale.io/product/modulo-ecommerce)  
25. Documentación API Bsale, fecha de acceso: mayo 28, 2026, [https://docs.bsale.dev/](https://docs.bsale.dev/)  
26. API Chile, fecha de acceso: mayo 28, 2026, [https://apichile.bsalelab.com/](https://apichile.bsalelab.com/)  
27. Developers API \- ClearSale, fecha de acceso: mayo 28, 2026, [https://www.clear.sale/developers/api](https://www.clear.sale/developers/api)  
28. Marketplace \- Tienda de apps e integraciones \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/integradores-bsale](https://www.bsale.cl/sheet/integradores-bsale)  
29. Bsale: ¿por qué necesitas un software de facturación electrónica para tu restaurante?, fecha de acceso: mayo 28, 2026, [https://blog.fu.do/bsale-por-que-necesitas-un-software-de-facturacion-electronica-para-tu-restaurante](https://blog.fu.do/bsale-por-que-necesitas-un-software-de-facturacion-electronica-para-tu-restaurante)  
30. Bsale para shopify \- mi opinión \- YouTube, fecha de acceso: mayo 28, 2026, [https://www.youtube.com/shorts/Xl6oLWkwQVs](https://www.youtube.com/shorts/Xl6oLWkwQVs)  
31. Bsale · connect \- Sincronización stock tiempo real, precios y emisión de Boletas | Shopify App Store, fecha de acceso: mayo 28, 2026, [https://apps.shopify.com/bsale-connect](https://apps.shopify.com/bsale-connect)  
32. Bsale · connect \- Shopify App Store, fecha de acceso: mayo 28, 2026, [https://apps.shopify.com/bsale-connect?locale=es](https://apps.shopify.com/bsale-connect?locale=es)  
33. Bsale (Chile) \- Boletas y facturas automáticas, stock y precios sincronizados, fecha de acceso: mayo 28, 2026, [https://apps.shopify.com/bsale](https://apps.shopify.com/bsale)  
34. Integración con Bsale para tu Tienda Online \- Jumpseller, fecha de acceso: mayo 28, 2026, [https://jumpseller.cl/support/bsale/](https://jumpseller.cl/support/bsale/)  
35. Software y sistema de PDV para restaurantes \- Square, fecha de acceso: mayo 28, 2026, [https://squareup.com/us/es/point-of-sale/restaurants](https://squareup.com/us/es/point-of-sale/restaurants)  
36. Bsale | Toteat Chile, fecha de acceso: mayo 28, 2026, [https://toteat.com/productos/integraciones/integraciones-detalle/bsale](https://toteat.com/productos/integraciones/integraciones-detalle/bsale)  
37. Integración con Restaurant.pe \- Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/sheet/integracion-restaurant-pe](https://www.bsale.cl/sheet/integracion-restaurant-pe)  
38. Fudo \- Opiniones, precios y características \- Capterra Chile 2026, fecha de acceso: mayo 28, 2026, [https://www.capterra.cl/software/1023879/fudo](https://www.capterra.cl/software/1023879/fudo)  
39. Planes y precios \- Fudo, fecha de acceso: mayo 28, 2026, [https://fu.do/assets/files/CL\_FUDO\_Planes-y-precios\_FEB-26.pdf](https://fu.do/assets/files/CL_FUDO_Planes-y-precios_FEB-26.pdf)  
40. Planes y precios para Restaurantes, Bares y Cadenas | Toteat Chile, fecha de acceso: mayo 28, 2026, [https://toteat.com/precios](https://toteat.com/precios)  
41. Sucursal Adicional Bsale, fecha de acceso: mayo 28, 2026, [https://www.bsale.cl/product/sucursal-adicional-bsale](https://www.bsale.cl/product/sucursal-adicional-bsale)  
42. Bsale Perú | Sistema de ventas con Control de inventario, fecha de acceso: mayo 28, 2026, [https://www.bsale.com/](https://www.bsale.com/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAaCAYAAAD8K6+QAAABvklEQVR4Xu2WyysFURzHf0jyWHgrlookJQsLikJZElnaImVFYac8slJiY2VBefwHohQLiiQipZANO1Iekcf33DPTzPyae50zXXcszqc+3Tm/38y9fe85M3OIDAZDImmCV/AO3sNlbzvCAbyBlyTPnfF0E0MmHORFFVbhI/yCpayXAsfgDizxtv6UHDgCt+AbfPa21TiBQ/Cb/GdkGnbxoiLDsJoXFSiEA7CR5J+qHawcrsNskhc/wAzPGUS7JH8oCBOwjhc12aAAwXphv3W8QHLWepw2pcMj11iXSQop2AqssI6rSAYTS9OmGc67xrpMUUjBjtl4m2S4Bms8DjudtjahBLPvLzcdJIPZdXF/5TvtqKTCYh/nYJtPvUhepoQI9sKLsegj5/6yEY/3W/gBy+Chtx2VWpLLmnsGN33qSzAtcuXviGCvvBiLNVjJi2CU5KztwVnW0yVeS1E5WBI8tz45YumJLxLh2llPl3gFEy9pJbrhKUzmDYtF+AlzeUOTeAQTD7R3mMUbblpI7gvFjAjFVkrsGTk1cJ8XAxA0WB7J/ek1fLIUm4cL2Oo6LzSCBvv31MMCXjQYDAaDIQA/+QJhN7sK1kcAAAAASUVORK5CYII=>