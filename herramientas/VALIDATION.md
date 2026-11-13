# Integración V1 de Herramientas

Transmisiones guardado en commit local `8652293` tras verificar 112/112 pruebas.

## Cambios

- `/herramientas/`: siete tarjetas con nombre, descripción y acceso directo; navegación separada de Servicios, diseño responsive, acceso por teclado y enlace de salto.
- Menú principal de Inicio: Herramientas sustituye los dos accesos aislados a corte/tubos. Servicios conserva su sección y enlace propio.
- Encabezados de las siete calculadoras: acceso de regreso al catálogo. En corte, el cambio está exclusivamente en el HTML del encabezado generado por assets/main.js.
- Sin cambios de algoritmos, geometrías, dependencias ni configuración de publicación.

## Validación

116/116 pruebas: 112 existentes y 4 nuevas de integración (siete rutas únicas, separación del menú, enlaces de regreso y existencia de enlaces/recursos locales).

HTTP 200 en Inicio, Herramientas y las siete calculadoras. Recorrido mediante enlaces del catálogo y regreso desde cada calculadora, en escritorio y móvil. Valores iniciales calculados en las seis herramientas geométricas/cinemáticas; ejemplo del optimizador ejecutado: 8 piezas en 2 barras de 6000 mm, sobrante 88 mm por barra con corte de 3 mm.

Revisión visual de escritorio de 1280 px y móvil emulado de 390 px; recorridos de las siete herramientas a 360 px sin desbordamiento horizontal global. Menú móvil principal abre y permite acceder al catálogo. Sin errores de consola en el recorrido final.

## Vista local y pendientes

Vista de revisión: http://127.0.0.1:4174/herramientas/ . El servidor anterior en 8765 devuelve 403 en `/`; se usó un servidor auxiliar local con resolución correcta de la raíz, en `.local-import/serve-validation.cjs` (ignorado por Git). No se modificó Netlify ni se publicó.

Integración auditada y preparada para commit local; despliegue pendiente de autorización del usuario. La validación móvil es emulada, no sobre teléfono físico. Se mantienen los límites funcionales documentados por cada calculadora.


## Auditoría final de lanzamiento — 13/11/2026

- Repetidas las 116 pruebas automatizadas: 116 aprobadas, 0 fallos.
- Las nueve rutas devolvieron HTTP 200 en la vista local 4174.
- Comprobados 118 enlaces/recursos locales declarados en los HTML, incluyendo coincidencia exacta de mayúsculas/minúsculas para el sistema de archivos del hosting. Los marcadores dinámicos de plantillas se excluyeron del análisis estático y se revisó el contenido renderizado.
- Recálculo básico: tubos Ø50; gajos a 60°; cono completo; cuatro perforaciones; transición dx=60; transmisiones a 1000 rpm (salida 250 rpm). Resultados y SVG presentes, sin errores visibles.
- Optimizador: pedido de ejemplo de 8 piezas, dos barras y 88 mm de sobrante por barra.
- Menú principal y enlace Herramientas revisados; Servicios conserva su sección independiente; regreso desde las siete calculadoras comprobado.
- Escritorio 1280 px, móvil emulado 390/360 px: sin desbordamiento horizontal global ni imágenes rotas en las siete calculadoras. Sin errores ni advertencias de consola en el recorrido auditado.
- No se encontraron errores que exigieran modificar código adicional. Ningún algoritmo matemático fue modificado. git diff --check sin errores.
- netlify.toml conserva publicación estática desde la raíz, sin paso de build. Las rutas nuevas cuentan con index.html propio y recursos relativos existentes.

Resultado: sin bloqueantes encontrados para un despliegue de esta V1. No se realizó push ni publicación. Falta la comprobación posterior al despliegue real (rutas, módulos JS/MJS, worker del optimizador y políticas HTTP en Netlify), así como ensayo en teléfono físico e impresión física a escala. La auditoría local no sustituye esas verificaciones. Se mantienen las limitaciones de cada calculadora y el carácter ideal del modelo de transmisiones.
