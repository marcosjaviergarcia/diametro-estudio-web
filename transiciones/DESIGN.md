# Transiciones rectangulares — primera versión

Ruta `/transiciones/`. Herramienta nueva e independiente. Perforaciones se guardó en el commit local `048cec8` después de confirmar 81/81 pruebas. No se modifican herramientas anteriores ni se publica.

## Alcance y ejes

Dos rectángulos paralelos, alineados en X/Y, sin giro relativo. Ancho en X, profundidad en Y. Sección inferior centrada en (0,0,0); superior en (dx,dy,H). El desplazamiento «vertical en planta» es dy, no la altura axial H. Anchos, profundidades y H: 0,01 a 10.000 mm; dx/dy: −10.000 a 10.000 mm. Espesor matemático cero. Se permite contracción, expansión, cambio mixto de proporciones y excentricidad mayor que las dimensiones de las secciones.

Vértices A,B,C,D: (−X,−Y), (+X,−Y), (+X,+Y), (−X,+Y) respecto de cada centro. Prima identifica la sección superior. Caras: 1 frente AB, 2 derecha BC, 3 fondo CD, 4 izquierda DA. Cada cara usa [inferior i, inferior i+1, superior i+1, superior i]. El visor resalta la cara elegida, que puede estar oculta por otra según la cámara.

## Demostración de desarrollabilidad

Los dos bordes de cada cara, pertenecientes a las secciones inferior y superior, son paralelos. Dos rectas paralelas definen un plano; los cuatro vértices pertenecen a él. Por tanto cada cara es un trapecio plano (incluye rectángulo/paralelogramo), aunque dx/dy sean distintos de cero o las dos secciones tengan distintas proporciones. No hace falta triangulación de fabricación.

La implementación no se limita a esa hipótesis: para cada cara calcula una base ortonormal y la distancia de sus cuatro vértices al plano. Si la distancia excede 1e−10 por la escala de la cara (mínimo 1 mm), bloquea el resultado. Una prueba entrega intencionalmente una cara alabeada y verifica su rechazo. La tolerancia es numérica, no de fabricación.

Con p0 como origen, u=(p1−p0)/|p1−p0|, n=normalize(u×(p3−p0)), v=n×u. El plano usa q(p)=((p−p0)·u,(p−p0)·v). Esta proyección sobre una base ortonormal del propio plano es una isometría: conserva las cuatro aristas, ambas diagonales, ángulos y área. La transformación inversa es p=p0+qx·u+qy·v.

Longitudes verdaderas: |pj−pi| en 3D. Altura de trapecio: q3.y. Área=(base inferior+base superior)·altura de trapecio/2. Para las caras frente/fondo la altura verdadera es hypot(H,dy ∓ (profundidad superior−inferior)/2); para derecha/izquierda es hypot(H,dx ± (ancho superior−inferior)/2), con signo según la cara. No confundir con H ni con una arista oblicua.

Las caras vecinas comparten exactamente los mismos vértices y aristas. A cada Z=tH la sección interpolada sigue siendo un rectángulo con anchos/profundidades positivos, por lo que no hay cruce de caras, incluso con gran excentricidad. Los triángulos del render WebGL solo rasterizan cada cara plana y no representan una aproximación de fabricación.

## Salidas y reutilización

Cuatro desarrollos independientes, uno por cara. Selección sincronizada entre resaltado 3D, tabla de aristas/diagonales/área, plano, SVG e impresión. Se exporta la cara seleccionada: hacen falta las cuatro para completar la transición. No es una plantilla continua de plegado ni un anidado de corte.

Se reutilizan por referencia CSS, identidad visual, formato numérico y reglas de impresión de tubos/gajos. Renderer WebGL adaptado localmente desde conos, sin modificar su original. SVG usa polígonos con coordenadas calculadas y dimensiones físicas en mm. Impresión A4: ventana 190×240 mm, pasos 180×230 mm, solape 10 mm, regla de control de 50 mm. Zoom de pantalla no cambia la impresión.

## Archivos

- geometry.mjs: validación, vértices, planitud, transformación exacta y dimensiones.
- artwork.mjs: plano acotado, identificación de vértices, SVG e impresión por cara.
- view3d.js: caras con profundidad, iluminación, selección, arrastre y teclado.
- main.js, index.html, style.css: parámetros, selección, tablas y controles responsive.
- geometry.test.mjs: 15 pruebas nuevas.

## Validación

Prisma conocido, trapecios concéntricos, excentricidad de 60/−35 mm; isometría, área y uniones en seis configuraciones (concéntrica, excéntrica, expansión, mixta, prisma oblicuo y extremo de dominio); rechazo de alabeo, secciones intermedias sin cruce, medidas inválidas, seis distancias del SVG por cara, encuadre y escala/cobertura A4.

Revisión visual en escritorio de 1280 px y móviles emulados de 360/390 px: modelo abierto, selección de caras, arrastre y flechas, restablecimiento, desarrollos y tabla, zoom ±, lectura/ajuste, centrar X/Y, rechazo de H=0 y recuperación. Sin desbordamiento horizontal global ni errores de consola. HTML de impresión idéntico antes y después del zoom. No se realizó impresión física ni prueba en teléfono físico.

## Limitaciones

Solo rectángulos paralelos sin rotación; no se incluyen transiciones circulares, caras curvas, secciones giradas ni alabeadas. No hay DXF, espesor, tolerancias, pestañas, soldadura ni compensación de plegado. Cada cara se imprime/exporta individualmente; máximo 100 hojas por cara en impresión automática, con SVG completo disponible por encima de ese límite. Cotas redondeadas para lectura, geometría SVG sin ese redondeo. En caras extremadamente estrechas o excéntricas, rótulos pueden superponerse: consultar tabla y zoom. El visor requiere WebGL; una cara casi degenerada puede ser difícil de ver a la escala del conjunto. La planitud y longitudes se verifican con números de doble precisión; la malla visual utiliza float32.
