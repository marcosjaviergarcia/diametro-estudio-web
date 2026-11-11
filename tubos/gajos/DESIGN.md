# Curvas por gajos — primera versión

Ruta local `/tubos/gajos/`. Implementación aislada: no cambia módulos, navegación ni cálculos de las herramientas existentes. Reutiliza su CSS y las imágenes de marca por referencia. Sin dependencias nuevas, DXF, optimizador ni publicación.

## Definición de R y revisión matemática

**R: radio de referencia al eje de la curva.** Es el radio del arco circular ideal; los ejes rectos reales forman una poligonal circunscrita tangente a ese arco. La distancia desde el centro a cada eje es R y a cada vértice es R/cos(β). No es un radio interior ni un radio medido a los vértices.

Para diámetro D, r=D/2, desvío α y n uniones: δ=α/n, β=δ/2, h=R tan(β), L=2h, k=r tan(β). Hay n+1 piezas: dos terminales de longitud al eje h y n−1 intermedias de longitud al eje L. La profundidad de un inglete es D tan(β). La suma de longitudes al eje es 2nR tan(β), distinta del arco Rα y del consumo de material de un plan de corte.

El dominio es 10≤D≤300 mm, D/2<R≤10000 mm, 0<α≤180°, n entero entre 1 y 24, δ≤90°. No se modelan espesor, holguras ni soldadura.

Con θ=0 exterior de la curva y θ=90° hacia +Y, los bordes locales son:

| Pieza | Borde A | Borde B |
|---|---|---|
| Entrada | 0 | h+k cosθ |
| Intermedio | −k cosθ | L+k cosθ |
| Salida | −k cosθ | h |

Se conserva únicamente entre los dos bordes. Las longitudes mínimas/máximas de terminales son (R∓r)tanβ; las intermedias, 2(R∓r)tanβ. Los extremos libres permanecen a escuadra.

Para la pieza j: tⱼ=(sin jδ,0,cos jδ), qⱼ=(−cos jδ,0,sin jδ), P₀=0 y Pⱼ₊₁=Pⱼ+ℓⱼtⱼ. La superficie es X=Pⱼ+r cosθ qⱼ+(0,r sinθ,0)+ztⱼ. La base local es ortonormal de determinante −1: el render usa normales radiales explícitas, sin descartar caras por orientación. La salida es (R(1−cosα),0,Rsinα).

La normal del plano de junta es tⱼ+tⱼ₊₁. La identidad qⱼ+tanβ tⱼ=qⱼ₊₁−tanβ tⱼ₊₁ demuestra que los bordes vecinos coinciden para cada θ. También vale sustituyendo r por cualquier ρ≤r: coinciden las secciones, no solo el contorno.

Los planos de junta pasan por la recta vertical del centro O=(R,0,0). Cada pieza ocupa su sector angular, con (X−O)·qⱼ=R+ρ cosθ>0. Esto excluye la cuña opuesta. Para α≤π, los sectores tienen interiores disjuntos, incluso entre piezas no consecutivas. Hay contacto en las juntas, sin interpenetración volumétrica nominal.

## Desarrollo y renderer

Se despliega u=rθ y v=12+z−min(borde A): ambos bordes usan el mismo datum. La tabla muestra z local, incluido su signo; el SVG contiene coordenadas de papel con margen. La interpolación tiene error teórico ≤0,01 mm antes de serializar a cuatro decimales. El zoom no cambia datos físicos.

WebGL nativo con profundidad dibuja las superficies provenientes de `geometry.mjs`. Usa 96 divisiones de circunferencia para pantalla; esta malla es visual y no determina las medidas ni la resolución del SVG. La selección de pieza y la vista aislada conservan su forma real. El arco de referencia puede quedar oculto por las superficies. Si WebGL no está disponible, se informa y siguen funcionando cálculo, tabla y plantilla.

SVG en mm e impresión A4: 190×240 mm útiles para dibujo, paso 180×230 mm y solape de 10 mm. Regla de control de 50 mm. Se limita la impresión a 100 hojas por pieza con aviso explícito; el SVG completo sigue disponible. Imprimir la pieza seleccionada; repetir los intermedios según la cantidad indicada. No hay vista explotada en esta versión.

## Archivos y comprobación

- `geometry.mjs`: cálculo puro, bordes, transformaciones, muestreo y paginación.
- `artwork.mjs`: SVG de dos bordes e impresión, sin dependencia del zoom/cámara.
- `view3d.js`: render e interacción.
- `main.js`, `index.html`, `style.css`: formulario, selección y presentación.
- `geometry.test.mjs`, `artwork.test.mjs`: 17 pruebas de gajos.

Casos: 50/75/90°/3, 50/100/90°/1, 50/100/10°/5, 100/150/180°/6, 300/150,001/180°/24 y 10/10000/0,01°/24. Se comprueban cotas analíticas, juntas, semiespacios de todas las piezas, extremos a escuadra, reconstrucción del desarrollo, error de muestreo, escalado, convergencia y exportación. Mantener además las 33 regresiones existentes.

Ejemplo inicial: D=50, R=75, A=90°, n=3. h=20,096189 mm, L=40,192379 mm, β=15°, profundidad=13,397460 mm, intermedio mínimo=26,794919 mm y máximo=53,589838 mm. Salida=(75,0,75) mm.

Las pruebas verifican geometría nominal y dimensiones de los archivos. No sustituyen la comprobación física de la regla impresa ni una prueba de ajuste de taller.


## Validación final

Ver `VALIDATION.md`: 50 pruebas aprobadas, fórmulas intactas y referencias 3D opcionales con etiquetas locales. Se conserva la escala de exportación/impresión; queda pendiente la comprobación física en papel.
