# Patrones circulares de perforaciones

Ruta local: `/perforaciones/`. Herramienta independiente; no se modifican herramientas anteriores. Conos se guardó en el commit local `4ba47cb` después de verificar las 65 pruebas existentes.

## Modelo matemático

PCD P, cantidad entera N, diámetro de agujero d y ángulo inicial a. R=P/2; paso angular=360°/N. Centro i: X=R cos(a+i·360°/N), Y=R sin(a+i·360°/N), i=0…N−1. Numeración antihoraria desde +X; +Y hacia arriba. En SVG se invierte Y exclusivamente para su representación.

Para N≥2, distancia entre centros consecutivos c=P sin(π/N), separación libre mínima=c−d. Para N=1 no existen vecinos, por lo que separación angular entre agujeros, distancia y separación libre se muestran como no aplicables.

Se comparan todos los pares únicos mediante distancia euclídea. Distancia menor que d: superposición; igual: tangencia; mayor: separación. Tolerancia numérica 1e−10·max(P,d) mm para absorber errores flotantes, no tolerancia de fabricación. No se calcula distancia a un borde exterior porque no se solicita ni se define una pieza soporte.

## Implementación y reutilización

- `geometry.mjs`: validación, centros, cuerdas, interferencias.
- `artwork.mjs`: círculos SVG exactos, cotas PCD y diámetro, marcas de centro, ejes y numeración; formato numérico reutilizado de gajos, con eliminación local del cero negativo numérico.
- `index.html`, `style.css`, `main.js`: formulario, selección por figura/tabla y teclado, zoom, ajuste, coordenadas, avisos y exportación.
- `geometry.test.mjs`: 16 pruebas matemáticas y del dibujo/exportación.

Se enlazan CSS e identidad visual de tubos/gajos, incluidas reglas de impresión A4 y calibración de 50 mm. No se altera el código original. La impresión se genera en mm, con ventanas de 190×240 mm y solape de 10 mm. Zoom y selección son exclusivos de pantalla; no cambian el documento impreso ni el SVG. Las advertencias de interferencias se conservan en ambos documentos exportables.

## Validación

16 pruebas nuevas: hexágono conocido, centros cardinales, normalización angular, uno/dos agujeros, tangencias, separación y superposición, pares no consecutivos y cierre, invariantes hasta 360 centros, entradas inválidas, coordenadas de círculos SVG, selección/numeración accesible, advertencias, escala/cobertura A4 y límites de papel.

Revisión visual y de controles en navegador: escritorio 1280 px, móvil emulado de 360 y 390 px; selección por tabla y teclado, zoom ±, lectura, ajuste, desplazamiento local sin desbordamiento global, tangencia de 6 agujeros Ø50 en PCD100, superposición Ø60, cantidad inválida y recuperación, ángulo −90°, caso de un agujero. Impresión invariable al cambiar zoom. Sin errores ni advertencias de consola.

## Límites

PCD y diámetro >0 hasta 10.000 mm; 1 a 360 agujeros; ángulo inicial absoluto hasta 10⁹ grados. Se calculan todos los pares; el detalle de conflictos muestra los primeros 200. Patrones muy densos pueden superponer rótulos: usar zoom y tabla para lectura individual. Las cifras de pantalla se redondean; el SVG conserva coordenadas sin ese redondeo.

Máximo 100 páginas en impresión automática; SVG completo disponible por encima del límite. No se efectuó impresión física ni prueba en teléfono físico. No incluye DXF, tolerancias de mecanizado, espesor, borde de pieza ni resistencia del material. No se publicó ni se desplegó.
