# Transmisiones mecánicas — primera versión

Ruta `/transmisiones/`. Transiciones rectangulares se guardó en el commit local `35d32d6` después de confirmar 96/96 pruebas. Herramienta independiente; no se modifican las anteriores ni se publica.

## Modelo y convención

Se admite una cadena de 1 a 8 etapas, cada una de poleas/correa o piñones/cadena. La conducida de una etapa comparte eje rígido con la conductora de la siguiente. No se modelan ramificaciones, diferenciales ni engranajes.

Convención: i = n entrada / n salida. i>1 reduce RPM; i<1 las multiplica. RPM se ingresan como magnitud no negativa; el sentido se informa por separado. En reposo la relación se obtiene de la geometría y no de dividir 0/0.

Correa ideal sin deslizamiento: igualdad de velocidad de paso π·Dp1·n1 = π·Dp2·n2, por tanto i=Dp2/Dp1. Los diámetros son primitivos o efectivos de trabajo, en mm, no diámetros exteriores. No existe conversión universal entre exterior y primitivo: depende del perfil. El modelo admite el cálculo cinemático ideal de correa abierta o cruzada; la disposición cruzada no certifica compatibilidad física de una correa concreta.

Cadena: avance medio por vuelta p·Z. Igualando p·Z1·n1=p·Z2·n2 se obtiene i=Z2/Z1, con paso p común. No usar cociente de diámetros de piñones para sustituir el cociente de dientes; la circunferencia primitiva de una cadena es poligonal y la velocidad instantánea puede fluctuar. Se calcula RPM media ideal, sin efecto poligonal.

Para k etapas, i total=producto(i_j). n salida=n entrada/i total, o n entrada=n salida·i total cuando la salida es el dato conocido. Las RPM intermedias se calculan secuencialmente; no se redondean para alimentar la etapa siguiente. Se muestran fórmulas numéricas por etapa y tabla de velocidades.

Correa y cadena abiertas conservan sentido; correa cruzada invierte. Se multiplica el signo por etapa y se compara mirando ejes paralelos desde el mismo lado. No se calculan potencia, par, eficiencia, tensiones, resistencia ni viabilidad de montaje.

Referencias técnicas generales: [SDP/SI, correas y poleas](https://sdp-si.com/D820/PDFS/Technical-Section.pdf), [Renold, transmisiones por cadena](https://tr.renold.com/media/165418/transmission-i-and-m-ren12-eng-10-10.pdf). La validación automatizada se basa en las identidades cinemáticas anteriores y casos conocidos; no es una selección industrial de componentes.

## Interfaz y reutilización

CSS, logo e identidad de tubos/gajos enlazados sin modificación. Formulario de etapas con agregar/quitar, conductora/conducida explícitas y unidades dependientes del sistema. Al cambiar de sistema se restablecen ejemplos de dimensiones, con aviso visible; no se reinterpretan milímetros como dientes. Cálculo inverso de RPM con el selector de dato conocido.

Esquema SVG simbólico, sin escala ni animación: círculos iguales a modo de símbolos, sin dientes simulados ni diámetros exteriores ficticios. Selección con clic, teclado o selector, con fórmula detallada vinculada. Disposición abierta/cruzada y líneas discontinuas de cadena identifican el tipo. El enlace entre filas señala ejes intermedios compartidos. No representa un trazado físico de correas o cadenas ni distancia entre ejes.

En móvil, modo Lectura con desplazamiento local; Ajustar a pantalla permite vista general. Tabla desplazable, etiquetas de unidades y fórmulas disponibles fuera del esquema. Los datos no se guardan entre recargas.

## Archivos

- kinematics.mjs: validación, cálculo directo/inverso por etapas, sentidos, formato y esquema.
- main.js: formulario, selección, controles, errores y zoom.
- index.html y style.css: estructura, identidad y responsive.
- kinematics.test.mjs: 16 pruebas automatizadas.

## Validación

Casos: poleas 100/200 a 1500 rpm → 750 rpm; 200/50 → 6000 rpm; piñones 17/51 → 500 rpm; dos etapas mixtas 100/200 y 20/40 → i=4 y 375 rpm. Pruebas de cálculo inverso, reciprocidad de ocho etapas, ejes compartidos, inversión simple/doble, reposo, identidad, conservación de velocidad de paso, dientes fraccionarios, datos inválidos, límites numéricos y SVG accesible con datos calculados.

Pruebas de navegador: escritorio de 1280 px y móviles emulados de 360/390 px; cálculo inverso, correa cruzada, cadena con dientes fraccionarios y recuperación, cambio de sistema, agregar/quitar, selección por teclado/selector, zoom/ajuste/lectura, reposo y límite de ocho etapas. Se corrigió un fallo del enlace del botón Lectura durante la validación y se repitió la comprobación. Sin desbordamiento horizontal global; el esquema y tabla pueden desplazarse dentro de sus contenedores.

## Límites

Diámetros primitivos: 0,01–10.000 mm. Dientes: enteros 3–1000 (dominio matemático, no recomendación constructiva; se avisa con menos de 17). RPM conocidas: 0–1.000.000. Relación total: 10⁻¹²–10¹²; RPM calculadas ≤10¹². Son límites numéricos, no capacidades admisibles de una máquina. Valores pequeños usan notación científica para evitar mostrar cero por redondeo. Cálculos en doble precisión; valores de lectura redondeados a cuatro decimales o notación científica.

Pendiente prueba en teléfono físico. No se evalúan perfiles, materiales, alineación, contacto, longitud, tensión, potencia, par, resistencia ni seguridad del montaje. No hay DXF ni exportación de planos de fabricación.
