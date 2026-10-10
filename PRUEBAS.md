# Pruebas manuales

Casos de prueba de «Pruébalo», las soluciones de retos frente al uso de IA, la tarjeta de talento compartible, el árbol de evolución del código, el registro de métricas del modelo de negocio, el campo de código y los ajustes de interfaz. Cada caso indica los pasos y el resultado esperado.

## Preparación

**Datos mínimos.** Para recorrer todos los casos hacen falta:

- Tres estudiantes (A, B y C) y una empresa con suscripción activa.
- Una publicación de A con tres propuestas: una de B aceptada, una de C pendiente y otra rechazada.
- Una publicación con una mejora aceptada en cada lenguaje que se ejecuta (JavaScript, TypeScript, Python, SQL y Go), donde la mejora cambie lo que imprime el programa, y otra en Java.
- Un reto abierto de la empresa, con código inicial.
- Un estudiante sin actividad (todas sus cifras en cero) para la tarjeta de talento.

**Celular.** En Chrome, abre las herramientas de desarrollo (F12), activa la barra de dispositivos (Ctrl + Mayús + M) y elige un ancho de 360 px y un alto de 800 px. Para probar con el dedo, usa un teléfono real conectado a la misma red.

**Conexión.** Python, SQL y el compilador de TypeScript se descargan de cdn.jsdelivr.net la primera vez que se usan, y Go se ejecuta en el Go Playground (go.dev): para los casos de «Pruébalo» hace falta internet.

**Movimiento reducido.** En las herramientas de desarrollo: menú ⋮ › Más herramientas › Representación (Rendering) › «Emular la función multimedia de CSS prefers-reduced-motion» › `reduce`. También sirve la opción del sistema operativo (en Windows: Configuración › Accesibilidad › Efectos visuales › Efectos de animación, desactivado). Recarga la página después de cambiarla.

---

## 1. Pruébalo: ejecutar el código

### P-01 · Dónde aparece
**Pasos:** abre una publicación con una mejora aceptada, otra sin mejoras aceptadas, «+ Publicar código» y el formulario «Proponer una mejora».
**Resultado esperado:**
- En la publicación con mejora aceptada, debajo del código, está la sección «Pruébalo» con dos paneles lado a lado: «Original de @autor» y «Mejorado por @quien_propuso». Cada uno tiene el código, el botón «▶ Ejecutar» y una consola. Arriba está «▶ Ejecutar las dos». En un reto, el original lleva el nombre de la empresa y la mejora es la solución ganadora.
- En la publicación sin mejoras aceptadas no aparece la sección.
- En «Publicar código» hay un panel «Pruébalo antes de publicar» debajo del campo de código, que ejecuta el código escrito en el lenguaje elegido.
- En «Proponer una mejora» hay un panel «Prueba tu versión antes de enviarla» (en un reto, «Prueba tu solución antes de enviarla»).
- Antes de ejecutar, la consola dice «Sin ejecutar» y «Pulsa «▶ Ejecutar» para ver lo que imprime.».

### P-02 · JavaScript
**Pasos:** en la publicación de JavaScript, pulsa «▶ Ejecutar las dos».
**Resultado esperado:**
- Cada consola muestra lo que imprimió `console.log` (los arreglos y objetos como `[ 1, 2, 3 ]` y `{ total: 18, ok: true }`) y arriba «Terminó en N ms».
- `console.error` y los errores se ven en coral; un error sin atrapar muestra el mensaje con su línea, por ejemplo «ReferenceError: x is not defined (línea 3)», y la consola dice «Terminó con error · N ms».
- Debajo de los paneles aparece la comparación: «La mejora cambia el resultado» (en verde) o «Ambas versiones producen la misma salida».

### P-03 · TypeScript
**Pasos:** en la publicación de TypeScript, pulsa «▶ Ejecutar las dos». Luego, en «Publicar código» con TypeScript, ejecuta `const x: number = ;` y después `import { readFileSync } from 'fs';`.
**Resultado esperado:**
- La primera vez la consola dice «Preparando TypeScript…» mientras descarga el compilador; después transpila y ejecuta como JavaScript.
- Un error de sintaxis se muestra con línea y columna: `programa.ts(1,19): error TS1109: Expression expected.`
- Importar un módulo da «Error: Pruébalo no puede cargar módulos («fs»): escribe todo en un solo archivo».

### P-04 · Python
**Pasos:** en la publicación de Python, pulsa «▶ Ejecutar las dos»; cuando termine, vuelve a ejecutar uno de los paneles.
**Resultado esperado:**
- La primera vez la consola dice «Preparando Python…» (puede tardar unos segundos: descarga Pyodide).
- Un error muestra el traceback solo con las líneas del programa (`File "programa.py", line 2`), sin las internas del intérprete.
- La segunda ejecución empieza enseguida: Python ya está cargado.
- `input()` no espera teclado: termina con `EOFError`.

### P-05 · SQL
**Pasos:** en la publicación de SQL, pulsa «▶ Ejecutar las dos».
**Resultado esperado:**
- Cada ejecución usa una base SQLite nueva en memoria: las tablas que crea el código no quedan para la siguiente.
- El resultado de cada SELECT se muestra como una tabla con sus columnas; `NULL` en cursiva. Con más de 200 filas se muestran las primeras 200 y lo dice.
- Un error de SQL se muestra en coral, por ejemplo «Error: near "SELEC": syntax error».

### P-06 · Go y error de compilación
**Pasos:** en la publicación de Go, pulsa «▶ Ejecutar las dos». Luego, en «Publicar código» con Go, ejecuta:

```go
package main

func main() {
	x := 1
}
```

**Resultado esperado:**
- La consola dice «Ejecutando en el Go Playground…» y luego muestra la salida y el tiempo de ida y vuelta.
- El programa con error no compila: la consola muestra `./prog.go:4:2: declared and not used: x` en coral y «Terminó con error».
- Los avisos de `go vet` aparecen en gris, sin contar como error.

### P-07 · Un ciclo infinito se corta a los 5 s
**Pasos:** en «Publicar código» con JavaScript, ejecuta:

```js
console.log("antes del ciclo");
while (true) {}
```

**Resultado esperado:** a los 5 segundos la consola dice «Se detuvo a los 5 s», muestra «antes del ciclo» y explica que el programa no terminó a tiempo. Mientras tanto la página sigue respondiendo (se puede desplazar y escribir). Lo mismo pasa con un ciclo infinito en Python o con una consulta recursiva sin fin en SQL.

### P-08 · Límite de ejecuciones de Go
**Pasos:** ejecuta un programa de Go 11 veces en menos de un minuto con la misma cuenta.
**Resultado esperado:** a partir de la ejecución 11 la consola dice «No se ejecutó» y «Llegaste al límite de 10 ejecuciones por minuto, espera un momento.». El límite es por persona: otra cuenta puede ejecutar. Al minuto se recupera.

### P-09 · Java, PHP y otros lenguajes
**Pasos:** abre la publicación de Java y, en «Publicar código», elige PHP.
**Resultado esperado:** el botón «▶ Ejecutar» está deshabilitado, no aparece «▶ Ejecutar las dos» y en lugar de la consola se lee «Ejecución no disponible para este lenguaje todavía.».

### P-10 · Mejora verificada por ejecución
**Pasos:**
1. Con una cuenta que no hizo la mejora (por ejemplo, el autor de la publicación), abre una publicación con mejora aceptada que cambie la salida y pulsa «▶ Ejecutar las dos».
2. Abre el portafolio de quien hizo la mejora.
3. Repite el paso 1 con otra publicación, pero con la cuenta de quien hizo la mejora.

**Resultado esperado:**
- En el paso 1, si la mejora corre sin errores y su salida es distinta, aparece «✓ Mejora verificada por ejecución» y en la base `propuestas_mejora.verificada_en` queda con la fecha.
- En el paso 2, la mejora aparece en «Mejores aportes» con el sello «✓ Mejora verificada por ejecución».
- En el paso 3 se ve el veredicto, pero la mejora no queda verificada: se lee «Cuando otra persona la ejecute y vea este resultado, quedará verificada en tu perfil.».
- Si la mejora termina con error, se detiene o produce la misma salida, no se verifica.

### P-11 · Aislamiento y límite de salida
**Pasos:** en «Publicar código» con JavaScript, ejecuta:

```js
const r = [];
r.push("document:" + typeof document, "localStorage:" + typeof localStorage, "parent:" + typeof parent);
try { await fetch("/api/v1/auth/refresh", { method: "POST" }); r.push("fetch:abierto"); } catch (e) { r.push("fetch:bloqueado"); }
console.log(r.join(" "));
```

Luego ejecuta `for (let i = 0; i < 5000; i++) console.log("línea " + i);`.

**Resultado esperado:**
- La primera imprime `document:undefined localStorage:undefined parent:undefined fetch:bloqueado`: el código no tiene acceso a la página, a las cookies, a la sesión ni a la red.
- En las herramientas de desarrollo (Elements) el ejecutor es un `<iframe src="/ejecutor.html" sandbox="allow-scripts">` oculto, sin `allow-same-origin`.
- La segunda muestra hasta 10.000 caracteres y avisa «La salida se recortó a 10.000 caracteres.».
- Abrir `/ejecutor.html` directamente no hace nada.

### P-12 · Celular (360 px)
**Pasos:** repite P-02 con 360 px de ancho.
**Resultado esperado:** los dos paneles quedan uno debajo del otro, las líneas largas se desplazan dentro de cada bloque y la página no se desplaza de lado.

### P-13 · API de ejecución y verificación
**Pasos:** con un token de sesión llama `POST /api/v1/ejecutar/go` con `{"codigo": "package main\n\nimport \"fmt\"\n\nfunc main() { fmt.Println(\"hola\") }"}`; luego sin token, con `codigo` vacío y con más de 64 KB. Después llama `POST /api/v1/propuestas/<id>/verificacion` con la cuenta de quien hizo la mejora y con una propuesta pendiente.
**Resultado esperado:**
- 200 con `resultado.salida` = `[{ "flujo": "stdout", "texto": "hola\n" }]`, `error` en false y `ms`.
- Sin token 401; sin código 400; con más de 64 KB 413 (`CODIGO_MUY_GRANDE`). Si el Go Playground no responde en 10 s, 504 (`TIEMPO_AGOTADO`).
- La verificación responde 403 (`PROPIA_MEJORA`) al autor de la mejora y 409 (`NO_ACEPTADA`) con una propuesta pendiente.
- La API nunca compila ni ejecuta código: Go va al Go Playground oficial y el resto corre en el navegador.

---

## 2. Soluciones de retos frente al uso de IA

### R-01 · Explicación obligatoria
**Pasos:** como estudiante, abre un reto abierto y envía una solución con la explicación «Uso filter y reduce.».
**Resultado esperado:**
- El campo se llama «Explica tus decisiones» y debajo dice «Qué cambiaste, qué alternativas descartaste y qué harías con más tiempo. Mínimo 100 caracteres: N/100». El contador cambia a verde al llegar a 100.
- Con menos de 100 caracteres no se envía: «Explica tus decisiones en al menos 100 caracteres: qué cambiaste, qué alternativas descartaste y qué harías con más tiempo.».
- La API exige lo mismo: responde 400 `EXPLICACION_CORTA`.

### R-02 · Declaración de uso de IA
**Pasos:** en el mismo formulario escribe una explicación de más de 100 caracteres y envía sin responder la pregunta; luego elige «Sí, para generar parte del código», escribe «Le pedí un ejemplo de reduce y lo adapté.» en «¿Cómo la usaste? (opcional)» y envía.
**Resultado esperado:**
- La pregunta «¿Usaste inteligencia artificial?» tiene tres opciones: «No», «Sí, para consultar dudas» y «Sí, para generar parte del código».
- Sin respuesta no se envía: «Indica si usaste inteligencia artificial para resolver el reto.» (la API responde 400 `USO_IA_REQUERIDO`).
- Con respuesta, la solución se envía. En una publicación que no es reto no aparece la pregunta y la explicación sigue pidiendo 10 caracteres.

### R-03 · Quién ve la declaración
**Pasos:** abre el reto con la cuenta de la empresa, con la de quien envió la solución y con la de otro estudiante.
**Resultado esperado:** la empresa y quien envió la solución ven, junto a ella, «¿Usó inteligencia artificial? Sí, para generar parte del código «Le pedí un ejemplo de reduce y lo adapté.»». El otro estudiante no la ve (la API tampoco se la envía).

### R-04 · Invitar a defensa en vivo
**Pasos:** con la empresa dueña del reto, pulsa «Invitar a defensa en vivo» en una solución, revisa la fecha propuesta (mañana a esta hora) y pulsa «Enviar invitación».
**Resultado esperado:**
- La fecha debe estar entre ahora y 30 días adelante.
- La solución muestra «Defensa en vivo · <fecha> · 15 min» con «Entrar a la sala ↗», «Marcar como realizada», «Defensa aprobada» y «Cancelar».
- La sala es privada y con nombre aleatorio (`https://meet.jit.si/devconnect-defensa-…`): solo la ven la empresa y ese estudiante.
- Una segunda invitación a la misma solución mientras la primera está vigente responde 409 `DEFENSA_VIGENTE`. Un estudiante no puede invitar (403) y una solución rechazada no se puede citar.

### R-05 · El estudiante recibe el aviso
**Pasos:** entra con la cuenta del estudiante citado y abre el feed, «En vivo» y su solución en el reto.
**Resultado esperado:**
- La franja del feed dice «Defensa en vivo con <Empresa> · en …» con el enlace «Ver», hasta que termine la defensa.
- En «En vivo» aparece «Tus defensas en vivo» con el reto, la fecha y la hora, «Entrar a la sala ↗» y «Ver la solución».
- En su solución lee «<Empresa> te invitó a defender tu solución en vivo. Es una sala privada de Jitsi de 15 minutos.».
- Otro estudiante no ve la defensa en ninguna de esas pantallas.

### R-06 · Estados de la defensa
**Pasos:** con la empresa, cancela una defensa invitada y vuelve a citar; marca otra como realizada y después pulsa «Defensa aprobada».
**Resultado esperado:**
- La cancelada queda como «Cancelada» en «En vivo» y se puede citar de nuevo a la misma solución.
- La realizada muestra «Defensa realizada» y todavía puede aprobarse; la aprobada muestra «✓ Defensa aprobada».
- No se puede reactivar una cancelada, cancelar una realizada ni quitar una aprobación (409 `TRANSICION_INVALIDA`).

### R-07 · Defensa aprobada en el perfil
**Pasos:** aprueba la defensa de la solución ganadora del reto y abre el portafolio de quien la hizo.
**Resultado esperado:** en «Mejores aportes», junto a «Resolvió el reto de <empresa>», aparece «✓ Defensa aprobada».

### R-08 · Guía para la empresa
**Pasos:** con la empresa suscrita, abre «Retos» y pulsa «+ Publicar reto».
**Resultado esperado:** arriba del formulario está el recuadro «Cómo hacer un buen reto»: usar el contexto real de la empresa (un fragmento de su código o las restricciones de su negocio) y pedir que se justifiquen las decisiones, porque esos retos son más difíciles de resolver solo con inteligencia artificial.

### R-09 · API de defensas
**Pasos:** llama `POST /api/v1/propuestas/<id>/defensa` con `{"inicia_en": "<fecha ISO>"}` como empresa dueña del reto, `PATCH /api/v1/defensas/<id>` con `{"estado": "realizada", "aprobada": true}` y `GET /api/v1/defensas` con el estudiante citado y con otro.
**Resultado esperado:** 201 con la defensa (`estado` «invitada», `duracion_min` 15 y `sala`); 200 con la defensa aprobada; el estudiante citado la recibe en `defensas` y el otro no. Una fecha a más de 30 días responde 400 `FECHA_INVALIDA` y una publicación que no es reto, 400 `NO_ES_RETO`.

---

## 3. Tarjeta de talento compartible

### T-01 · Solo el dueño la ve
**Pasos:** abre tu propio portafolio y luego el de otra persona.
**Resultado esperado:** el botón «Compartir mi tarjeta» aparece solo en tu portafolio, junto a «Editar perfil».

### T-02 · Vista previa
**Pasos:** pulsa «Compartir mi tarjeta».
**Resultado esperado:**
- Se abre un diálogo con el mensaje «Preparando tu tarjeta…» y luego la vista previa en formato Historia.
- Con los botones «Historia 1080 × 1920» y «Publicación 1200 × 1200» cambia la vista previa.
- El diálogo se cierra con ✕ o con Esc, y el foco vuelve al botón que lo abrió.

### T-03 · Contenido
**Pasos:** revisa la vista previa de un estudiante con actividad.
**Resultado esperado:**
- La tarjeta tiene el logotipo [D]evconnect, el eslogan «De hola mundo / a tu primer empleo.», y el nombre, titular, institución y semestre.
- Muestra las cifras en grande: tasa de aceptación (%), mejoras aceptadas, personas a las que ayudó y sesiones dictadas. Las que valen cero no aparecen.
- Aparecen hasta 4 lenguajes con su logo, según su actividad, y la mejora más destacada: su título y 3 o 4 líneas del diff, con + y −.
- Abajo está el QR con «Mira mi portafolio verificado» y la nota «Datos verificados por la actividad en DevConnect».
- La tarjeta no muestra el correo ni otros datos de contacto.

### T-04 · Sin cifras
**Pasos:** abre la tarjeta de un estudiante sin actividad.
**Resultado esperado:** en lugar de las cifras aparece «Empezando mi camino en DevConnect»; si no tiene mejoras aceptadas, no aparece la sección de mejora destacada.

### T-05 · Descargar
**Pasos:** pulsa «Descargar historia» y luego «Descargar publicación».
**Resultado esperado:** se descargan `devconnect-<usuario>-historia.png` (1080 × 1920 px) y `devconnect-<usuario>-publicacion.png` (1200 × 1200 px). `<usuario>` es el de GitHub o, si no lo tiene, su nombre en minúsculas y sin tildes.

### T-06 · El QR funciona
**Pasos:** escanea el QR de la imagen descargada con la cámara de un teléfono.
**Resultado esperado:**
- Abre `<dominio>/portafolio/<id>`.
- Si quien lo escanea no ha iniciado sesión, primero ve el inicio de sesión (la URL lleva `?volver=/portafolio/<id>`). Al entrar, llega directamente a ese portafolio.

### T-07 · Compartir desde el celular
**Pasos:** en un celular cuyo navegador permita compartir archivos (Chrome en Android, Safari en iPhone), abre la tarjeta.
**Resultado esperado:** aparece el botón «Compartir» y abre el menú nativo con la imagen del formato elegido. En navegadores sin esa función el botón no aparece.

### T-08 · Celular y movimiento reducido
**Pasos:** abre la tarjeta con 360 px de ancho, y luego con el movimiento reducido activo.
**Resultado esperado:** el diálogo cabe en la pantalla, la vista previa se ajusta al ancho y los botones de descarga quedan uno debajo del otro. Con movimiento reducido el diálogo aparece sin animación.

---

## 4. Árbol de evolución del código

### E-01 · Botón «Evolución»
**Pasos:** abre una publicación sin propuestas y luego una con propuestas.
**Resultado esperado:** el botón «Evolución» aparece junto al título «Propuestas de mejora (N)» solo cuando hay al menos una propuesta. Al pulsarlo muestra el árbol y su texto cambia a «Ocultar evolución».

### E-02 · Árbol horizontal (escritorio)
**Pasos:** con la ventana ancha, abre la evolución de la publicación de prueba.
**Resultado esperado:**
- A la izquierda está el nodo «Versión original», con el avatar del autor y la fecha.
- Hay una rama por propuesta, por fecha, con avatar, fecha y resumen («+3 −1 líneas»).
- La aceptada va en azul, más gruesa, con «✓ Aceptada» (en un reto, «✓ Ganadora») y termina en el nodo «Versión actual».
- La pendiente es gris y con línea discontinua, y lleva la etiqueta «Pendiente». La rechazada es gris claro, con la etiqueta «Rechazada».

### E-03 · Resumen
**Resultado esperado:** debajo del árbol se lee «N personas propusieron mejoras · M aceptadas» (en singular cuando corresponde; en un reto, «enviaron soluciones · ganadoras»).

### E-04 · Animación al abrir
**Pasos:** oculta y vuelve a mostrar la evolución.
**Resultado esperado:** las ramas se dibujan de izquierda a derecha en menos de un segundo y los nodos aparecen en orden.

### E-05 · Explicación al pasar el mouse
**Pasos:** pasa el mouse por un nodo de propuesta; luego recorre los nodos con Tab.
**Resultado esperado:** aparece un globo oscuro con la explicación de esa propuesta, tanto con el mouse como con el foco del teclado; al salir del nodo, desaparece.

### E-06 · Ir a la propuesta
**Pasos:** haz clic en un nodo de propuesta, en «Versión actual» y en «Versión original».
**Resultado esperado:**
- La página baja hasta la propuesta (o hasta el código original) y la marca con un borde azul durante unos 2 segundos.
- «Versión actual» lleva a la propuesta aceptada.
- Con Enter sobre un nodo enfocado pasa lo mismo.

### E-07 · Celular (360 px)
**Pasos:** abre la evolución con 360 px de ancho.
**Resultado esperado:** el árbol pasa a vertical: una lista con sangría por nivel, unida por un tronco a la izquierda, sin desplazamiento horizontal. El primer toque sobre un nodo muestra la explicación; el segundo lleva a la propuesta.

### E-08 · Movimiento reducido
**Pasos:** activa el movimiento reducido y abre la evolución.
**Resultado esperado:** el árbol aparece completo de una vez, sin animación de ramas ni de nodos; al elegir un nodo, el salto a la propuesta es inmediato y el borde azul igual se ve.

---

## 5. Métricas del modelo de negocio (API)

### Crear un usuario administrador
El rol `admin` no se puede elegir al registrarse. Para crear uno:

1. Registra la cuenta normalmente en `/registro`, como estudiante, con el correo que será administrador.
2. En la base de datos, ejecuta:

   ```sql
   UPDATE usuarios SET rol = 'admin' WHERE correo = 'admin@tudominio.co';
   -- El administrador no es estudiante: se quita su perfil para que no aparezca en búsquedas.
   DELETE FROM perfiles_estudiante WHERE usuario_id = (SELECT id FROM usuarios WHERE correo = 'admin@tudominio.co');
   ```

3. Si tenía la sesión abierta, debe cerrarla y entrar de nuevo: el rol viaja dentro del token.

### Consultar las métricas
Obtén un token iniciando sesión y llama el endpoint (`<API>` es, por ejemplo, `http://localhost:8080`):

```bash
TOKEN=$(curl -s -X POST <API>/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"correo":"admin@tudominio.co","contrasena":"..."}' | jq -r .token_acceso)
curl -s "<API>/api/v1/admin/metricas?desde=2026-10-01&hasta=2026-10-31" -H "Authorization: Bearer $TOKEN"
```

En PowerShell:

```powershell
$token = (Invoke-RestMethod -Method Post -Uri "<API>/api/v1/auth/login" -ContentType 'application/json' `
  -Body '{"correo":"admin@tudominio.co","contrasena":"..."}').token_acceso
Invoke-RestMethod -Uri "<API>/api/v1/admin/metricas?desde=2026-10-01&hasta=2026-10-31" -Headers @{ Authorization = "Bearer $token" }
```

Los días son de Colombia y el rango incluye las dos fechas. Sin `desde` cuenta toda la historia; sin `hasta`, llega hasta hoy.

### M-01 · Solo el administrador
**Pasos:** llama el endpoint sin token, con el token de un estudiante, con el de una empresa y con el del administrador.
**Resultado esperado:** 401, 403 (`ROL_NO_PERMITIDO`), 403 y 200, en ese orden.

### M-02 · Estructura de la respuesta
**Resultado esperado:** `metricas` trae:
- `desde` (o `null`) y `hasta`.
- `usuarios.registrados_por_rol` (estudiante, empresa y admin) y `usuarios.activos_7_dias` / `activos_30_dias`.
- `retencion.cohorte`, y `retencion.dia_1` / `dia_7` con `elegibles`, `volvieron` y `tasa`.
- `colaboracion` (publicaciones, propuestas, propuestas aceptadas, colaboradores distintos).
- `empresas` (registradas, suscritas, tasa de conversión, con plan activo).
- `contactos_vistos` (total y únicos).

### M-03 · Fechas inválidas
**Pasos:** llama `?desde=2026-13-01` y luego `?desde=2026-10-09&hasta=2026-10-01`.
**Resultado esperado:** 400 `DATOS_INVALIDOS` en los dos casos.

### M-04 · Inicio de sesión, como máximo uno por día
**Pasos:** inicia sesión dos veces con la misma cuenta y recarga la página (renueva el token). Luego ejecuta:

```sql
SELECT tipo, count(*) FROM eventos WHERE usuario_id = (SELECT id FROM usuarios WHERE correo = '...') GROUP BY tipo;
```

**Resultado esperado:** un solo `inicio_sesion` para ese día. Al día siguiente, la primera renovación del token registra otro.

### M-05 · Contacto visto
**Pasos:**
1. Con una empresa suscrita, abre el portafolio de un estudiante que muestra su correo, dos veces.
2. Guarda dos estudiantes y abre «Mis candidatos».
3. Abre el portafolio de un estudiante que ocultó su correo.

**Resultado esperado:**
- Un `contacto_visto` por estudiante y día, con `objetivo_id` = el estudiante; repetir la visita no suma.
- El estudiante que ocultó su correo no genera evento, y tampoco una empresa sin plan.
- `contactos_vistos.total` cuenta los eventos y `contactos_vistos.unicos` las parejas empresa-estudiante.

### M-06 · Suscripción
**Pasos:** con una empresa sin plan, activa uno en «Planes».
**Resultado esperado:** se registra un evento `suscripcion` con `objetivo_id` = la suscripción, y sube `empresas.suscritas`.

### M-07 · Retención
**Pasos:** simula que un usuario se registró ayer y que hoy vuelve:

```sql
UPDATE usuarios SET creado_en = now() - interval '1 day' WHERE correo = '...';
```

Después inicia sesión con esa cuenta y consulta las métricas.

**Resultado esperado:** en `retencion.dia_1`, `elegibles` y `volvieron` suben en 1. Solo cuentan como elegibles quienes ya llegaron al día 1 o al día 7 desde su registro.

### M-08 · El registro de eventos no bloquea
**Pasos:** en una base de pruebas, con la API encendida, simula que registrar eventos falla, inicia sesión y luego deja la tabla como estaba:

```sql
ALTER TABLE eventos RENAME TO eventos_pausa;
-- ... inicia sesión en la aplicación ...
ALTER TABLE eventos_pausa RENAME TO eventos;
```

**Resultado esperado:** el inicio de sesión funciona igual (200); en el log de la API aparece «métricas: no se pudo registrar un evento».

---

## 6. Campo de código

### C-01 · Pegar código
**Pasos:** copia un código de 20 líneas con sangrías (de un editor, de una página web o de un documento) y pégalo con Ctrl+V y con clic derecho › Pegar en «Publicar código», en «Proponer una mejora» y en la solución de un reto. Envía cada formulario.
**Resultado esperado:** se guarda idéntico, con sus 20 líneas y sus sangrías. Los finales de línea de Windows quedan como saltos normales, y los espacios duros de una página web quedan como espacios. Al abrir la publicación o la propuesta, el código se ve en varias líneas.

### C-02 · Comparar con el original
**Pasos:** en «Proponer una mejora», deja el código original y solo agrega espacios al final de algunas líneas; envía. Luego cambia la sangría de una línea y envía.
**Resultado esperado:** el primer envío responde «Tu versión es igual al código original: cambia algo antes de proponer.»; el segundo se envía, porque un cambio de sangría sí cuenta.

### C-03 · Texto que llega sin escribir
**Pasos:** llena el campo de código con el autocompletado del navegador, una extensión o un gestor de portapapeles, y envía sin tocar el teclado.
**Resultado esperado:** se envía lo que se ve en el campo, no el código original.

---

## 7. Interfaz

### I-01 · Logotipo
**Pasos:** observa el logotipo «[D]evconnect» del encabezado durante unos segundos, en escritorio y a 360 px.
**Resultado esperado:** la barra azul de la D queda fija (nunca se lee «Ɔevconnect»); solo parpadean la pantalla de entrada y el indicador de carga. La D mide lo mismo que las mayúsculas del texto, se apoya en la línea base y queda a 1 o 2 px de «evconnect».

### I-02 · Encabezado sólido
**Pasos:** desplázate hacia abajo en el feed.
**Resultado esperado:** el contenido no se ve por detrás del encabezado.

### I-03 · Planes
**Pasos:** abre `/planes` con una empresa y con un estudiante.
**Resultado esperado:** la empresa ve «Encuentra talento real.» y, resaltado en azul, «Contrátalo antes que nadie.», con el párrafo de los planes. El estudiante solo ve «DevConnect es gratis para estudiantes.» y el botón «Ir al feed →».

### I-04 · Filtros y avatar del feed
**Pasos:** abre el feed en escritorio y a 360 px; toca «Retos» dos veces.
**Resultado esperado:**
- Fila 1: «Código | Retos» y «Necesita mejoras | Mejorado» como controles segmentados y, a la derecha, «Todas las instituciones». Fila 2: los lenguajes en una sola línea que se desplaza de lado.
- El filtro activo queda con fondo oscuro; al tocarlo otra vez se desactiva.
- El avatar de cada tarjeta es un círculo completo de 40 px.
- A 360 px cada fila se desplaza de lado y la página no.
