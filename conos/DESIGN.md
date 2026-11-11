# Conos y troncos de cono — primera versión

Ruta `/conos/`. Archivos nuevos solamente. Gajos cerrado previamente en commit local `4b5383a`, con sus 50 pruebas aprobadas. Sin publicación.

## Superficie y fórmulas

Cono recto concéntrico, de espesor cero. Diámetros ingresados sobre la superficie de referencia, sin decidir automáticamente si corresponden a cara interior, exterior o fibra neutra de una chapa real. No incluye tapas, solapes, soldadura ni compensación de plegado.

Sean R=D mayor/2, r=D menor/2, H=altura axial y Δ=R−r. La generatriz es s=√(H²+Δ²). Para Δ>0:

- Radio exterior del sector L=Rs/Δ.
- Radio interior del sector l=rs/Δ.
- Ángulo del sector α=2πΔ/s radianes (360Δ/s grados).
- Lα=2πR y lα=2πr: los dos arcos preservan las circunferencias correspondientes.
- L−l=s; área lateral π(R+r)s.

Si r=0, el desarrollo es un sector circular y el modelo termina en un vértice. Si Δ=0, el límite es cilíndrico: rectángulo 2πR × H. Sus radios y ángulo de sector no son finitos ni aplicables; se muestran como «No aplica».

Se admiten D mayor y H positivos hasta 10.000 mm, y 0≤D menor≤D mayor. No se intercambian diámetros silenciosamente. Una entrada inválida limpia resultados e inhabilita exportación.

## Correspondencia 2D/3D y estabilidad

Para 0≤t≤1 y 0≤θ≤2π, el modelo espacial es ((R−Δt)cosθ,(R−Δt)sinθ,Ht). Con k=Δ/s, ρ=(R−Δt)/k y φ=(θ−π)k, el plano usa:

x=ρsinφ; y=st+2ρsin²(φ/2).

Esto equivale a trasladar un sector anular, pero evita restar radios gigantes casi iguales al acercarse al cilindro. La longitud sobre una generatriz es s en ambas representaciones. La métrica circunferencial es ρdφ=(R−Δt)dθ; por eso conserva longitudes locales, no solamente el contorno. La transformación se trata por separado para el cilindro exacto.

El SVG usa arcos circulares `A`, divididos en cuatro por borde, no polígonos de corte. Extremos serializados a cuatro decimales de mm; las pruebas verifican el error de longitud de los arcos serializados (<0,001 mm en los casos ensayados). Los límites del papel incluyen extremos analíticos de los arcos y 12 mm de margen.

El visor WebGL usa 144 segmentos para representación, normales explícitas y profundidad. No incorpora un espesor ficticio. Cámara y zoom nunca modifican los valores nominales ni el archivo imprimible.

## Reutilización y archivos

- CSS, identidad visual y reglas A4/calibración de tubos/gajos, enlazadas sin modificar sus archivos.
- Formato numérico importado de `tubos/gajos/artwork.mjs`.
- `geometry.mjs`: cálculo puro, superficie, desarrollo estable y límites.
- `artwork.mjs`: sector SVG e impresión A4 con 10 mm de solape.
- `view3d.js`: adaptación local del renderer WebGL de gajos; las herramientas anteriores permanecen intactas.
- `main.js`, `index.html`, `style.css`: formulario, resultados, tabla y controles.
- `geometry.test.mjs`: 15 pruebas nuevas, incluyendo validación de exportaciones.

## Validación

Casos conocidos: cono D=6, d=0, H=4 → s=5, L=5, α=216°; tronco D=200, d=100, H=120 → s=130, L=260, l=130, α=138,461538…°.

Otros casos: cono muy bajo, casi cilindro (200/199,999999/H120), cilindro exacto, cono muy esbelto, grandes dimensiones y entradas inválidas. Se verifican circunferencias superior/inferior, generatrices, cierre espacial, área, estabilidad del límite, encuadre, SVG y paginación.

Revisión visual en PC y viewports de 390 y 360 px: tronco, cono completo, cilindro, giro por teclado, restablecimiento, zoom, lectura y ajuste, bloqueo de datos inválidos y recuperación. No se observaron errores de consola ni desbordamiento horizontal global. El HTML de impresión permanece idéntico al cambiar zoom.

## Límites

Impresión automática hasta 100 páginas por desarrollo, con aviso al superar el límite; SVG completo siempre disponible para las dimensiones admitidas. Verificar físicamente la regla de 50 mm a 100 % antes de fabricar: no se realizó impresión en papel ni ensayo en teléfono físico. La malla es una aproximación visual, distinta de las cotas analíticas. El visor requiere WebGL; su ausencia no bloquea cálculos ni plantilla. No se implementa DXF, fibra neutra, compensación por espesor, plegado ni soldadura.
