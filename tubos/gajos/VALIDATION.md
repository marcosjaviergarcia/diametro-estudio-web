# Validación final de curvas por gajos

Fecha: 10/11/2026. Cambios locales, sin publicación ni DXF.

## Resultado

50/50 pruebas aprobadas: 33 regresiones anteriores y 17 de gajos. Comando:

`node --test tubos/gajos/geometry.test.mjs tubos/gajos/artwork.test.mjs tubos/geometry.test.mjs corte/assets/solidworks.test.mjs corte/assets/material-notices.test.mjs`

El núcleo `geometry.mjs` no cambió durante esta validación. SHA-256 antes/después: `7A8A5F5344B29E11052D4D3DC6637C45311707CFA608C779713ECF76C268E235`.

## Geometría y medidas

Casos D/R/A/n: 50/75/90/3, 50/100/90/1, 50/100/10/5, 100/150/180/6, 300/150,001/180/24 y 10/10000/0,01/24.

- Juntas contiguas coincidentes, con el mismo plano de corte y la misma sección; comprobación adicional en radios 0, r/2 y r.
- Semiespacios de todas las juntas comprobados para las piezas, incluidas las no consecutivas. Se conserva la demostración de ausencia de interpenetración nominal de DESIGN.md.
- Terminales libres a escuadra; longitudes de cada generatriz iguales a la separación entre bordes del desarrollo.
- Ángulo entre ejes consecutivos δ, ángulo entre cada eje y la normal bisectora β, y desvío global A verificados con productos vectorial/escalar, sin inferir ángulos de la imagen proyectada.
- Máxima separación entre bordes vecinos en las muestras exportadas: 1,1719 × 10⁻¹³ mm.
- Máxima diferencia entre longitud 3D y desarrollo: 5,6844 × 10⁻¹⁴ mm.
- Máximo error angular entre ejes: 3,6083 × 10⁻¹⁶ rad.

Los errores anteriores corresponden a aritmética de punto flotante en los casos probados; no son tolerancias de fabricación.

## Visor y controles

Se eliminaron las diagonales permanentes que unían los puntos con las esquinas del visor. Las referencias y el arco ideal están ocultos por defecto y se activan con «Referencias angulares». Las etiquetas quedan cerca del borde, con conectores cortos y separación para evitar superposición de etiquetas. La pieza elegida mantiene el naranja de Diámetro Estudio.

Verificado en navegador de PC y viewport móvil de 390 × 844: selección P1–P4, sincronización de plantilla/tabla, pieza aislada, ensamble, giro por teclado, restablecimiento, referencias activadas/desactivadas y vista de 180°. Sin desbordamiento horizontal global ni errores de consola observados. El zoom aumentó por el factor esperado 1,25; también se probaron reducción, lectura y ajuste.

Con R=D/2 se limpian resultados anteriores y se bloquean impresión y SVG; al corregir R se recupera el funcionamiento.

## Escala e impresión

SVG con unidades mm y coordenadas físicas. Páginas de dibujo A4 de 190 × 240 mm, desplazamientos de 180 × 230 mm, solapes de 10 mm. Los tests comprueban varias filas/columnas y ambos bordes. El HTML imprimible permaneció idéntico al cambiar zoom, orientación y modo de visualización para la misma pieza.

Se accionó el botón de impresión sin error de aplicación. El entorno del navegador integrado no expuso una vista previa del diálogo de impresión; no se certificó su configuración ni se imprimió en papel. Sigue pendiente la prueba física de la regla de 50 mm, a tamaño real/100 %, sin ajuste de página.

## Límites pendientes

- Modelo nominal: sin espesor, bisel, holgura, cordón de soldadura ni ancho de sierra; sin garantía de sujeción o fabricabilidad para piezas muy cortas.
- Visor WebGL con 96 divisiones circunferenciales y precisión de GPU: aproximación visual, no fuente de cotas. Los ángulos en pantalla dependen de la cámara; las cotas son las del modelo 3D.
- Las referencias opcionales incluyen puntos ocultos; sus etiquetas no indican visibilidad física de la superficie.
- No se ensayó en un teléfono físico ni en todos los navegadores/GPU. Si WebGL no está disponible, queda el aviso y siguen accesibles las plantillas.
- Impresión limitada a 100 hojas por pieza; por encima se ofrece el SVG completo y un aviso.

Archivos intervenidos en esta validación: `view3d.js`, `index.html`, `main.js`, `geometry.test.mjs`, `DESIGN.md` y este informe. No se modificaron herramientas existentes ni fórmulas geométricas.
