/* =========================================================
   Prepárate ante El Niño · lógica base
   Cada fase se programará en su propio prompt (MVP 2 a 6).
   ========================================================= */

/* ---------- 1. Estado del juego ----------
   Guarda el puntaje de cada fase solo en memoria.
   Se borra al cerrar la página (no se usan datos personales). */
const estado = {
  puntajes: { 1: 0, 2: 0, 3: 0, 4: 0 },
  completadas: { 1: false, 2: false, 3: false, 4: false },
  finalizadas: { 1: false, 2: false, 3: false, 4: false }, // NUEVO: fase terminada, con o sin puntaje
  jugarSinTiempo: false, // se usará en el Ajuste 1
  apodo: ""              // NUEVO: apodo del jugador, solo en memoria
};

const NOMBRES_FASES = {
  1: "Arma tu mochila",
  2: "Salva a las mascotas",
  3: "Ruta de evacuación",
  4: "Volver seguro"
};

const PANTALLAS = ["portada", "fase-1", "fase-2", "fase-3", "fase-4", "cierre"];

/* ---------- 2. Navegación entre pantallas ----------
   Usa el # de la dirección (por ejemplo #fase-2) para mostrar
   una pantalla y ocultar las demás. */
function mostrarPantalla() {
  let id = location.hash.replace("#", "");
  if (!PANTALLAS.includes(id)) id = "portada";

  // NUEVO: si la pantalla está bloqueada, el jugador se queda donde estaba
  if (!puedeEntrar(id)) {
    const volver = pantallaActual || "portada";
    history.replaceState(null, "", "#" + volver); // vuelve el # sin recargar
    avisarBloqueo();
    if (pantallaActual) return;
    id = volver;
  }

  PANTALLAS.forEach((p) => {
    document.getElementById(p).classList.toggle("activa", p === id);
  });

  // Marca la fase actual en la barra de progreso
  document.querySelectorAll(".progreso a").forEach((enlace) => {
    enlace.classList.toggle("actual", enlace.getAttribute("href") === "#" + id);
  });

  // NUEVO: transición entre pantallas y flechas laterales
  animarTransicion(id);
  actualizarFlechas(id);
  actualizarIndicadores(id);

  // El botón "Continuar jugando" de la portada lleva a la fase pendiente
  document.getElementById("boton-continuar").href = "#" + primeraPendiente();

  // Cada fase tiene su función de inicio
  if (id === "fase-1") iniciarFase1();
  if (id === "fase-2") iniciarFase2();
  if (id === "fase-3") iniciarFase3();
  if (id === "fase-4") iniciarFase4();
  if (id === "cierre") mostrarCierre();

  // En el cierre la lluvia se detiene de a poco (ver detenerLluvia)
  if (id !== "cierre") {
    intensidadLluvia = id === "portada" ? 0.3 : 0.3 + PANTALLAS.indexOf(id) * 0.12;
    if (reducirMovimiento) dibujarLluvia(); // sin animación: solo vuelve a dibujar la lluvia quieta
    else if (typeof reanudarLluvia === "function") reanudarLluvia();
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", mostrarPantalla);

/* ---------- NUEVO: flechas laterales y transición ---------- */

// Nombre que muestran las flechas para cada pantalla
const NOMBRES_PANTALLAS = {
  portada: "Inicio",
  "fase-1": "Arma tu mochila",
  "fase-2": "Salva a las mascotas",
  "fase-3": "Ruta de evacuación",
  "fase-4": "Volver seguro",
  cierre: "Calificaciones"
};

let pantallaActual = null;

// La pantalla nueva entra desde la derecha (avanzar) o desde la izquierda (volver),
// mientras una ola de agua cruza la pantalla.
function animarTransicion(id) {
  if (pantallaActual && pantallaActual !== id) {
    const avanza = PANTALLAS.indexOf(id) > PANTALLAS.indexOf(pantallaActual);
    const nueva = document.getElementById(id);
    // La sacudida nunca se repite al cambiar de pantalla (por ejemplo, al retroceder)
    document.querySelectorAll(".pantalla.sacudida").forEach((p) => p.classList.remove("sacudida"));
    nueva.classList.remove("entra-derecha", "entra-izquierda");
    void nueva.offsetWidth; // reinicia la animación
    nueva.classList.add(avanza ? "entra-derecha" : "entra-izquierda");

    const ola = document.getElementById("ola-transicion");
    ola.classList.remove("ola-avanza", "ola-vuelve");
    void ola.offsetWidth;
    ola.classList.add(avanza ? "ola-avanza" : "ola-vuelve");
  }
  pantallaActual = id;
}

// Actualiza destino, texto y visibilidad de las flechas
function actualizarFlechas(id) {
  const i = PANTALLAS.indexOf(id);
  const anterior = PANTALLAS[i - 1];
  const siguiente = PANTALLAS[i + 1];
  const flechaAnt = document.getElementById("flecha-anterior");
  const flechaSig = document.getElementById("flecha-siguiente");

  flechaAnt.hidden = !anterior;
  if (anterior) {
    flechaAnt.href = "#" + anterior;
    document.getElementById("flecha-anterior-nombre").textContent = NOMBRES_PANTALLAS[anterior];
    flechaAnt.setAttribute("aria-label", "Ir a la pantalla anterior: " + NOMBRES_PANTALLAS[anterior]);
  }

  flechaSig.hidden = !siguiente;
  const bloqueada = siguiente && !puedeEntrar(siguiente);
  if (siguiente) {
    flechaSig.href = "#" + siguiente;
    document.getElementById("flecha-siguiente-nombre").textContent = NOMBRES_PANTALLAS[siguiente];
    flechaSig.setAttribute(
      "aria-label",
      bloqueada
        ? "Bloqueado: termina esta pantalla para ir a " + NOMBRES_PANTALLAS[siguiente]
        : "Ir a la pantalla siguiente: " + NOMBRES_PANTALLAS[siguiente]
    );
  }
  flechaSig.classList.toggle("bloqueada", Boolean(bloqueada));

  // La flecha siguiente "llama la atención" cuando ya se puede avanzar
  flechaSig.classList.toggle("llamar", Boolean(siguiente) && !bloqueada && (id === "portada" || id.startsWith("fase-")));
}

/* ---------- MODO DESARROLLO ----------
   true  = se puede entrar a cualquier fase sin apodo ni terminar la anterior (para probar).
   false = el juego funciona con el bloqueo de fases (versión final).
   IMPORTANTE: cambiar a false antes de entregar o publicar el juego. */
const MODO_DESARROLLO = false;

/* ---------- NUEVO: indicador de fases bajo cada título ---------- */
const PASOS_INDICADOR = [
  { id: "fase-1", nombre: "Antes" },
  { id: "fase-2", nombre: "Alerta" },
  { id: "fase-3", nombre: "Durante" },
  { id: "fase-4", nombre: "Después" },
  { id: "cierre", nombre: "Calificaciones" }
];

// Agrega el indicador debajo del título de cada fase y de Calificaciones
function crearIndicadores() {
  document.querySelectorAll(".pantalla .cabecera-fase").forEach((cabecera) => {
    const lista = document.createElement("ol");
    lista.className = "indicador-fases";
    lista.setAttribute("aria-label", "Progreso del juego");
    lista.innerHTML = PASOS_INDICADOR.map(
      (p, i) => `<li data-paso="${p.id}"><span class="punto">${i < 4 ? i + 1 : "★"}</span><span class="nombre">${p.nombre}</span></li>`
    ).join("");
    cabecera.querySelector("h1").after(lista);
  });
}

// Marca el paso actual y los pasos ya terminados
function actualizarIndicadores(id) {
  document.querySelectorAll(".indicador-fases li").forEach((li) => {
    const paso = li.dataset.paso;
    const fase = Number(paso.replace("fase-", ""));
    li.classList.toggle("actual", paso === id);
    li.classList.toggle("hecha", fase >= 1 && fase <= 4 && estado.finalizadas[fase]);
    if (paso === id) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
}

/* ---------- NUEVO: bloqueo de fases ----------
   Para jugar hay que registrar un apodo, y para avanzar hay que
   terminar la fase actual (con o sin puntaje). */

// Primera fase que falta terminar (o "cierre" si ya terminó todas)
function primeraPendiente() {
  for (let f = 1; f <= 4; f++) if (!estado.finalizadas[f]) return "fase-" + f;
  return "cierre";
}

// ¿El jugador puede entrar a esta pantalla?
function puedeEntrar(id) {
  if (MODO_DESARROLLO) return true; // bloqueo desactivado mientras desarrollamos
  if (id === "portada") return true;
  if (!estado.apodo) return false;
  // Puede entrar a la fase pendiente y a las que ya terminó
  return PANTALLAS.indexOf(id) <= PANTALLAS.indexOf(primeraPendiente());
}

// Sacudida de la pantalla actual + aviso con candado
let temporizadorAviso = null;
function avisarBloqueo() {
  const texto = !estado.apodo
    ? "Escribe tu apodo para comenzar el juego."
    : "Termina esta fase para poder avanzar.";

  const aviso = document.getElementById("aviso-bloqueo");
  document.getElementById("aviso-bloqueo-texto").textContent = texto;
  aviso.hidden = false;
  aviso.classList.remove("mostrar");
  void aviso.offsetWidth;
  aviso.classList.add("mostrar");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (aviso.hidden = true), 2600);

  const pantalla = document.getElementById(pantallaActual || "portada");
  pantalla.classList.remove("sacudida");
  void pantalla.offsetWidth; // reinicia la animación
  pantalla.classList.add("sacudida");
  // Al terminar la sacudida se quita la clase, así no vuelve a aparecer al regresar a esta pantalla
  pantalla.addEventListener("animationend", () => pantalla.classList.remove("sacudida"), { once: true });

  // En celulares, una vibración corta (si el navegador lo permite)
  try {
    const yaInteractuo = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && yaInteractuo) navigator.vibrate(120);
  } catch (e) { /* sin vibración */ }

  if (!estado.apodo) document.getElementById("apodo").focus();
}

// Marca con candado los enlaces a pantallas bloqueadas
function actualizarBloqueos() {
  document.querySelectorAll(".progreso a, .tarjeta-fase").forEach((enlace) => {
    const destino = enlace.getAttribute("href").replace("#", "");
    const bloqueada = !puedeEntrar(destino);
    enlace.classList.toggle("bloqueada", bloqueada);
    if (bloqueada) enlace.setAttribute("aria-disabled", "true");
    else enlace.removeAttribute("aria-disabled");
  });
  if (pantallaActual) actualizarFlechas(pantallaActual);
}

// Una fase termina (se logre o no el puntaje) y se desbloquea la siguiente
function finalizarFase(fase) {
  estado.finalizadas[fase] = true;
  actualizarBloqueos();
  if (pantallaActual) actualizarIndicadores(pantallaActual);
}

/* ---------- 3. Puntaje ---------- */
function sumarPuntos(fase, puntos) {
  estado.puntajes[fase] += puntos;
  actualizarPuntaje();
}

function completarFase(fase) {
  estado.completadas[fase] = true;
  const enlace = document.querySelector(`.progreso a[data-fase="${fase}"]`);
  if (enlace) enlace.classList.add("completada");
  finalizarFase(fase); // NUEVO: desbloquea la siguiente fase y actualiza las flechas
}

function actualizarPuntaje() {
  const total = Object.values(estado.puntajes).reduce((a, b) => a + b, 0);
  document.getElementById("puntaje-total").textContent = total;
}

/* ---------- 4. Fases (se completan con cada prompt) ---------- */

/* =========================================================
   4.1 FASE 1 · Antes: Arma tu mochila contrarreloj
   ========================================================= */

// Valores ajustables de la fase (los de la guía de prompts)
const CONFIG_FASE1 = {
  tiempo: 60,         // segundos de la cuenta regresiva
  alertaDesde: 10,    // el número se pone naranjo en los últimos segundos
  puntosAcierto: 10,
  puntosError: 5,
  maximo: 100         // puntaje máximo de la fase
};

// Objetos de la mochila: 9 correctos y 6 incorrectos.
// [VERIFICAR CON SENAPRED]
const OBJETOS_MOCHILA = [
  { id: "agua", nombre: "Agua embotellada", esCorrecto: true, explicacion: "El agua potable puede cortarse durante una emergencia." },
  { id: "lata", nombre: "Alimentos no perecibles", esCorrecto: true, explicacion: "Duran mucho tiempo y no necesitan refrigeración." },
  { id: "linterna", nombre: "Linterna", esCorrecto: true, explicacion: "Los cortes de luz son comunes durante los temporales." },
  { id: "radio", nombre: "Radio a pilas", esCorrecto: true, explicacion: "Permite escuchar información oficial sin internet ni electricidad." },
  { id: "botiquin", nombre: "Botiquín", esCorrecto: true, explicacion: "Sirve para atender heridas leves." },
  { id: "docs", nombre: "Documentos en bolsa plástica", esCorrecto: true, explicacion: "Protegidos del agua, ayudan con los trámites después de la emergencia." },
  { id: "impermeable", nombre: "Impermeable", esCorrecto: true, explicacion: "Te mantiene seco y abrigado bajo la lluvia." },
  { id: "silbato", nombre: "Silbato", esCorrecto: true, explicacion: "Sirve para pedir ayuda si quedas aislado." },
  { id: "bateria", nombre: "Batería portátil", esCorrecto: true, explicacion: "Mantiene el celular cargado para comunicarte." },
  { id: "secador", nombre: "Secador de pelo", esCorrecto: false, explicacion: "Necesita electricidad y ocupa espacio en la mochila." },
  { id: "consola", nombre: "Consola de videojuegos", esCorrecto: false, explicacion: "Gasta batería y ocupa espacio que necesitas para lo esencial." },
  { id: "plancha", nombre: "Plancha", esCorrecto: false, explicacion: "Es pesada y necesita electricidad." },
  { id: "perfume", nombre: "Perfume", esCorrecto: false, explicacion: "Ocupa espacio y nada aporta a tu seguridad." },
  { id: "tostadora", nombre: "Tostadora", esCorrecto: false, explicacion: "Es pesada y necesita electricidad." },
  { id: "taco", nombre: "Zapatos de taco", esCorrecto: false, explicacion: "Para evacuar necesitas calzado cómodo y firme." }
];

// Íconos SVG simples de cada objeto (dibujados en un cuadro de 48 x 48)
const ICONOS_MOCHILA = {
  agua: '<rect x="17" y="12" width="14" height="30" rx="5" fill="#7fd0e8"/><rect x="19" y="6" width="10" height="7" rx="2" fill="#1d5fa8"/><rect x="17" y="22" width="14" height="8" fill="#1d5fa8" opacity=".5"/>',
  lata: '<rect x="12" y="12" width="24" height="28" rx="4" fill="#b8c4cc"/><rect x="12" y="19" width="24" height="13" fill="#d64541"/><ellipse cx="24" cy="12" rx="12" ry="3" fill="#8a99a3"/>',
  linterna: '<path d="M30 18l10-6v24l-10-6z" fill="#f5c518" opacity=".55"/><rect x="8" y="19" width="16" height="10" rx="3" fill="#3a4a55"/><path d="M24 17h6v14h-6z" fill="#596a75"/>',
  radio: '<rect x="7" y="16" width="34" height="24" rx="4" fill="#3a4a55"/><circle cx="18" cy="28" r="7" fill="#8a99a3"/><rect x="28" y="22" width="9" height="4" rx="1" fill="#f0a447"/><path d="M34 16l6-10" stroke="#3a4a55" stroke-width="2.5" stroke-linecap="round"/>',
  botiquin: '<rect x="8" y="14" width="32" height="26" rx="4" fill="#fff" stroke="#d64541" stroke-width="2"/><rect x="19" y="10" width="10" height="5" rx="2" fill="#d64541"/><path d="M21 20h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#d64541"/>',
  docs: '<rect x="9" y="10" width="30" height="32" rx="5" fill="#bfe6ef" opacity=".7" stroke="#3fc1d1" stroke-width="2"/><rect x="15" y="15" width="18" height="22" rx="2" fill="#fff"/><path d="M18 21h12M18 26h12M18 31h8" stroke="#8a99a3" stroke-width="2"/>',
  impermeable: '<path d="M17 8h14l9 10-5 4v20H13V22l-5-4z" fill="#f5c518"/><path d="M24 8v34" stroke="#c99a06" stroke-width="2"/>',
  silbato: '<path d="M10 20h20a9 9 0 1 1-9 12H10z" fill="#d64541"/><circle cx="30" cy="29" r="4" fill="#fff"/><path d="M8 20v6" stroke="#3a4a55" stroke-width="3"/>',
  bateria: '<rect x="11" y="10" width="26" height="30" rx="5" fill="#3a4a55"/><path d="M26 14l-8 13h6l-2 9 8-13h-6z" fill="#5fd68f"/>',
  secador: '<path d="M8 14h22a8 8 0 0 1 0 16H22l-3 14h-6l2-14H8z" fill="#c47ed6"/><circle cx="30" cy="22" r="4" fill="#fff"/>',
  consola: '<rect x="6" y="16" width="36" height="18" rx="9" fill="#3a4a55"/><path d="M14 22v6M11 25h6" stroke="#fff" stroke-width="2.5"/><circle cx="32" cy="23" r="2.5" fill="#d64541"/><circle cx="36" cy="27" r="2.5" fill="#3fc1d1"/>',
  plancha: '<path d="M8 34q2-14 18-14h12l2 14z" fill="#8a99a3"/><path d="M18 20q2-8 10-8h8v8" stroke="#3a4a55" stroke-width="3" fill="none"/>',
  perfume: '<rect x="13" y="20" width="22" height="22" rx="6" fill="#f2a6c8"/><rect x="20" y="13" width="8" height="7" fill="#b8c4cc"/><rect x="18" y="8" width="12" height="5" rx="2" fill="#3a4a55"/>',
  tostadora: '<rect x="8" y="18" width="32" height="22" rx="6" fill="#b8c4cc"/><rect x="14" y="14" width="8" height="8" rx="2" fill="#d9a066"/><rect x="26" y="14" width="8" height="8" rx="2" fill="#d9a066"/><circle cx="34" cy="32" r="2" fill="#3a4a55"/>',
  taco: '<path d="M8 32q10 0 16-10q4-4 8 0l6 10v4H12z" fill="#d64541"/><path d="M34 32l2 10" stroke="#3a4a55" stroke-width="3"/>'
};

const TOTAL_CORRECTOS_F1 = OBJETOS_MOCHILA.filter((o) => o.esCorrecto).length;

// Datos de la partida actual de la Fase 1
let fase1 = null;

// Se llama cada vez que el jugador entra a #fase-1
function iniciarFase1() {
  // Si ya terminó la fase, se conserva su resultado.
  // El botón "Reintentar fase" permite jugarla de nuevo.
  if (fase1 && fase1.terminado && estado.completadas[1]) return;
  empezarFase1();
}

// Arma la fase desde cero
function empezarFase1() {
  detenerTemporizadorFase1();

  fase1 = {
    puntos: 0,
    aciertos: 0,
    errores: 0,
    tiempo: CONFIG_FASE1.tiempo,
    revisados: new Set(), // ids de objetos ya usados
    guardados: [],        // ids de objetos correctos en la mochila
    terminado: false,
    temporizador: null
  };

  const contenedor = document.getElementById("juego-fase-1");
  contenedor.innerHTML = `
    <div class="f1-panel">
      <div class="f1-tiempo" id="f1-tiempo">
        <span>Tiempo</span><b id="f1-segundos">${CONFIG_FASE1.tiempo}</b><span>seg</span>
      </div>
      <div class="f1-inventario">
        <span class="f1-dato bien"><b id="f1-aciertos">0</b> de ${TOTAL_CORRECTOS_F1} aciertos</span>
        <span class="f1-dato mal"><b id="f1-errores">0</b> <span id="f1-errores-txt">errores</span></span>
        <span class="f1-dato"><b id="f1-puntos">0</b> puntos</span>
      </div>
      <div class="f1-barra" id="f1-barra" role="progressbar" aria-label="Mochila completada"
           aria-valuemin="0" aria-valuemax="${TOTAL_CORRECTOS_F1}" aria-valuenow="0"><span id="f1-progreso"></span></div>
    </div>
    <p class="solo-lectores" id="f1-aviso" aria-live="assertive"></p>

    <div class="f1-juego">
      <div class="f1-tadeo" id="f1-zona" aria-label="Tadeo y su mochila. Suelta aquí los objetos.">
        <span class="f1-pista">Suelta los objetos sobre Tadeo</span>
      </div>
      <div class="f1-objetos">
        <p class="f1-ayuda">Arrastra cada objeto hasta Tadeo. También puedes tocarlo o elegirlo con Tab y Enter.</p>
        <div class="f1-grilla" id="f1-grilla"></div>
      </div>
    </div>

    <div class="f1-retro" id="f1-retro" aria-live="polite">
      <strong>¿Qué llevarías?</strong> Elige con cuidado: algunos objetos no sirven en una emergencia.
    </div>
    <div class="f1-final" id="f1-final" hidden></div>
  `;

  // Tadeo con su mochila
  document.getElementById("f1-zona").insertAdjacentHTML("afterbegin", dibujarTadeo());

  // Tarjetas de objetos en orden aleatorio
  const grilla = document.getElementById("f1-grilla");
  mezclar(OBJETOS_MOCHILA.slice()).forEach((objeto) => {
    const tarjeta = document.createElement("button");
    tarjeta.type = "button";
    tarjeta.className = "f1-objeto";
    tarjeta.dataset.id = objeto.id;
    tarjeta.setAttribute("aria-label", `${objeto.nombre}. Guardar en la mochila`);
    tarjeta.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${ICONOS_MOCHILA[objeto.id]}</svg><span>${objeto.nombre}</span>`;
    activarArrastre(tarjeta);
    grilla.appendChild(tarjeta);
  });

  // Cuenta regresiva (se omite en el modo "Jugar sin tiempo")
  const caja = document.getElementById("f1-tiempo");
  if (estado.jugarSinTiempo) {
    caja.hidden = true;
  } else {
    fase1.temporizador = setInterval(avanzarTiempoFase1, 1000);
  }
}

// Ordena un arreglo al azar (algoritmo de Fisher-Yates)
function mezclar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// Resta un segundo y revisa si se acabó el tiempo
function avanzarTiempoFase1() {
  fase1.tiempo--;
  const numero = document.getElementById("f1-segundos");
  numero.textContent = fase1.tiempo;

  if (fase1.tiempo <= CONFIG_FASE1.alertaDesde) {
    document.getElementById("f1-tiempo").classList.add("alerta");
  }
  if (fase1.tiempo === CONFIG_FASE1.alertaDesde) {
    document.getElementById("f1-aviso").textContent = `Quedan ${CONFIG_FASE1.alertaDesde} segundos.`;
  }
  if (fase1.tiempo <= 0) terminarFase1("tiempo");
}

function detenerTemporizadorFase1() {
  if (fase1 && fase1.temporizador) {
    clearInterval(fase1.temporizador);
    fase1.temporizador = null;
  }
}

// Si el jugador sale de la fase sin terminar, el tiempo se detiene
// y al volver la fase empieza de nuevo.
window.addEventListener("hashchange", () => {
  if (location.hash !== "#fase-1" && fase1 && !fase1.terminado) {
    detenerTemporizadorFase1();
    fase1 = null;
  }
});

// Revisa el objeto elegido: correcto o incorrecto
function revisarObjeto(tarjeta) {
  if (!fase1 || fase1.terminado) return;
  const objeto = OBJETOS_MOCHILA.find((o) => o.id === tarjeta.dataset.id);
  if (fase1.revisados.has(objeto.id)) return;
  fase1.revisados.add(objeto.id);

  const marca = document.createElement("span");
  marca.className = "f1-marca";
  marca.setAttribute("aria-hidden", "true");
  tarjeta.disabled = true;

  if (objeto.esCorrecto) {
    fase1.aciertos++;
    fase1.puntos += CONFIG_FASE1.puntosAcierto;
    fase1.guardados.push(objeto.id);
    tarjeta.classList.add("correcto");
    marca.textContent = "✓";
    tarjeta.setAttribute("aria-label", `${objeto.nombre}. Guardado correctamente`);
    guardarEnMochila(objeto.id);
    mostrarRetroFase1("bien", `¡Bien! ${objeto.nombre}.`, objeto.explicacion);
  } else {
    fase1.errores++;
    fase1.puntos = Math.max(0, fase1.puntos - CONFIG_FASE1.puntosError);
    tarjeta.classList.add("incorrecto");
    marca.textContent = "✕";
    tarjeta.setAttribute("aria-label", `${objeto.nombre}. No corresponde`);
    tarjeta.classList.remove("sacudir");
    void tarjeta.offsetWidth; // reinicia la animación
    tarjeta.classList.add("sacudir");
    mostrarRetroFase1("mal", `${objeto.nombre} no va en la mochila.`, objeto.explicacion);
  }
  tarjeta.appendChild(marca);
  actualizarInventarioFase1();

  if (fase1.aciertos === TOTAL_CORRECTOS_F1) terminarFase1("completa");
}

// Dibuja el ícono del objeto asomándose por la mochila y la hace saltar
function guardarEnMochila(id) {
  const grupo = document.querySelector("#f1-zona .mochila-objetos");
  const n = fase1.guardados.length - 1;
  const columna = n % 3;
  const fila = Math.floor(n / 3);
  grupo.insertAdjacentHTML(
    "beforeend",
    `<svg x="${66 + columna * 24}" y="${150 - fila * 16}" width="26" height="26" viewBox="0 0 48 48">${ICONOS_MOCHILA[id]}</svg>`
  );
  const mochila = document.querySelector("#f1-zona .mochila");
  mochila.classList.remove("saltar");
  void mochila.getBBox(); // reinicia la animación
  mochila.classList.add("saltar");
}

function mostrarRetroFase1(tipo, titulo, texto) {
  const caja = document.getElementById("f1-retro");
  caja.className = "f1-retro " + tipo;
  caja.innerHTML = "";
  const t = document.createElement("strong");
  t.textContent = (tipo === "mal" ? "✕ " : "✓ ") + titulo;
  caja.append(t, document.createTextNode(" " + texto));
}

function actualizarInventarioFase1() {
  document.getElementById("f1-aciertos").textContent = fase1.aciertos;
  document.getElementById("f1-errores").textContent = fase1.errores;
  document.getElementById("f1-errores-txt").textContent = fase1.errores === 1 ? "error" : "errores";
  document.getElementById("f1-puntos").textContent = fase1.puntos;
  document.getElementById("f1-progreso").style.width = (fase1.aciertos / TOTAL_CORRECTOS_F1) * 100 + "%";
  document.getElementById("f1-barra").setAttribute("aria-valuenow", fase1.aciertos);
}

// Cierra la fase: por mochila completa o por tiempo agotado
function terminarFase1(motivo) {
  if (fase1.terminado) return;
  fase1.terminado = true;
  detenerTemporizadorFase1();

  // Bloquea los objetos que quedaron
  document.querySelectorAll("#f1-grilla .f1-objeto").forEach((t) => (t.disabled = true));

  // Puntaje final de la fase (entre 0 y 100)
  const puntos = Math.min(CONFIG_FASE1.maximo, Math.max(0, fase1.puntos));
  sumarPuntos(1, puntos);
  completarFase(1);

  // Objetos correctos que faltaron
  const faltaron = OBJETOS_MOCHILA.filter((o) => o.esCorrecto && !fase1.guardados.includes(o.id));

  const final = document.getElementById("f1-final");
  final.hidden = false;
  final.innerHTML = `
    <h3 tabindex="-1" id="f1-titulo-final">${motivo === "completa" ? "¡Mochila lista!" : "¡Se acabó el tiempo!"}</h3>
    <p>Obtuviste <b>${puntos} puntos</b> con ${fase1.aciertos} aciertos y ${fase1.errores} ${fase1.errores === 1 ? "error" : "errores"}.</p>
    ${faltaron.length ? `<p>Te faltó guardar: <b>${faltaron.map((o) => o.nombre).join(", ")}</b>.</p>` : "<p>Guardaste todos los objetos importantes. Tadeo está preparado.</p>"}
    <div class="f1-acciones">
      <button type="button" class="boton boton-secundario" id="f1-reintentar">Reintentar fase</button>
      <a class="boton" href="#fase-2">Siguiente fase</a>
    </div>
  `;
  document.getElementById("f1-reintentar").addEventListener("click", reintentarFase1);
  document.getElementById("f1-titulo-final").focus();
}

// Descuenta el puntaje anterior de la fase y la empieza de nuevo
function reintentarFase1() {
  estado.puntajes[1] = 0;
  estado.completadas[1] = false;
  const enlace = document.querySelector('.progreso a[data-fase="1"]');
  if (enlace) enlace.classList.remove("completada");
  actualizarPuntaje();
  actualizarFlechas(pantallaActual);
  empezarFase1();
}

// Arrastrar con mouse, dedo o lápiz (pointer events).
// Un toque, un clic o Enter también guardan el objeto.
function activarArrastre(tarjeta) {
  let copia = null;     // tarjeta "fantasma" que sigue al puntero
  let inicioX = 0;
  let inicioY = 0;
  let seMovio = false;
  let punteroId = null;

  tarjeta.addEventListener("pointerdown", (e) => {
    if (tarjeta.disabled) return;
    punteroId = e.pointerId;
    inicioX = e.clientX;
    inicioY = e.clientY;
    seMovio = false;
    tarjeta.setPointerCapture(punteroId);
  });

  tarjeta.addEventListener("pointermove", (e) => {
    if (e.pointerId !== punteroId) return;
    // Solo cuenta como arrastre si se movió más de 6 px
    if (!seMovio && Math.hypot(e.clientX - inicioX, e.clientY - inicioY) > 6) {
      seMovio = true;
      copia = tarjeta.cloneNode(true);
      copia.classList.add("f1-fantasma");
      document.body.appendChild(copia);
      tarjeta.classList.add("arrastrando");
    }
    if (seMovio) {
      copia.style.left = e.clientX + "px";
      copia.style.top = e.clientY + "px";
      document.getElementById("f1-zona").classList.toggle("encima", sobreTadeo(e.clientX, e.clientY));
    }
  });

  const soltar = (e) => {
    if (e.pointerId !== punteroId) return;
    punteroId = null;
    if (seMovio) {
      const acerto = sobreTadeo(e.clientX, e.clientY);
      limpiarArrastre();
      if (acerto) revisarObjeto(tarjeta);
      tarjeta.dataset.arrastrado = "si"; // evita que el clic posterior lo cuente dos veces
    }
  };

  const limpiarArrastre = () => {
    if (copia) copia.remove();
    copia = null;
    tarjeta.classList.remove("arrastrando");
    const zona = document.getElementById("f1-zona");
    if (zona) zona.classList.remove("encima");
  };

  tarjeta.addEventListener("pointerup", soltar);
  tarjeta.addEventListener("pointercancel", () => { punteroId = null; limpiarArrastre(); });

  // Clic, toque o Enter: guarda el objeto directamente
  tarjeta.addEventListener("click", () => {
    if (tarjeta.dataset.arrastrado) {
      delete tarjeta.dataset.arrastrado;
      return;
    }
    revisarObjeto(tarjeta);
  });
}

// ¿El puntero está sobre la zona de Tadeo?
function sobreTadeo(x, y) {
  const r = document.getElementById("f1-zona").getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/* =========================================================
   4.2 FASE 2 · Alerta: Salva a las mascotas
   ========================================================= */

// Valores ajustables de la fase
const CONFIG_FASE2 = {
  puntosHallazgo: 25,
  costoPista: 10,
  segundosParaPista: 20,
  maximo: 100
};

// Zonas de riesgo escondidas en la escena.
// "zona" es la posición en el SVG (x, y, ancho y alto, en unidades del viewBox 800 x 480).
// [VERIFICAR CON SENAPRED]
const RIESGOS_CASA = [
  {
    id: "canaletas",
    nombre: "Canaletas tapadas",
    etiqueta: "Revisar el techo y las canaletas",
    zona: { x: 200, y: 168, w: 400, h: 36 },
    solucion: "Limpia las hojas y la basura de las canaletas y bajadas de agua antes de las lluvias, para que el agua escurra.",
    protege: "Así el agua no se rebalsa ni se filtra hacia donde duermen Canela y Michi."
  },
  {
    id: "sumidero",
    nombre: "Sumidero con basura",
    etiqueta: "Revisar la calle frente a la casa",
    zona: { x: 618, y: 430, w: 124, h: 44 },
    solucion: "Retira las bolsas y hojas que tapan el sumidero y no botes basura en la calle.",
    protege: "Si el agua de la calle escurre, no inunda el patio donde juegan las mascotas."
  },
  {
    id: "objetos",
    nombre: "Objetos sueltos en el patio",
    etiqueta: "Revisar el patio",
    zona: { x: 26, y: 346, w: 190, h: 96 },
    solucion: "Guarda o amarra macetas, sillas, baldes y juguetes que el viento o el agua puedan arrastrar.",
    protege: "No se golpean ni se asustan con objetos que vuelan o flotan."
  },
  {
    id: "enchufes",
    nombre: "Enchufes y alargadores en el suelo",
    etiqueta: "Revisar el interior por la ventana grande",
    zona: { x: 448, y: 326, w: 104, h: 46 },
    solucion: "Desconecta los alargadores y aparatos, y súbelos lejos del suelo y del agua.",
    protege: "Si entra agua a la casa, las mascotas no corren riesgo de recibir una descarga eléctrica."
  }
];

// Lugares sin peligro: hacen que el juego sea un desafío también con teclado
const ZONAS_SEGURAS_CASA = [
  { id: "ventana", etiqueta: "Revisar la ventana encendida", zona: { x: 256, y: 216, w: 88, h: 68 } },
  { id: "puerta", etiqueta: "Revisar la puerta", zona: { x: 366, y: 266, w: 68, h: 116 } },
  { id: "arbol", etiqueta: "Revisar el árbol", zona: { x: 690, y: 236, w: 92, h: 180 } }
];

let fase2 = null;

function iniciarFase2() {
  // Si ya terminó, se conserva el resultado (puede usar "Reintentar fase")
  if (fase2 && fase2.terminado && estado.completadas[2]) return;
  empezarFase2();
}

function empezarFase2() {
  detenerRelojFase2();

  fase2 = {
    puntos: 0,
    encontrados: new Set(),
    pistas: 0,
    ultimoHallazgo: Date.now(),
    reloj: null,
    terminado: false
  };

  const contenedor = document.getElementById("juego-fase-2");
  contenedor.innerHTML = `
    <div class="f2-panel">
      <span class="f1-dato" aria-live="polite">Riesgos encontrados: <b id="f2-contador">0</b> de ${RIESGOS_CASA.length}</span>
      <span class="f1-dato"><b id="f2-puntos">0</b> puntos</span>
      <button type="button" class="boton f2-boton-pista" id="f2-pista" hidden>Pista (−${CONFIG_FASE2.costoPista} puntos)</button>
    </div>
    <p class="f1-ayuda">Toca los lugares de la casa donde ves un peligro. Con teclado, usa Tab para recorrer la escena y Enter para revisar.</p>
    <div class="f2-escena" id="f2-escena">${dibujarCasa()}</div>
    <p class="f2-mensaje" id="f2-mensaje" aria-live="polite"></p>
    <div class="f2-soluciones" id="f2-soluciones" aria-live="polite"></div>
    <div class="f1-final" id="f2-final" hidden></div>
  `;

  // Activa las zonas (con riesgo y sin riesgo)
  document.querySelectorAll("#f2-escena .zona-casa").forEach((zona) => {
    zona.addEventListener("click", () => revisarZonaCasa(zona.dataset.id));
    zona.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        revisarZonaCasa(zona.dataset.id);
      }
    });
  });
  document.getElementById("f2-pista").addEventListener("click", usarPistaFase2);

  // Revisa cada segundo si corresponde mostrar la pista
  fase2.reloj = setInterval(revisarPistaFase2, 1000);
}

function detenerRelojFase2() {
  if (fase2 && fase2.reloj) {
    clearInterval(fase2.reloj);
    fase2.reloj = null;
  }
}

// Si sale de la fase sin terminar, se detiene y al volver empieza de nuevo
window.addEventListener("hashchange", () => {
  if (location.hash !== "#fase-2" && fase2 && !fase2.terminado) {
    detenerRelojFase2();
    fase2 = null;
  }
});

// El jugador revisa una zona de la escena
function revisarZonaCasa(id) {
  if (!fase2 || fase2.terminado) return;
  const mensaje = document.getElementById("f2-mensaje");
  const riesgo = RIESGOS_CASA.find((r) => r.id === id);

  // Zona sin peligro
  if (!riesgo) {
    mensaje.textContent = "Aquí todo está en orden. Sigue buscando.";
    return;
  }
  // Riesgo ya encontrado
  if (fase2.encontrados.has(id)) {
    mensaje.textContent = `Ya encontraste: ${riesgo.nombre}.`;
    return;
  }

  // ¡Nuevo hallazgo!
  fase2.encontrados.add(id);
  fase2.puntos += CONFIG_FASE2.puntosHallazgo;
  fase2.ultimoHallazgo = Date.now();
  document.getElementById("f2-pista").hidden = true;

  const zona = document.querySelector(`#f2-escena .zona-casa[data-id="${id}"]`);
  zona.classList.remove("pista");
  zona.classList.add("encontrada");
  zona.setAttribute("aria-label", `${riesgo.nombre}: encontrado`);

  mensaje.textContent = `¡Encontraste un peligro: ${riesgo.nombre}!`;
  agregarTarjetaSolucion(riesgo);

  document.getElementById("f2-contador").textContent = fase2.encontrados.size;
  document.getElementById("f2-puntos").textContent = fase2.puntos;

  if (fase2.encontrados.size === RIESGOS_CASA.length) terminarFase2();
}

// Tarjeta "Cómo solucionarlo" (la más reciente queda primero)
function agregarTarjetaSolucion(riesgo) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "f2-tarjeta";
  const titulo = document.createElement("h4");
  titulo.textContent = `Cómo solucionarlo: ${riesgo.nombre}`;
  const solucion = document.createElement("p");
  solucion.textContent = riesgo.solucion;
  const protege = document.createElement("p");
  protege.className = "f2-protege";
  protege.textContent = `Para Canela y Michi: ${riesgo.protege}`;
  tarjeta.append(titulo, solucion, protege);
  document.getElementById("f2-soluciones").prepend(tarjeta);
}

// Después de 20 segundos sin hallazgos aparece el botón "Pista"
function revisarPistaFase2() {
  if (!fase2 || fase2.terminado) return;
  const segundos = (Date.now() - fase2.ultimoHallazgo) / 1000;
  if (segundos >= CONFIG_FASE2.segundosParaPista) {
    document.getElementById("f2-pista").hidden = false;
  }
}

// La pista hace parpadear un riesgo no encontrado y resta puntos
function usarPistaFase2() {
  const pendiente = RIESGOS_CASA.find((r) => !fase2.encontrados.has(r.id));
  if (!pendiente) return;
  fase2.pistas++;
  fase2.puntos = Math.max(0, fase2.puntos - CONFIG_FASE2.costoPista);
  fase2.ultimoHallazgo = Date.now(); // vuelve a contar 20 segundos
  document.getElementById("f2-puntos").textContent = fase2.puntos;
  document.getElementById("f2-pista").hidden = true;

  const zona = document.querySelector(`#f2-escena .zona-casa[data-id="${pendiente.id}"]`);
  zona.classList.add("pista");
  setTimeout(() => zona.classList.remove("pista"), 3500);
  document.getElementById("f2-mensaje").textContent = `Pista: revisa con atención. ${pendiente.etiqueta}.`;
}

function terminarFase2() {
  fase2.terminado = true;
  detenerRelojFase2();

  const puntos = Math.min(CONFIG_FASE2.maximo, Math.max(0, fase2.puntos));
  sumarPuntos(2, puntos);
  completarFase(2);

  // Animación: las mascotas entran a la casa y aparecen corazones
  document.querySelector("#f2-escena svg").classList.add("a-salvo");
  document.getElementById("f2-mensaje").textContent = "¡Canela y Michi están a salvo dentro de la casa!";

  const espera = reducirMovimiento ? 0 : 1600;
  setTimeout(() => {
    const final = document.getElementById("f2-final");
    final.hidden = false;
    final.innerHTML = `
      <h3 tabindex="-1" id="f2-titulo-final">¡Mascotas a salvo!</h3>
      <p>Encontraste los ${RIESGOS_CASA.length} peligros y obtuviste <b>${puntos} puntos</b>${fase2.pistas ? ` usando ${fase2.pistas} ${fase2.pistas === 1 ? "pista" : "pistas"}` : " sin usar pistas"}.</p>
      <div class="f1-acciones">
        <button type="button" class="boton boton-secundario" id="f2-reintentar">Reintentar fase</button>
        <a class="boton" href="#fase-3">Siguiente fase</a>
      </div>
    `;
    document.getElementById("f2-reintentar").addEventListener("click", reintentarFase2);
    document.getElementById("f2-titulo-final").focus();
  }, espera);
}

function reintentarFase2() {
  estado.puntajes[2] = 0;
  estado.completadas[2] = false;
  const enlace = document.querySelector('.progreso a[data-fase="2"]');
  if (enlace) enlace.classList.remove("completada");
  actualizarPuntaje();
  actualizarFlechas(pantallaActual);
  empezarFase2();
}

// Dibuja la escena de la casa (SVG 800 x 480)
function dibujarCasa() {
  // Gotas de lluvia de la escena
  let gotasEscena = "";
  for (let i = 0; i < 46; i++) {
    const x = (i * 97) % 800;
    const y = (i * 53) % 420;
    gotasEscena += `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 16}"/>`;
  }

  // Zonas que se pueden revisar (rectángulos invisibles hasta encontrarlas)
  const zona = (z, id, etiqueta) =>
    `<g class="zona-casa" data-id="${id}" tabindex="0" role="button" aria-label="${etiqueta}">
       <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="12"/>
     </g>`;
  const zonas =
    RIESGOS_CASA.map((r) => zona(r.zona, r.id, r.etiqueta)).join("") +
    ZONAS_SEGURAS_CASA.map((s) => zona(s.zona, s.id, s.etiqueta)).join("");

  return `
  <svg viewBox="0 0 800 480" role="group" aria-label="Casa de Tadeo mientras empieza a llover. Busca los ${RIESGOS_CASA.length} peligros.">
    <g aria-hidden="true">
      <!-- Cielo y nubes -->
      <rect width="800" height="480" fill="#3a6577"/>
      <g fill="#6f8a96"><ellipse cx="120" cy="50" rx="90" ry="30"/><ellipse cx="190" cy="40" rx="60" ry="28"/><ellipse cx="620" cy="60" rx="110" ry="32"/><ellipse cx="700" cy="45" rx="70" ry="26"/></g>
      <path d="M640 92l-14 26h12l-10 24 26-34h-13l9-16z" fill="#f5c518" opacity=".8"/>

      <!-- Árbol (sin peligro) -->
      <rect x="728" y="320" width="16" height="92" fill="#5a3825"/>
      <circle cx="736" cy="290" r="44" fill="#2f6b45"/><circle cx="710" cy="310" r="26" fill="#2a5f3d"/><circle cx="762" cy="312" r="26" fill="#2a5f3d"/>

      <!-- Pasto y calle -->
      <rect y="380" width="800" height="60" fill="#2f5a3a"/>
      <rect y="440" width="800" height="40" fill="#3a4650"/>
      <path d="M0 444h800" stroke="#7d8f99" stroke-width="3"/>

      <!-- Charcos -->
      <ellipse cx="300" cy="420" rx="60" ry="9" fill="#3fc1d1" opacity=".45"/>
      <ellipse cx="560" cy="430" rx="40" ry="7" fill="#3fc1d1" opacity=".45"/>
      <ellipse class="charco-crece" cx="680" cy="458" rx="70" ry="10" fill="#3fc1d1" opacity=".5"/>

      <!-- Casa -->
      <rect x="230" y="180" width="340" height="200" fill="#c9b79c"/>
      <polygon points="210,186 400,82 590,186" fill="#7a3b2e"/>
      <!-- Canaletas con hojas y agua que rebalsa -->
      <rect x="205" y="183" width="390" height="10" rx="3" fill="#8a99a3"/>
      <g fill="#6b8e3a"><ellipse cx="262" cy="182" rx="14" ry="6"/><ellipse cx="300" cy="180" rx="10" ry="5"/><ellipse cx="520" cy="181" rx="16" ry="6"/></g>
      <g fill="#8a5a2b"><ellipse cx="282" cy="181" rx="8" ry="4"/><ellipse cx="540" cy="180" rx="9" ry="4"/></g>
      <g stroke="#7fd0e8" stroke-width="3" stroke-linecap="round" class="goteo"><path d="M290 194v26"/><path d="M296 194v18"/><path d="M528 194v30"/></g>
      <rect x="575" y="190" width="10" height="190" fill="#8a99a3"/>

      <!-- Ventana encendida y puerta -->
      <rect x="260" y="220" width="80" height="60" fill="#f5d76e" stroke="#5a3825" stroke-width="5"/>
      <path d="M300 220v60M260 250h80" stroke="#5a3825" stroke-width="4"/>
      <rect class="puerta" x="370" y="270" width="60" height="110" fill="#5a3825"/>
      <circle cx="418" cy="328" r="4" fill="#f0a447"/>

      <!-- Ventana grande: interior con alargador en el suelo mojado -->
      <rect x="450" y="250" width="100" height="120" fill="#e9dcc4" stroke="#5a3825" stroke-width="5"/>
      <rect x="452" y="340" width="96" height="28" fill="#a07850"/>
      <ellipse cx="510" cy="356" rx="32" ry="6" fill="#3fc1d1" opacity=".6"/>
      <rect x="462" y="346" width="40" height="10" rx="3" fill="#f4f8fa" stroke="#3a4a55"/>
      <g fill="#3a4a55"><circle cx="470" cy="351" r="2"/><circle cx="480" cy="351" r="2"/><circle cx="490" cy="351" r="2"/></g>
      <path d="M502 351q14 8 28-2q10-6 16 4" stroke="#3a4a55" stroke-width="3" fill="none"/>
      <rect x="466" y="300" width="40" height="28" rx="3" fill="#3a4a55"/>
      <path d="M486 328v18" stroke="#3a4a55" stroke-width="3"/>

      <!-- Patio desordenado: maceta volcada, silla caída, balde y pelota -->
      <path d="M48 418l40-10 8 22-40 10z" fill="#c4643c"/>
      <ellipse cx="44" cy="428" rx="14" ry="5" fill="#6b4a2e"/>
      <path d="M98 412l6-20" stroke="#2f6b45" stroke-width="4"/>
      <g stroke="#f4f8fa" stroke-width="5" stroke-linecap="round"><path d="M120 400l46 16"/><path d="M128 372l32 50"/><path d="M150 380l-10 44"/></g>
      <path d="M176 400h26l-4 28h-18z" fill="#3fc1d1"/>
      <path d="M176 400q13-14 26 0" stroke="#3a4a55" stroke-width="2" fill="none"/>
      <circle cx="70" cy="378" r="12" fill="#d64541"/><path d="M58 378h24" stroke="#f4f8fa" stroke-width="2"/>

      <!-- Sumidero tapado con basura -->
      <rect x="636" y="448" width="88" height="20" rx="3" fill="#1f262c"/>
      <g stroke="#56636c" stroke-width="3"><path d="M648 448v20M662 448v20M676 448v20M690 448v20M704 448v20"/></g>
      <path d="M650 446q10-22 30-8q14-14 22 6z" fill="#e6e6e6"/>
      <g fill="#8a5a2b"><ellipse cx="700" cy="452" rx="10" ry="4"/><ellipse cx="642" cy="455" rx="8" ry="3"/></g>

      <!-- Mascotas -->
      <g transform="translate(300 418)">
        <g class="mascota canela">
          <!-- Canela: perra café -->
          <path d="M-30 -24q-14 -8 -12 -22" stroke="#a46b35" stroke-width="5" fill="none" stroke-linecap="round"/>
          <ellipse cx="0" cy="-22" rx="28" ry="14" fill="#c98a4b"/>
          <rect x="-22" y="-12" width="7" height="14" rx="3" fill="#a46b35"/><rect x="14" y="-12" width="7" height="14" rx="3" fill="#a46b35"/>
          <circle cx="26" cy="-38" r="14" fill="#c98a4b"/>
          <ellipse cx="16" cy="-34" rx="5" ry="10" fill="#8a5a2b"/><ellipse cx="36" cy="-34" rx="5" ry="10" fill="#8a5a2b"/>
          <ellipse cx="30" cy="-32" rx="5" ry="4" fill="#3a2a1e"/>
          <g class="cara-susto"><circle cx="21" cy="-42" r="4" fill="#fff"/><circle cx="31" cy="-42" r="4" fill="#fff"/><circle cx="21" cy="-42" r="1.6" fill="#10232e"/><circle cx="31" cy="-42" r="1.6" fill="#10232e"/><path d="M22 -26q3 -3 6 0q3 3 6 0" stroke="#10232e" stroke-width="1.6" fill="none"/><path d="M44 -52q4 6 0 9q-4 -3 0 -9z" fill="#7fd0e8"/></g>
          <g class="cara-feliz"><path d="M18 -43q3 -3 6 0M28 -43q3 -3 6 0" stroke="#10232e" stroke-width="2" fill="none"/><path d="M22 -27q6 6 12 0" stroke="#10232e" stroke-width="2" fill="none"/></g>
        </g>
      </g>
      <g transform="translate(480 426)">
        <g class="mascota michi">
          <!-- Michi: gato gris -->
          <path d="M-24 -18q-20 -10 -10 -34" stroke="#8a8f99" stroke-width="7" fill="none" stroke-linecap="round"/>
          <ellipse cx="0" cy="-16" rx="22" ry="13" fill="#9aa1ab"/>
          <rect x="-16" y="-8" width="6" height="10" rx="3" fill="#8a8f99"/><rect x="10" y="-8" width="6" height="10" rx="3" fill="#8a8f99"/>
          <circle cx="18" cy="-32" r="13" fill="#9aa1ab"/>
          <path d="M8 -40l2 -14 8 8zM28 -40l-2 -14 -8 8z" fill="#8a8f99"/>
          <g class="cara-susto"><circle cx="13" cy="-34" r="4" fill="#fff"/><circle cx="23" cy="-34" r="4" fill="#fff"/><circle cx="13" cy="-34" r="1.5" fill="#10232e"/><circle cx="23" cy="-34" r="1.5" fill="#10232e"/><path d="M14 -24q2 -2 4 0q2 2 4 0" stroke="#10232e" stroke-width="1.5" fill="none"/></g>
          <g class="cara-feliz"><path d="M10 -35q3 -3 6 0M20 -35q3 -3 6 0" stroke="#10232e" stroke-width="2" fill="none"/><path d="M15 -26q3 3 6 0" stroke="#10232e" stroke-width="2" fill="none"/></g>
        </g>
      </g>

      <!-- Corazones del final -->
      <g class="corazones" fill="#d64541">
        <path d="M380 250c0-8 10-8 10 0c0-8 10-8 10 0c0 8-10 12-10 16c0-4-10-8-10-16z"/>
        <path d="M410 232c0-6 8-6 8 0c0-6 8-6 8 0c0 6-8 9-8 12c0-3-8-6-8-12z"/>
        <path d="M352 236c0-6 8-6 8 0c0-6 8-6 8 0c0 6-8 9-8 12c0-3-8-6-8-12z"/>
      </g>

      <!-- Lluvia de la escena -->
      <g class="lluvia-escena" stroke="#96dce8" stroke-width="1.5" opacity=".6">${gotasEscena}</g>
    </g>

    <!-- Zonas para revisar -->
    ${zonas}
  </svg>`;
}

/* =========================================================
   4.3 FASE 3 · Durante: Ruta de evacuación
   ========================================================= */

// Valores ajustables de la fase
const CONFIG_FASE3 = {
  tiempo: 90,            // segundos del cronómetro
  alertaDesde: 15,       // el número se pone naranjo en los últimos segundos
  movimientosPorFila: 3, // cada 3 movimientos el agua sube una fila
  penalizacion: 10,      // puntos que resta chocar con un peligro
  puntosPorExtra: 2,     // puntos que resta cada movimiento extra
  maximo: 100
};

// Mapa de 9 x 9. Fila 0 = arriba, fila 8 = abajo.
// H = casa · Z = zona alta · C = calle · I = calle inundada · Q = quebrada · X = cables caídos
// (Revisado: el camino más corto y seguro tiene 16 movimientos y alcanza a escapar del agua.)
const MAPA_RUTA = [
  "CCCICCCCZ",
  "CXCCCQCCC",
  "CCQCICCXC",
  "ICCCCCQCC",
  "CCXCQCCCI",
  "CQCCCCXCC",
  "CCCICCCQC",
  "XCCCCXCCC",
  "HCICCCCIC"
];
const TAM_RUTA = MAPA_RUTA.length;

// Tipos de casilla: nombre e ícono SVG simple (cuadro de 40 x 40)
const CASILLAS_RUTA = {
  C: { nombre: "Calle", icono: '<path d="M20 6v6M20 17v6M20 28v6" stroke="#8fa9b3" stroke-width="2.5" stroke-linecap="round"/>' },
  H: { nombre: "Casa de Tadeo", icono: '<path d="M8 20L20 9l12 11" fill="none" stroke="#f4f8fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="19" width="16" height="13" rx="2" fill="#c9b79c"/><rect x="18" y="24" width="5" height="8" rx="1" fill="#5a3825"/>' },
  Z: { nombre: "Zona alta segura", icono: '<path d="M6 34l10-14 6 7 5-6 7 13z" fill="#2a5f3d"/><path d="M20 30V7" stroke="#f4f8fa" stroke-width="2.5" stroke-linecap="round"/><path class="bandera" d="M21 8h12l-4 5 4 5H21z" fill="#5fd68f"/>' },
  I: { nombre: "Calle inundada", icono: '<path d="M5 16q5-5 10 0t10 0 10 0M5 25q5-5 10 0t10 0 10 0" fill="none" stroke="#bfe6ef" stroke-width="2.5" stroke-linecap="round"/>' },
  Q: { nombre: "Quebrada", icono: '<path d="M6 8l9 8-5 6 9 6-3 6" fill="none" stroke="#2a1a10" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 9l-4 9 7 5-5 9" fill="none" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>' },
  X: { nombre: "Cables caídos", icono: '<rect x="9" y="6" width="4" height="28" rx="2" fill="#8a99a3"/><path d="M11 9q14 4 18 18" fill="none" stroke="#3a4a55" stroke-width="2.5"/><path d="M26 24l3 4-4 1 3 4" fill="none" stroke="#f5c518" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }
};

// Mensajes de peligro al intentar entrar a una casilla.
// [VERIFICAR CON SENAPRED]
const PELIGROS_RUTA = {
  I: "Calle inundada: no camines por calles con agua. La corriente puede arrastrarte y no sabes qué hay debajo.",
  Q: "Quebrada: con lluvias intensas pueden bajar aluviones por las quebradas. Aléjate de ellas.",
  X: "Cables caídos: no te acerques ni los toques. El agua conduce la electricidad. Avisa a las autoridades.",
  agua: "El agua ya cubrió esta calle. Busca siempre los lugares altos."
};

let fase3 = null;

function iniciarFase3() {
  if (fase3 && fase3.terminado && estado.completadas[3]) return;
  empezarFase3();
}

function empezarFase3() {
  detenerRelojFase3();
  const inicio = buscarEnMapa("H");
  const meta = buscarEnMapa("Z");

  fase3 = {
    fila: inicio.fila,
    col: inicio.col,
    meta,
    movimientos: 0,
    nivelAgua: 0,      // filas inundadas desde abajo
    penalizaciones: 0,
    tiempo: CONFIG_FASE3.tiempo,
    reloj: null,
    caminoMasCorto: calcularCaminoMasCorto(inicio, meta),
    terminado: false
  };

  // Seguridad: avisa si alguien edita el mapa y lo deja sin salida
  if (fase3.caminoMasCorto === null) console.warn("El mapa de la Fase 3 no tiene un camino posible. Revisa MAPA_RUTA.");

  const contenedor = document.getElementById("juego-fase-3");
  contenedor.innerHTML = `
    <div class="f3-panel">
      <div class="f1-tiempo" id="f3-tiempo"><span>Tiempo</span><b id="f3-segundos">${CONFIG_FASE3.tiempo}</b><span>seg</span></div>
      <span class="f1-dato">Movimientos: <b id="f3-movimientos">0</b></span>
      <span class="f1-dato">El agua sube en: <b id="f3-proxima">${CONFIG_FASE3.movimientosPorFila}</b></span>
      <span class="f1-dato mal">Choques: <b id="f3-choques">0</b></span>
    </div>
    <p class="solo-lectores" id="f3-aviso" aria-live="assertive"></p>
    <p class="f1-ayuda f3-ayuda">Lleva a Tadeo hasta la <b>bandera verde</b>. Usa las flechas del teclado, toca una casilla vecina o usa los botones.</p>

    <div class="f3-juego">
      <div class="f3-tablero" id="f3-tablero" role="application" tabindex="0"
           aria-label="Mapa de evacuación de 9 por 9. Usa las flechas para mover a Tadeo." aria-describedby="f3-estado">
        <div class="f3-ficha" id="f3-ficha" aria-hidden="true">${dibujarFichaTadeo()}</div>
      </div>
      <div class="f3-nivel" aria-hidden="true">
        <span class="f3-nivel-titulo">Agua</span>
        <div class="f3-nivel-tubo"><div class="f3-nivel-agua" id="f3-nivel-agua"></div></div>
      </div>
    </div>
    <p class="solo-lectores" id="f3-estado" aria-live="polite"></p>

    <div class="f3-controles" aria-label="Botones de movimiento">
      <button type="button" class="f3-control arriba" data-dir="arriba" aria-label="Mover arriba">${flechaSVG(0)}</button>
      <button type="button" class="f3-control izquierda" data-dir="izquierda" aria-label="Mover a la izquierda">${flechaSVG(270)}</button>
      <button type="button" class="f3-control abajo" data-dir="abajo" aria-label="Mover abajo">${flechaSVG(180)}</button>
      <button type="button" class="f3-control derecha" data-dir="derecha" aria-label="Mover a la derecha">${flechaSVG(90)}</button>
    </div>

    <p class="f3-mensaje" id="f3-mensaje" aria-live="polite">¡Hay que evacuar! Sube hacia la zona alta antes que el agua.</p>

    <ul class="f3-leyenda" aria-label="Leyenda del mapa">
      ${["Z", "C", "I", "Q", "X"].map((t) => `<li><span class="f3-mini tipo-${t}"><svg viewBox="0 0 40 40" aria-hidden="true">${CASILLAS_RUTA[t].icono}</svg></span>${CASILLAS_RUTA[t].nombre}</li>`).join("")}
      <li><span class="f3-mini agua-subio"></span>Agua que sube</li>
    </ul>
    <div class="f1-final" id="f3-final" hidden></div>
  `;

  // Dibuja las 81 casillas
  const tablero = document.getElementById("f3-tablero");
  for (let f = 0; f < TAM_RUTA; f++) {
    for (let c = 0; c < TAM_RUTA; c++) {
      const tipo = MAPA_RUTA[f][c];
      const casilla = document.createElement("div");
      casilla.className = `f3-casilla tipo-${tipo}`;
      casilla.dataset.fila = f;
      casilla.dataset.col = c;
      casilla.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${CASILLAS_RUTA[tipo].icono}</svg>`;
      casilla.addEventListener("click", () => tocarCasilla(f, c));
      tablero.appendChild(casilla);
    }
  }

  // Botones en pantalla
  document.querySelectorAll(".f3-control").forEach((b) =>
    b.addEventListener("click", () => moverTadeo(b.dataset.dir))
  );

  ubicarFicha();

  // Cronómetro (se omite en el modo "Jugar sin tiempo")
  if (estado.jugarSinTiempo) {
    document.getElementById("f3-tiempo").hidden = true;
  } else {
    fase3.reloj = setInterval(avanzarTiempoFase3, 1000);
  }
}

// Dirección → cambio de fila y columna
const DIRECCIONES = {
  arriba: [-1, 0],
  abajo: [1, 0],
  izquierda: [0, -1],
  derecha: [0, 1]
};

// Flechas del teclado (también W, A, S, D). preventDefault evita que la página se desplace.
document.addEventListener("keydown", (e) => {
  if (location.hash !== "#fase-3" || !fase3 || fase3.terminado) return;
  if (e.target.closest && e.target.closest("input, textarea")) return;
  const teclas = {
    ArrowUp: "arriba", ArrowDown: "abajo", ArrowLeft: "izquierda", ArrowRight: "derecha",
    w: "arriba", s: "abajo", a: "izquierda", d: "derecha"
  };
  const dir = teclas[e.key] || teclas[e.key.toLowerCase()];
  if (!dir) return;
  e.preventDefault();
  moverTadeo(dir);
});

// Tocar una casilla vecina mueve a Tadeo hacia ella
function tocarCasilla(f, c) {
  if (!fase3 || fase3.terminado) return;
  const df = f - fase3.fila;
  const dc = c - fase3.col;
  if (Math.abs(df) + Math.abs(dc) !== 1) {
    mostrarMensajeFase3("info", "Toca una casilla vecina a Tadeo (arriba, abajo, izquierda o derecha).");
    return;
  }
  const dir = Object.keys(DIRECCIONES).find((k) => DIRECCIONES[k][0] === df && DIRECCIONES[k][1] === dc);
  moverTadeo(dir);
}

// Intenta mover a Tadeo una casilla
function moverTadeo(dir) {
  if (!fase3 || fase3.terminado) return;
  const [df, dc] = DIRECCIONES[dir];
  const f = fase3.fila + df;
  const c = fase3.col + dc;

  // Borde del mapa: no hay castigo
  if (f < 0 || f >= TAM_RUTA || c < 0 || c >= TAM_RUTA) {
    mostrarMensajeFase3("info", "Ese es el borde del mapa. Prueba otra dirección.");
    return;
  }

  // Peligros: no avanza y pierde puntos
  const tipo = MAPA_RUTA[f][c];
  const fila_inundada = f >= TAM_RUTA - fase3.nivelAgua;
  if (PELIGROS_RUTA[tipo] || fila_inundada) {
    fase3.penalizaciones++;
    document.getElementById("f3-choques").textContent = fase3.penalizaciones;
    mostrarMensajeFase3("mal", `−${CONFIG_FASE3.penalizacion} puntos. ${fila_inundada ? PELIGROS_RUTA.agua : PELIGROS_RUTA[tipo]}`);
    const ficha = document.getElementById("f3-ficha");
    ficha.classList.remove("choque");
    void ficha.offsetWidth;
    ficha.classList.add("choque");
    return;
  }

  // Movimiento válido
  fase3.fila = f;
  fase3.col = c;
  fase3.movimientos++;
  document.getElementById("f3-movimientos").textContent = fase3.movimientos;
  ubicarFicha();

  // ¿Llegó a la zona alta?
  if (f === fase3.meta.fila && c === fase3.meta.col) {
    terminarFase3("llego");
    return;
  }

  // Cada 3 movimientos sube el agua una fila
  if (fase3.movimientos % CONFIG_FASE3.movimientosPorFila === 0) subirAgua();
  const faltan = CONFIG_FASE3.movimientosPorFila - (fase3.movimientos % CONFIG_FASE3.movimientosPorFila);
  document.getElementById("f3-proxima").textContent = faltan;

  if (!fase3.terminado) {
    mostrarMensajeFase3("info", fase3.fila <= 2 ? "¡Ya casi! Sigue hacia la bandera verde." : "Bien, sigue subiendo hacia la zona alta.");
  }
}

// Inunda la siguiente fila desde abajo
function subirAgua() {
  fase3.nivelAgua++;
  const fila = TAM_RUTA - fase3.nivelAgua;
  document.querySelectorAll(`#f3-tablero .f3-casilla[data-fila="${fila}"]`).forEach((casilla, i) => {
    casilla.style.setProperty("--retraso", `${i * 40}ms`); // la ola avanza de izquierda a derecha
    casilla.classList.add("agua-subio");
  });
  document.getElementById("f3-nivel-agua").style.height = (fase3.nivelAgua / TAM_RUTA) * 100 + "%";
  document.getElementById("f3-aviso").textContent = "¡El agua subió una fila!";

  // ¿El agua alcanzó a Tadeo?
  if (fase3.fila >= fila) terminarFase3("agua");
}

// Mueve la ficha de Tadeo a su casilla y marca las vecinas
function ubicarFicha() {
  const ficha = document.getElementById("f3-ficha");
  ficha.style.setProperty("--fila", fase3.fila);
  ficha.style.setProperty("--col", fase3.col);
  document.querySelectorAll("#f3-tablero .f3-casilla").forEach((casilla) => {
    const f = Number(casilla.dataset.fila);
    const c = Number(casilla.dataset.col);
    casilla.classList.toggle("vecina", Math.abs(f - fase3.fila) + Math.abs(c - fase3.col) === 1);
  });
  const filasHastaMeta = fase3.fila - fase3.meta.fila;
  const colsHastaMeta = fase3.meta.col - fase3.col;
  document.getElementById("f3-estado").textContent =
    `Tadeo está en la fila ${fase3.fila + 1}, columna ${fase3.col + 1}. Faltan ${filasHastaMeta} filas hacia arriba y ${colsHastaMeta} columnas a la derecha.`;
}

function mostrarMensajeFase3(tipo, texto) {
  const caja = document.getElementById("f3-mensaje");
  caja.className = "f3-mensaje " + tipo;
  caja.textContent = texto;
}

function avanzarTiempoFase3() {
  fase3.tiempo--;
  document.getElementById("f3-segundos").textContent = fase3.tiempo;
  if (fase3.tiempo <= CONFIG_FASE3.alertaDesde) document.getElementById("f3-tiempo").classList.add("alerta");
  if (fase3.tiempo === CONFIG_FASE3.alertaDesde) {
    document.getElementById("f3-aviso").textContent = `Quedan ${CONFIG_FASE3.alertaDesde} segundos.`;
  }
  if (fase3.tiempo <= 0) terminarFase3("tiempo");
}

function detenerRelojFase3() {
  if (fase3 && fase3.reloj) {
    clearInterval(fase3.reloj);
    fase3.reloj = null;
  }
}

window.addEventListener("hashchange", () => {
  if (location.hash !== "#fase-3" && fase3 && !fase3.terminado) {
    detenerRelojFase3();
    fase3 = null;
  }
});

// Cierra la fase: llegó, lo alcanzó el agua o se acabó el tiempo
function terminarFase3(motivo) {
  if (fase3.terminado) return;
  fase3.terminado = true;
  detenerRelojFase3();
  document.querySelectorAll(".f3-control").forEach((b) => (b.disabled = true));

  const final = document.getElementById("f3-final");
  final.hidden = false;

  if (motivo === "llego") {
    // Puntaje: 100 − 2 por movimiento extra − penalizaciones (sin bajar de 0)
    const extra = Math.max(0, fase3.movimientos - fase3.caminoMasCorto);
    const puntos = Math.min(
      CONFIG_FASE3.maximo,
      Math.max(0, CONFIG_FASE3.maximo - extra * CONFIG_FASE3.puntosPorExtra - fase3.penalizaciones * CONFIG_FASE3.penalizacion)
    );
    sumarPuntos(3, puntos);
    completarFase(3);
    document.getElementById("f3-tablero").classList.add("a-salvo");
    mostrarMensajeFase3("bien", "¡Tadeo llegó a la zona alta! Está a salvo.");

    final.innerHTML = `
      <h3 tabindex="-1" id="f3-titulo-final">¡Evacuación exitosa!</h3>
      <p>Obtuviste <b>${puntos} puntos</b>.</p>
      <ul class="f3-detalle">
        <li>Movimientos: <b>${fase3.movimientos}</b> (el camino más corto tiene ${fase3.caminoMasCorto})</li>
        <li>Movimientos extra: <b>${extra}</b> (−${extra * CONFIG_FASE3.puntosPorExtra})</li>
        <li>Choques con peligros: <b>${fase3.penalizaciones}</b> (−${fase3.penalizaciones * CONFIG_FASE3.penalizacion})</li>
      </ul>
      <div class="f1-acciones">
        <button type="button" class="boton boton-secundario" id="f3-reintentar">Reintentar fase</button>
        <a class="boton" href="#fase-4">Siguiente fase</a>
      </div>
    `;
  } else {
    // Mensaje amable: el jugador puede reintentar o seguir sin puntos en esta fase
    const titulo = motivo === "agua" ? "El agua alcanzó a Tadeo" : "Se acabó el tiempo";
    finalizarFase(3); // la fase termina aunque no se logre: se puede avanzar sin puntos
    mostrarMensajeFase3("mal", "Tadeo no alcanzó a llegar a la zona alta.");
    final.innerHTML = `
      <h3 tabindex="-1" id="f3-titulo-final">${titulo}</h3>
      <p>No te preocupes, practicar sirve para eso. En una emergencia real, evacúa apenas lo indiquen las autoridades y busca siempre los lugares altos.</p>
      <div class="f1-acciones">
        <button type="button" class="boton" id="f3-reintentar">Reintentar fase</button>
        <a class="boton boton-secundario" href="#fase-4">Seguir sin puntos</a>
      </div>
    `;
  }
  document.getElementById("f3-reintentar").addEventListener("click", reintentarFase3);
  document.getElementById("f3-titulo-final").focus();
}

function reintentarFase3() {
  estado.puntajes[3] = 0;
  estado.completadas[3] = false;
  const enlace = document.querySelector('.progreso a[data-fase="3"]');
  if (enlace) enlace.classList.remove("completada");
  actualizarPuntaje();
  actualizarFlechas(pantallaActual);
  empezarFase3();
  document.getElementById("f3-tablero").focus();
}

// Busca la posición de una letra en el mapa
function buscarEnMapa(letra) {
  for (let f = 0; f < TAM_RUTA; f++) {
    const c = MAPA_RUTA[f].indexOf(letra);
    if (c !== -1) return { fila: f, col: c };
  }
  return null;
}

// Camino más corto evitando peligros (búsqueda en anchura, BFS).
// Devuelve la cantidad de movimientos o null si no hay camino.
function calcularCaminoMasCorto(inicio, meta) {
  const distancia = { [`${inicio.fila},${inicio.col}`]: 0 };
  const cola = [inicio];
  while (cola.length) {
    const actual = cola.shift();
    const d = distancia[`${actual.fila},${actual.col}`];
    if (actual.fila === meta.fila && actual.col === meta.col) return d;
    Object.values(DIRECCIONES).forEach(([df, dc]) => {
      const f = actual.fila + df;
      const c = actual.col + dc;
      const clave = `${f},${c}`;
      if (f < 0 || f >= TAM_RUTA || c < 0 || c >= TAM_RUTA) return;
      if (PELIGROS_RUTA[MAPA_RUTA[f][c]] || clave in distancia) return;
      distancia[clave] = d + 1;
      cola.push({ fila: f, col: c });
    });
  }
  return null;
}

// Ficha de Tadeo: su cara con la capucha amarilla
function dibujarFichaTadeo() {
  return `
  <svg viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="19" fill="#f5c518"/>
    <circle cx="20" cy="22" r="13" fill="#e8b98a"/>
    <path d="M8 19q2-12 12-12t12 12q-6-5-12-4t-12 4z" fill="#5a3825"/>
    <circle cx="16" cy="22" r="2" fill="#10232e"/><circle cx="24" cy="22" r="2" fill="#10232e"/>
    <path d="M16 28q4 3 8 0" stroke="#10232e" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

// Flecha para los botones en pantalla (rotada según la dirección)
function flechaSVG(grados) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform: rotate(${grados}deg)"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* =========================================================
   4.4 FASE 4 · Después: Volver seguro
   ========================================================= */

// Valores ajustables de la fase
const CONFIG_FASE4 = {
  puntosAcierto: 12.5,  // 8 tarjetas x 12,5 = 100
  distanciaDecision: 110, // píxeles que hay que arrastrar para decidir
  maximo: 100
};

// Tarjetas: 4 seguras y 4 peligrosas.
// [VERIFICAR CON SENAPRED]
const TARJETAS_REGRESO = [
  { accion: "Tocar un cable caído", esSegura: false, explicacion: "Puede estar energizado. Aléjate y avisa a la compañía eléctrica o a las autoridades." },
  { accion: "Tomar agua de la llave sin confirmar que es potable", esSegura: false, explicacion: "Después de una inundación el agua puede estar contaminada. Usa agua embotellada o hervida hasta que las autoridades confirmen que es segura." },
  { accion: "Comer alimentos que tocaron el agua de la inundación", esSegura: false, explicacion: "El agua de la inundación puede traer basura y aguas servidas. Bota los alimentos que estuvieron en contacto con ella." },
  { accion: "Encender la luz y los enchufes aunque la casa esté mojada", esSegura: false, explicacion: "Puede provocar una descarga eléctrica o un cortocircuito. Primero hay que revisar que la instalación esté seca y segura." },
  { accion: "Revisar grietas antes de entrar a la casa", esSegura: true, explicacion: "Las grietas pueden indicar que la estructura se debilitó. Si ves daños importantes, no entres y pide ayuda." },
  { accion: "Volver a casa solo cuando las autoridades lo indiquen", esSegura: true, explicacion: "Así evitas zonas que todavía pueden ser peligrosas, como calles con barro o riesgo de nuevos aluviones." },
  { accion: "Usar botas y guantes para limpiar el barro", esSegura: true, explicacion: "Te protegen de cortes y del contacto con agua contaminada." },
  { accion: "Abrir puertas y ventanas para ventilar y secar la casa", esSegura: true, explicacion: "Ayuda a secar la casa y evita la humedad y el moho." }
];

let fase4 = null;

function iniciarFase4() {
  if (fase4 && fase4.terminado && estado.completadas[4]) return;
  empezarFase4();
}

function empezarFase4() {
  fase4 = {
    tarjetas: mezclar(TARJETAS_REGRESO.slice()),
    actual: 0,
    aciertos: 0,
    respuestas: [],      // true = acertó, false = se equivocó
    esperando: false,    // true mientras se muestra la explicación
    terminado: false
  };

  const total = fase4.tarjetas.length;
  const contenedor = document.getElementById("juego-fase-4");
  contenedor.innerHTML = `
    <div class="f4-escena">${dibujarRegreso()}</div>
    <div class="f3-panel">
      <span class="f1-dato">Tarjeta <b id="f4-numero">1</b> de ${total}</span>
      <span class="f1-dato bien">Aciertos: <b id="f4-aciertos">0</b></span>
    </div>
    <ol class="f4-puntos" id="f4-puntos" aria-hidden="true">${"<li></li>".repeat(total)}</ol>
    <p class="f1-ayuda f4-ayuda">Desliza la tarjeta a la <b class="txt-mal">izquierda si es peligroso</b> o a la <b class="txt-bien">derecha si es seguro</b>. También puedes usar los botones o las flechas del teclado.</p>

    <div class="f4-mazo" id="f4-mazo" aria-live="polite"></div>

    <div class="f4-botones">
      <button type="button" class="f4-boton peligroso" id="f4-peligroso">${flechaSVG(270)}<span>Peligroso</span></button>
      <button type="button" class="f4-boton seguro" id="f4-seguro"><span>Seguro</span>${flechaSVG(90)}</button>
    </div>

    <div class="f4-retro" id="f4-retro" hidden aria-live="polite"></div>
    <div class="f1-final" id="f4-final" hidden></div>
  `;

  document.getElementById("f4-peligroso").addEventListener("click", () => responderTarjeta(false));
  document.getElementById("f4-seguro").addEventListener("click", () => responderTarjeta(true));
  dibujarMazo();
}

// Dibuja la tarjeta actual y hasta 2 detrás (efecto de pila)
function dibujarMazo() {
  const mazo = document.getElementById("f4-mazo");
  mazo.innerHTML = "";
  const restantes = fase4.tarjetas.slice(fase4.actual, fase4.actual + 3);

  // Se agregan de atrás hacia adelante para que la primera quede encima
  for (let k = restantes.length - 1; k >= 0; k--) {
    const t = restantes[k];
    const tarjeta = document.createElement("article");
    tarjeta.className = "f4-tarjeta" + (k === 0 ? " arriba" : "");
    tarjeta.style.setProperty("--pila", k);
    tarjeta.innerHTML = `
      <span class="f4-sello sello-mal" aria-hidden="true">Peligroso</span>
      <span class="f4-sello sello-bien" aria-hidden="true">Seguro</span>
      <span class="f4-pregunta">¿Seguro o peligroso?</span>
      <p class="f4-accion">${t.accion}</p>
      <span class="f4-pista" aria-hidden="true">← Peligroso · Seguro →</span>
    `;
    if (k === 0) {
      tarjeta.setAttribute("aria-label", `Tarjeta ${fase4.actual + 1}: ${t.accion}. ¿Es seguro o peligroso?`);
      activarDeslizar(tarjeta);
    } else {
      tarjeta.setAttribute("aria-hidden", "true");
    }
    mazo.appendChild(tarjeta);
  }
  document.getElementById("f4-numero").textContent = Math.min(fase4.actual + 1, fase4.tarjetas.length);
}

// Arrastrar la tarjeta con mouse o dedo: se inclina y muestra el sello
function activarDeslizar(tarjeta) {
  let inicioX = 0;
  let dx = 0;
  let punteroId = null;

  tarjeta.addEventListener("pointerdown", (e) => {
    if (fase4.esperando || fase4.terminado) return;
    punteroId = e.pointerId;
    inicioX = e.clientX;
    dx = 0;
    tarjeta.setPointerCapture(punteroId);
    tarjeta.classList.add("arrastrando");
  });

  tarjeta.addEventListener("pointermove", (e) => {
    if (e.pointerId !== punteroId) return;
    dx = e.clientX - inicioX;
    tarjeta.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`;
    // Los sellos aparecen según la dirección
    const fuerza = Math.min(Math.abs(dx) / CONFIG_FASE4.distanciaDecision, 1);
    tarjeta.style.setProperty("--sello-bien", dx > 0 ? fuerza : 0);
    tarjeta.style.setProperty("--sello-mal", dx < 0 ? fuerza : 0);
  });

  const soltar = (e) => {
    if (e.pointerId !== punteroId) return;
    punteroId = null;
    tarjeta.classList.remove("arrastrando");
    if (Math.abs(dx) >= CONFIG_FASE4.distanciaDecision) {
      responderTarjeta(dx > 0); // derecha = seguro, izquierda = peligroso
    } else {
      // No llegó lo suficientemente lejos: vuelve a su lugar
      tarjeta.style.transform = "";
      tarjeta.style.setProperty("--sello-bien", 0);
      tarjeta.style.setProperty("--sello-mal", 0);
    }
  };
  tarjeta.addEventListener("pointerup", soltar);
  tarjeta.addEventListener("pointercancel", soltar);
}

// El jugador decide: true = seguro, false = peligroso
function responderTarjeta(diceSeguro) {
  if (!fase4 || fase4.esperando || fase4.terminado) return;
  const t = fase4.tarjetas[fase4.actual];
  const acerto = diceSeguro === t.esSegura;
  fase4.esperando = true;
  fase4.respuestas.push(acerto);
  if (acerto) fase4.aciertos++;
  document.getElementById("f4-aciertos").textContent = fase4.aciertos;

  // La tarjeta sale volando hacia el lado elegido
  const tarjeta = document.querySelector("#f4-mazo .f4-tarjeta.arriba");
  tarjeta.classList.add("volando");
  tarjeta.style.setProperty(diceSeguro ? "--sello-bien" : "--sello-mal", 1);
  tarjeta.style.transform = `translateX(${diceSeguro ? 140 : -140}%) rotate(${diceSeguro ? 24 : -24}deg)`;

  // Punto de progreso verde o rojo
  const punto = document.querySelectorAll("#f4-puntos li")[fase4.actual];
  punto.classList.add(acerto ? "bien" : "mal");

  // Retroalimentación con la explicación
  const retro = document.getElementById("f4-retro");
  retro.hidden = false;
  retro.className = "f4-retro " + (acerto ? "bien" : "mal");
  retro.innerHTML = "";
  const titulo = document.createElement("strong");
  titulo.textContent = acerto
    ? `✓ ¡Correcto! Es ${t.esSegura ? "seguro" : "peligroso"}.`
    : `✕ No era así: es ${t.esSegura ? "seguro" : "peligroso"}.`;
  const accion = document.createElement("p");
  accion.className = "f4-retro-accion";
  accion.textContent = t.accion;
  const explicacion = document.createElement("p");
  explicacion.textContent = t.explicacion;
  const ultima = fase4.actual === fase4.tarjetas.length - 1;
  const siguiente = document.createElement("button");
  siguiente.type = "button";
  siguiente.className = "boton";
  siguiente.textContent = ultima ? "Ver mi resultado de la fase" : "Siguiente tarjeta";
  siguiente.addEventListener("click", siguienteTarjeta);
  retro.append(titulo, accion, explicacion, siguiente);

  document.querySelectorAll(".f4-boton").forEach((b) => (b.disabled = true));
  setTimeout(() => siguiente.focus(), reducirMovimiento ? 0 : 350);
}

function siguienteTarjeta() {
  fase4.actual++;
  fase4.esperando = false;
  document.getElementById("f4-retro").hidden = true;
  document.querySelectorAll(".f4-boton").forEach((b) => (b.disabled = false));
  if (fase4.actual >= fase4.tarjetas.length) {
    terminarFase4();
  } else {
    dibujarMazo();
  }
}

// Flechas del teclado: izquierda = peligroso, derecha = seguro
document.addEventListener("keydown", (e) => {
  if (location.hash !== "#fase-4" || !fase4 || fase4.terminado || fase4.esperando) return;
  if (e.target.closest && e.target.closest("input, textarea")) return;
  if (e.key === "ArrowLeft") { e.preventDefault(); responderTarjeta(false); }
  if (e.key === "ArrowRight") { e.preventDefault(); responderTarjeta(true); }
});

// Si sale a la mitad, al volver la fase empieza de nuevo
window.addEventListener("hashchange", () => {
  if (location.hash !== "#fase-4" && fase4 && !fase4.terminado) fase4 = null;
});

function terminarFase4() {
  fase4.terminado = true;
  const total = fase4.tarjetas.length;
  const puntos = Math.min(CONFIG_FASE4.maximo, Math.round(fase4.aciertos * CONFIG_FASE4.puntosAcierto));
  sumarPuntos(4, puntos);
  completarFase(4);

  document.getElementById("f4-mazo").innerHTML = `<p class="f4-vacio">¡La familia de Tadeo ya está de vuelta en casa!</p>`;
  document.querySelector(".f4-botones").hidden = true;

  // Repaso de las tarjetas que se respondieron mal
  const errores = fase4.tarjetas.filter((t, i) => !fase4.respuestas[i]);
  const repaso = errores.length
    ? `<p>Para repasar:</p><ul class="f4-repaso">${errores.map((t) => `<li><b>${t.accion}</b>: es ${t.esSegura ? "seguro" : "peligroso"}.</li>`).join("")}</ul>`
    : "<p>¡Respondiste todas bien! La familia vuelve a casa de forma segura.</p>";

  const final = document.getElementById("f4-final");
  final.hidden = false;
  final.innerHTML = `
    <h3 tabindex="-1" id="f4-titulo-final">¡Regreso a casa!</h3>
    <p>Acertaste <b>${fase4.aciertos} de ${total}</b> tarjetas y obtuviste <b>${puntos} puntos</b>.</p>
    ${repaso}
    <div class="f1-acciones">
      <button type="button" class="boton boton-secundario" id="f4-reintentar">Reintentar fase</button>
      <a class="boton" href="#cierre">Ver resultado</a>
    </div>
  `;
  document.getElementById("f4-reintentar").addEventListener("click", reintentarFase4);
  document.getElementById("f4-titulo-final").focus();
}

function reintentarFase4() {
  estado.puntajes[4] = 0;
  estado.completadas[4] = false;
  const enlace = document.querySelector('.progreso a[data-fase="4"]');
  if (enlace) enlace.classList.remove("completada");
  actualizarPuntaje();
  actualizarFlechas(pantallaActual);
  empezarFase4();
}

// Escena: la familia vuelve a casa después del temporal (SVG 800 x 260)
function dibujarRegreso() {
  // Una persona simple: cabeza, cuerpo y piernas
  const persona = (x, alto, ropa, pelo) => `
    <g transform="translate(${x} 222)">
      <rect x="-9" y="${-alto * 0.38}" width="7" height="${alto * 0.38}" rx="3" fill="#2c4f7c"/>
      <rect x="2" y="${-alto * 0.38}" width="7" height="${alto * 0.38}" rx="3" fill="#2c4f7c"/>
      <rect x="-14" y="${-alto * 0.8}" width="28" height="${alto * 0.45}" rx="12" fill="${ropa}"/>
      <circle cx="0" cy="${-alto * 0.88}" r="${alto * 0.13}" fill="#e8b98a"/>
      <path d="M${-alto * 0.13} ${-alto * 0.9}q${alto * 0.13} ${-alto * 0.2} ${alto * 0.26} 0" fill="${pelo}"/>
      <circle cx="-4" cy="${-alto * 0.875}" r="1.8" fill="#10232e"/><circle cx="4" cy="${-alto * 0.875}" r="1.8" fill="#10232e"/>
      <path d="M-4 ${-alto * 0.82}q4 3 8 0" stroke="#10232e" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>`;

  return `
  <svg viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" role="img" aria-label="La familia de Tadeo vuelve a su casa después del temporal. Hay charcos y ramas en el suelo.">
    <defs>
      <linearGradient id="cielo-despues" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a5a6e"/><stop offset="1" stop-color="#4f8597"/>
      </linearGradient>
    </defs>
    <rect width="800" height="260" fill="url(#cielo-despues)"/>
    <!-- Sol que asoma entre las nubes -->
    <circle class="sol" cx="650" cy="70" r="34" fill="#f5d76e"/>
    <g fill="#7d8f99" opacity=".9"><ellipse cx="610" cy="88" rx="70" ry="22"/><ellipse cx="700" cy="96" rx="60" ry="18"/><ellipse cx="150" cy="54" rx="80" ry="22"/></g>
    <!-- Casa -->
    <rect x="80" y="110" width="190" height="112" fill="#c9b79c"/>
    <polygon points="66,114 175,52 284,114" fill="#7a3b2e"/>
    <rect x="155" y="150" width="40" height="72" fill="#5a3825"/>
    <rect x="100" y="132" width="40" height="32" fill="#f5d76e" stroke="#5a3825" stroke-width="4"/>
    <path d="M110 122l20 46" stroke="#3a4a55" stroke-width="2" opacity=".5"/>
    <!-- Suelo con barro, charcos y ramas -->
    <rect y="222" width="800" height="38" fill="#4a5a3a"/>
    <ellipse cx="330" cy="238" rx="60" ry="8" fill="#7fd0e8" opacity=".55"/>
    <ellipse cx="620" cy="244" rx="80" ry="9" fill="#7fd0e8" opacity=".55"/>
    <ellipse cx="90" cy="244" rx="40" ry="6" fill="#7fd0e8" opacity=".5"/>
    <g stroke="#6b4a2e" stroke-width="5" stroke-linecap="round"><path d="M430 238l60-10"/><path d="M460 233l10-14"/><path d="M700 230l50 8"/><path d="M230 240l40-6"/></g>
    <g fill="#5f8a3a"><ellipse cx="490" cy="226" rx="9" ry="5"/><ellipse cx="472" cy="218" rx="7" ry="4"/></g>
    <!-- Cable caído en el poste -->
    <rect x="760" y="110" width="8" height="112" fill="#8a99a3"/>
    <path d="M764 116q-40 40-48 104" stroke="#3a4a55" stroke-width="3" fill="none"/>
    <path d="M712 214l6 6-6 3 6 6" stroke="#f5c518" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- La familia -->
    ${persona(372, 110, "#3a6fb0", "#3a2a1e")}
    ${persona(412, 100, "#2f8a5a", "#5a3825")}
    ${persona(448, 72, "#f5c518", "#5a3825")}
    <!-- Canela y Michi -->
    <g transform="translate(486 222)"><ellipse cx="0" cy="-10" rx="16" ry="8" fill="#c98a4b"/><circle cx="15" cy="-20" r="8" fill="#c98a4b"/><ellipse cx="10" cy="-18" rx="3" ry="6" fill="#8a5a2b"/></g>
    <g transform="translate(330 222)"><ellipse cx="0" cy="-8" rx="12" ry="7" fill="#9aa1ab"/><circle cx="-11" cy="-16" r="7" fill="#9aa1ab"/><path d="M-17 -20l1-8 5 5zM-5 -20l-1-8-5 5z" fill="#8a8f99"/><path d="M11 -8q10-4 6-16" stroke="#8a8f99" stroke-width="4" fill="none" stroke-linecap="round"/></g>
  </svg>`;
}

/* =========================================================
   4.5 CIERRE · Puntaje, insignias y retroalimentación
   ========================================================= */

const CONFIG_CIERRE = {
  maximoTotal: 400,
  minimoInsignia: 70, // puntos de una fase para ganar su insignia
  mensajes: [
    { desde: 350, texto: "¡Familia preparada!" },
    { desde: 200, texto: "Vas bien, repasa algunas fases" },
    { desde: 0, texto: "Te recomendamos jugar de nuevo" }
  ]
};

// Frases de la historia según el puntaje total (se elige una al azar de su rango)
const FRASES_HISTORIA = [
  {
    desde: 350,
    frases: [
      "¡La familia de Tadeo está a salvo gracias a tu preparación! Revisa cómo te fue en cada fase.",
      "Tadeo, su familia, Canela y Michi superaron el temporal sin problemas. ¡Gran trabajo!",
      "Preparaste, protegiste, evacuaste y volviste seguro. La familia de Tadeo está orgullosa de ti."
    ]
  },
  {
    desde: 200,
    frases: [
      "La familia de Tadeo está a salvo, aunque hubo momentos difíciles. Revisa qué fases puedes mejorar.",
      "Tadeo y su familia lograron pasar el temporal. Con un poco más de práctica estarán aún mejor preparados.",
      "Buen trabajo: la familia salió adelante. Mira tus resultados para saber qué reforzar."
    ]
  },
  {
    desde: 100,
    frases: [
      "La familia de Tadeo pasó un gran susto durante el temporal. Revisa cada fase para prepararse mejor.",
      "Tadeo y su familia salieron del temporal, pero les faltó preparación. ¡Vuelve a intentarlo!",
      "El temporal fue difícil para la familia de Tadeo. Repasar las fases les ayudará la próxima vez."
    ]
  },
  {
    desde: 0,
    frases: [
      "El temporal tomó por sorpresa a la familia de Tadeo. Juega de nuevo para ayudarlos a prepararse.",
      "La familia de Tadeo necesita tu ayuda para enfrentar el próximo temporal. ¡Inténtalo otra vez!",
      "Esta vez el temporal fue más fuerte que la preparación. Cada intento te enseña algo nuevo."
    ]
  }
];

// Una insignia por fase: nombre, color de la medalla e ícono (cuadro de 40 x 40)
const INSIGNIAS = {
  1: { nombre: "Experto en mochilas", color: "#1d8fa0",
       icono: '<rect x="10" y="12" width="20" height="24" rx="6" fill="#fff"/><path d="M10 20q0-8 10-8t10 8" fill="none" stroke="#fff" stroke-width="3"/><rect x="14" y="24" width="12" height="8" rx="2" fill="currentColor" opacity=".35"/><path d="M15 12q0-6 5-6t5 6" fill="none" stroke="#fff" stroke-width="2.5"/>' },
  2: { nombre: "Guardián de mascotas", color: "#2e9e5b",
       icono: '<ellipse cx="20" cy="27" rx="9" ry="7.5" fill="#fff"/><circle cx="10" cy="17" r="3.6" fill="#fff"/><circle cx="16" cy="11" r="3.6" fill="#fff"/><circle cx="24" cy="11" r="3.6" fill="#fff"/><circle cx="30" cy="17" r="3.6" fill="#fff"/>' },
  3: { nombre: "Evacuación segura", color: "#4f7fd8",
       icono: '<path d="M6 34l10-14 6 7 5-6 7 13z" fill="#fff" opacity=".55"/><path d="M14 32V6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M15 7h15l-4 5 4 5H15z" fill="#fff"/>' },
  4: { nombre: "Regreso responsable", color: "#b9773f",
       icono: '<path d="M6 20L20 8l14 12" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="11" y="19" width="18" height="15" rx="2" fill="#fff"/><path d="M15 26l4 4 7-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' }
};

// Frases para la conclusión según la fase con mayor y menor puntaje
const FRASES_CIERRE = {
  bien: {
    1: "armaste muy bien la mochila de emergencia.",
    2: "encontraste los peligros de la casa y protegiste a las mascotas.",
    3: "evacuaste con decisión hacia la zona alta.",
    4: "tomaste buenas decisiones al volver a casa."
  },
  repasar: {
    1: "qué objetos son esenciales en la mochila de emergencia.",
    2: "cómo preparar la casa antes de las lluvias.",
    3: "la ruta de evacuación: busca siempre los lugares altos y evita calles inundadas, quebradas y cables.",
    4: "qué es seguro hacer al volver a casa después de una inundación."
  }
};

function mostrarCierre() {
  const lista = document.getElementById("resumen-fases");
  lista.innerHTML = "";
  for (let f = 1; f <= 4; f++) {
    const li = document.createElement("li");
    li.innerHTML = `<span>Fase ${f}</span><strong>${NOMBRES_FASES[f]}</strong><b>${estado.puntajes[f]}</b>`;
    lista.appendChild(li);
  }
  mostrarRanking(); // NUEVO: dibuja el Top 5
  actualizarPuntaje(); // la barra superior muestra el mismo total
  mostrarTotalCierre();
  mostrarInsignias();
  mostrarConclusion();
  detenerLluvia();
}

// Puntaje total, mensaje según el resultado y el sol que aparece
function mostrarTotalCierre() {
  const total = puntajeTotal();
  const mensaje = CONFIG_CIERRE.mensajes.find((m) => total >= m.desde).texto;

  // La frase bajo el título "Tu resultado" cambia según el puntaje
  const rango = FRASES_HISTORIA.find((r) => total >= r.desde);
  document.getElementById("historia-cierre").textContent =
    rango.frases[Math.floor(Math.random() * rango.frases.length)];
  const caja = document.getElementById("cierre-total");
  caja.innerHTML = `
    <div class="cierre-texto">
      <span class="etiqueta">${estado.apodo ? estado.apodo + ", tu puntaje total" : "Tu puntaje total"}</span>
      <p class="cierre-numero"><b>${total}</b> <span>/ ${CONFIG_CIERRE.maximoTotal}</span></p>
      <p class="cierre-mensaje">${mensaje}</p>
      <div class="cierre-barra" role="progressbar" aria-label="Puntaje total" aria-valuemin="0" aria-valuemax="${CONFIG_CIERRE.maximoTotal}" aria-valuenow="${total}">
        <span style="--avance: ${(total / CONFIG_CIERRE.maximoTotal) * 100}%"></span>
      </div>
    </div>
    <svg class="sol-cierre" viewBox="0 0 120 120" aria-hidden="true">
      <g class="rayos" stroke="#f5d76e" stroke-width="6" stroke-linecap="round">
        <path d="M60 6v14M60 100v14M6 60h14M100 60h14M22 22l10 10M88 88l10 10M98 22L88 32M32 88L22 98"/>
      </g>
      <circle cx="60" cy="60" r="28" fill="#f5d76e"/>
      <circle cx="51" cy="56" r="3" fill="#10232e"/><circle cx="69" cy="56" r="3" fill="#10232e"/>
      <path d="M50 67q10 9 20 0" stroke="#10232e" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>
  `;
  // Reinicia la animación del sol cada vez que se entra al cierre
  const sol = caja.querySelector(".sol-cierre");
  sol.classList.remove("salir");
  void sol.getBoundingClientRect();
  sol.classList.add("salir");
}

// Medallas: se gana la de una fase con 70 puntos o más
function mostrarInsignias() {
  const lista = document.getElementById("insignias");
  lista.innerHTML = "";
  let orden = 0;
  for (let f = 1; f <= 4; f++) {
    const ins = INSIGNIAS[f];
    const puntos = estado.puntajes[f];
    const ganada = puntos >= CONFIG_CIERRE.minimoInsignia;
    const li = document.createElement("li");
    li.className = "insignia " + (ganada ? "ganada" : "pendiente");
    if (ganada) li.style.setProperty("--retraso", `${orden++ * 180}ms`);
    li.innerHTML = `
      <svg viewBox="0 0 120 140" aria-hidden="true" style="color: ${ins.color}">
        <path d="M38 96l-12 38 18-8 10 14 10-38z" fill="${ins.color}" opacity=".75"/>
        <path d="M82 96l12 38-18-8-10 14-10-38z" fill="${ins.color}" opacity=".75"/>
        <circle cx="60" cy="58" r="50" fill="${ins.color}"/>
        <circle cx="60" cy="58" r="41" fill="none" stroke="#fff" stroke-width="3" opacity=".45"/>
        <path d="M24 40a42 42 0 0 1 30-26" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".35"/>
        <g transform="translate(36 34) scale(1.2)">${ins.icono}</g>
      </svg>
      <strong>${ins.nombre}</strong>
      <span>${ganada ? `¡Ganada! ${puntos} pts` : `Por conseguir · ${puntos}/${CONFIG_CIERRE.minimoInsignia} pts`}</span>
    `;
    li.setAttribute("aria-label", `${ins.nombre}: ${ganada ? "ganada" : "por conseguir"}, ${puntos} puntos en la fase ${f}`);
    lista.appendChild(li);
  }
}

// Conclusión: lo que hizo mejor y lo que conviene repasar
function mostrarConclusion() {
  const puntajes = [1, 2, 3, 4].map((f) => ({ fase: f, puntos: estado.puntajes[f] }));
  const mejor = puntajes.reduce((a, b) => (b.puntos > a.puntos ? b : a));
  const peor = puntajes.reduce((a, b) => (b.puntos < a.puntos ? b : a));

  let fraseBien;
  let fraseRepasar;
  if (puntajeTotal() === 0) {
    fraseBien = "Diste el primer paso: conocer los riesgos de El Niño.";
    fraseRepasar = "Juega cada fase para aprender a prepararte antes, durante y después de las lluvias.";
  } else {
    fraseBien = `Lo que hiciste mejor: ${FRASES_CIERRE.bien[mejor.fase]}`;
    fraseRepasar = peor.puntos >= 90
      ? "Para repasar: ¡nada pendiente! Comparte lo que aprendiste con tu familia."
      : `Para repasar: ${FRASES_CIERRE.repasar[peor.fase]}`;
  }

  const caja = document.getElementById("conclusion");
  caja.innerHTML = `
    <h3 id="t-conclusion">Conclusión</h3>
    <p class="conclusion-bien">${fraseBien}</p>
    <p class="conclusion-repasar">${fraseRepasar}</p>
    <p class="nota">Recuerda: ante una emergencia real, sigue siempre las indicaciones de SENAPRED y las autoridades.</p>
  `;
}

// La lluvia se detiene de a poco al llegar al cierre
function detenerLluvia() {
  if (reducirMovimiento) {
    intensidadLluvia = 0;
    ctx.clearRect(0, 0, anchoLienzo, altoLienzo);
    return;
  }
  const bajar = () => {
    if (pantallaActual !== "cierre") return; // si sale del cierre, la lluvia vuelve
    intensidadLluvia = Math.max(0, intensidadLluvia - 0.015);
    if (intensidadLluvia > 0) requestAnimationFrame(bajar);
  };
  requestAnimationFrame(bajar);
}

function reiniciarJuego() {
  for (let f = 1; f <= 4; f++) {
    estado.puntajes[f] = 0;
    estado.completadas[f] = false;
    estado.finalizadas[f] = false; // NUEVO: vuelve a bloquear las fases
  }
  // Las fases empiezan de cero la próxima vez
  fase1 = fase2 = fase3 = fase4 = null;
  document.querySelectorAll(".progreso a").forEach((e) => e.classList.remove("completada"));
  actualizarPuntaje();
  actualizarBloqueos();
  location.hash = "#portada";
}
document.getElementById("reiniciar").addEventListener("click", reiniciarJuego);

/* ---------- NUEVO: registro del apodo ----------
   El apodo es opcional y vive solo en "estado": no se guarda en
   el navegador ni se envía a ningún lado. Al cerrar la página se borra. */
const formRegistro = document.getElementById("form-registro");
const campoApodo = document.getElementById("apodo");
const mensajeApodo = document.getElementById("mensaje-apodo");

// Limpia lo que escribe el jugador: quita espacios sobrantes
// y deja solo letras, números, espacios, guiones y guion bajo.
function limpiarApodo(texto) {
  return texto
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .slice(0, 15);
}

function guardarApodo(evento) {
  evento.preventDefault(); // evita que el formulario recargue la página
  const apodo = limpiarApodo(campoApodo.value);

  if (apodo.length < 2) {
    mensajeApodo.textContent = "Escribe un apodo de al menos 2 letras.";
    mensajeApodo.className = "mensaje-apodo error";
    campoApodo.setAttribute("aria-invalid", "true");
    campoApodo.focus();
    return;
  }

  estado.apodo = apodo;
  campoApodo.value = apodo;
  campoApodo.removeAttribute("aria-invalid");
  mensajeApodo.textContent = `¡Hola, ${apodo}! Comienza la aventura de Tadeo...`;
  mensajeApodo.className = "mensaje-apodo ok";
  mostrarApodoEnBarra();

  // NUEVO: con el apodo listo se desbloquea y comienza el juego en la fase pendiente
  const continuar = document.getElementById("boton-continuar");
  continuar.hidden = false;
  continuar.href = "#" + primeraPendiente();
  actualizarBloqueos();
  setTimeout(() => (location.hash = "#" + primeraPendiente()), reducirMovimiento ? 0 : 700);
}
formRegistro.addEventListener("submit", guardarApodo);

// Muestra el apodo en la barra superior (textContent evita insertar HTML)
function mostrarApodoEnBarra() {
  const caja = document.getElementById("jugador-barra");
  caja.textContent = "Jugador: " + estado.apodo;
  caja.hidden = false;
}

/* ---------- NUEVO: ranking ficticio Top 5 ----------
   Los otros jugadores son personajes inventados para motivar
   a conseguir más puntos. El puntaje máximo del juego es 400. */
const JUGADORES_FICTICIOS = [
  { apodo: "Gota Veloz", puntos: 380 },
  { apodo: "Capitana Paraguas", puntos: 320 },
  { apodo: "Rayo Chapuzón", puntos: 260 },
  { apodo: "Nube Sabia", puntos: 190 },
  { apodo: "Charquito", puntos: 120 }
];

function puntajeTotal() {
  return Object.values(estado.puntajes).reduce((a, b) => a + b, 0);
}

function mostrarRanking() {
  const lista = document.getElementById("lista-ranking");
  const mensaje = document.getElementById("mensaje-ranking");
  const jugador = { apodo: estado.apodo || "Tú", puntos: puntajeTotal(), esJugador: true };

  // 1) Juntamos al jugador con los ficticios y ordenamos de mayor a menor.
  //    Si empata, el jugador queda arriba como premio.
  const todos = [...JUGADORES_FICTICIOS, jugador].sort(
    (a, b) => b.puntos - a.puntos || (b.esJugador ? 1 : 0) - (a.esJugador ? 1 : 0)
  );
  const posicion = todos.indexOf(jugador) + 1;

  // 2) Mostramos los 5 primeros. Si el jugador quedó fuera, lo agregamos al final.
  const filas = todos.slice(0, 5);
  if (posicion > 5) filas.push(jugador);

  lista.innerHTML = "";
  filas.forEach((j) => {
    const li = document.createElement("li");
    const lugar = todos.indexOf(j) + 1;
    if (j.esJugador) li.classList.add("tu-fila");
    if (j.esJugador && posicion > 5) li.classList.add("fuera-top");

    const num = document.createElement("span");
    num.className = "posicion";
    num.textContent = lugar;

    const nombre = document.createElement("span");
    nombre.textContent = j.esJugador ? `${j.apodo} (tú)` : j.apodo;

    const pts = document.createElement("span");
    pts.className = "puntos";
    pts.textContent = `${j.puntos} pts`;

    li.append(num, nombre, pts);
    li.setAttribute("aria-label", `Lugar ${lugar}: ${nombre.textContent}, ${j.puntos} puntos`);
    lista.appendChild(li);
  });

  // 3) Mensaje para motivar a subir en el ranking
  if (posicion === 1) {
    mensaje.textContent = "¡Primer lugar! Eres la persona mejor preparada para el temporal.";
  } else {
    const siguiente = todos[posicion - 2];
    const faltan = siguiente.puntos - jugador.puntos + 1;
    mensaje.textContent = `Quedaste en el lugar ${posicion}. Te faltan ${faltan} puntos para superar a ${siguiente.apodo}.`;
  }
}

/* ---------- 5. Tadeo (personaje dibujado con SVG) ----------
   Se reutilizará en las fases. */
function dibujarTadeo() {
  return `
  <svg viewBox="0 0 320 420" role="img" aria-label="Tadeo con impermeable amarillo y mochila azul">
    <g class="nube" fill="#5f7480" opacity=".8"><ellipse cx="40" cy="44" rx="34" ry="16"/><ellipse cx="66" cy="36" rx="26" ry="18"/></g>
    <g class="nube lenta" fill="#4c6170" opacity=".7"><ellipse cx="10" cy="80" rx="28" ry="12"/><ellipse cx="32" cy="72" rx="22" ry="15"/></g>
    <ellipse cx="165" cy="398" rx="120" ry="12" fill="#2a6b80" opacity=".7"/>
    <g class="tadeo-flota">
      <rect x="142" y="300" width="22" height="66" rx="8" fill="#2c4f7c"/>
      <rect x="172" y="300" width="22" height="66" rx="8" fill="#2c4f7c"/>
      <path d="M136 360h30v28h-30q-8 0-8-8v-12q0-8 8-8z" fill="#d64541"/>
      <path d="M168 360h30q10 0 10 10v18h-40z" fill="#d64541"/>
      <!-- Mochila: el grupo "mochila-objetos" recibe los íconos en la Fase 1 -->
      <g class="mochila">
        <g class="mochila-objetos"></g>
        <rect x="64" y="170" width="78" height="122" rx="20" fill="#1d5fa8"/>
        <path d="M64 196q0-26 39-26q39 0 39 26v8h-78z" fill="#174d8a"/>
        <rect x="76" y="232" width="54" height="40" rx="10" fill="#174d8a"/>
        <rect x="96" y="226" width="14" height="10" rx="3" fill="#f0a447"/>
      </g>
      <rect x="128" y="168" width="84" height="146" rx="32" fill="#f5c518"/>
      <circle cx="182" cy="214" r="4" fill="#c99a06"/><circle cx="182" cy="244" r="4" fill="#c99a06"/><circle cx="182" cy="274" r="4" fill="#c99a06"/>
      <path d="M140 176q22 30 24 92" stroke="#174d8a" stroke-width="9" fill="none" stroke-linecap="round"/>
      <rect x="190" y="190" width="24" height="86" rx="12" fill="#e2b30f" transform="rotate(-18 202 190)"/>
      <circle cx="222" cy="268" r="11" fill="#e8b98a"/>
      <path d="M118 124q0-58 54-58q54 0 54 58v20h-108z" fill="#f5c518"/>
      <circle cx="172" cy="130" r="40" fill="#e8b98a"/>
      <path d="M134 116q8-34 42-34q30 0 38 26q-20-10-44-6q-20 4-36 14z" fill="#5a3825"/>
      <circle cx="190" cy="128" r="5" fill="#10232e"/><circle cx="160" cy="128" r="5" fill="#10232e"/>
      <circle cx="198" cy="144" r="6" fill="#f2a08a" opacity=".6"/><circle cx="150" cy="144" r="6" fill="#f2a08a" opacity=".6"/>
      <path d="M164 150q11 10 22 0" stroke="#10232e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;
}
document.getElementById("tadeo-portada").innerHTML = dibujarTadeo();

/* ---------- 6. Lluvia de fondo ----------
   Se intensifica a medida que avanzan las fases y se detiene
   si el usuario prefiere menos movimiento. */
let intensidadLluvia = 0.3;
const lienzo = document.getElementById("lluvia");
const ctx = lienzo.getContext("2d");
const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let gotas = [];

// El lienzo se dibuja según la densidad de la pantalla (retina, celulares)
// para que la lluvia se vea nítida y no pixelada.
let anchoLienzo = 0;
let altoLienzo = 0;
function ajustarLienzo() {
  const densidad = Math.min(window.devicePixelRatio || 1, 2);
  anchoLienzo = window.innerWidth;
  altoLienzo = window.innerHeight;
  lienzo.width = Math.round(anchoLienzo * densidad);
  lienzo.height = Math.round(altoLienzo * densidad);
  ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
  // Menos gotas en pantallas chicas: se ve igual y consume menos batería
  const cantidad = anchoLienzo < 600 ? 120 : 220;
  gotas = Array.from({ length: cantidad }, () => ({
    x: Math.random() * anchoLienzo,
    y: Math.random() * altoLienzo,
    largo: 8 + Math.random() * 14,
    velocidad: 4 + Math.random() * 4
  }));
  if (reducirMovimiento) dibujarLluvia();
}

let lluviaActiva = false;
function dibujarLluvia() {
  ctx.clearRect(0, 0, anchoLienzo, altoLienzo);
  ctx.strokeStyle = "rgba(150, 220, 232, 0.35)";
  ctx.lineWidth = 1.2;
  const cantidad = Math.floor(gotas.length * Math.min(intensidadLluvia, 1));
  for (let i = 0; i < cantidad; i++) {
    const g = gotas[i];
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x - 2, g.y + g.largo);
    ctx.stroke();
    if (!reducirMovimiento) {
      g.y += g.velocidad;
      g.x -= 0.5;
      if (g.y > altoLienzo) { g.y = -g.largo; g.x = Math.random() * (anchoLienzo + 40); }
    }
  }
  // Solo sigue animando si la pestaña está visible y hay lluvia que mostrar
  lluviaActiva = !reducirMovimiento && !document.hidden && intensidadLluvia > 0;
  if (lluviaActiva) requestAnimationFrame(dibujarLluvia);
}

// Retoma la animación cuando vuelve la lluvia o la pestaña vuelve a verse
function reanudarLluvia() {
  if (!lluviaActiva && !reducirMovimiento && !document.hidden) dibujarLluvia();
}
document.addEventListener("visibilitychange", reanudarLluvia);

/* ---------- 7. Inicio ---------- */
let esperaResize = null;
window.addEventListener("resize", () => {
  clearTimeout(esperaResize);
  esperaResize = setTimeout(ajustarLienzo, 150);
});
// Al abrir con un # (por ejemplo #fase-2) el navegador baja hasta la sección;
// esto deja la vista arriba para que se vea el título de la fase.
window.addEventListener("load", () => window.scrollTo(0, 0));
ajustarLienzo();
dibujarLluvia();
crearIndicadores();
mostrarPantalla();
actualizarBloqueos();

// Aviso visible para no olvidar desactivar el modo desarrollo
if (MODO_DESARROLLO) {
  const etiqueta = document.createElement("div");
  etiqueta.className = "etiqueta-desarrollo";
  etiqueta.textContent = "Modo desarrollo: fases desbloqueadas";
  document.body.appendChild(etiqueta);
}
