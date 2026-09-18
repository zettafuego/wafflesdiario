/**
 * Waffle Daily — catálogo de áreas, tareas semilla y calendario ISO.
 * Fechas en hora local (no UTC), semanas ISO: YYYY-Www (lunes–domingo).
 */
var Waffle = (window.Waffle = window.Waffle || {});

Waffle.ORG = {
  waffles: { id: "waffles", name: "Waffles Tech", color: "#e8b86a" },
  buena: { id: "buena", name: "Waffles · Buena Suerte", color: "#e07a5f" },
  casma: { id: "casma", name: "SSOMA Casma", color: "#8fbe8b" },
  life: { id: "life", name: "Personal", color: "#cbb59a" },
};

Waffle.CATS = [
  { id: "foco", name: "Foco", color: "#f3d39a", org: "life" },
  { id: "aseo", name: "Aseo personal", color: "#8fbe8b", org: "life" },
  { id: "rh", name: "RH", color: "#e8b86a", org: "waffles" },
  { id: "game", name: "Videojuego", color: "#7eb8c9", org: "waffles" },
  { id: "pharmony", name: "Pharmony", color: "#b59cd6", org: "waffles" },
  { id: "mineria", name: "MinerIA", color: "#d9899b", org: "waffles" },
  { id: "ambar", name: "Buena Suerte", color: "#e07a5f", org: "buena" },
  { id: "casma", name: "SSOMA Casma", color: "#8fbe8b", org: "casma" },
  { id: "lovesong", name: "Love Song", color: "#e8a0b8", org: "life" },
  { id: "finanzas", name: "Finanzas", color: "#c9a27a", org: "life" },
  { id: "aprender", name: "Aprender", color: "#7eb8c9", org: "life" },
  { id: "arte", name: "Arte · ESFAPUNA", color: "#f3d39a", org: "life" },
  { id: "maestra", name: "Maestría", color: "#cbb59a", org: "life" },
  { id: "vida", name: "Vida", color: "#c9a27a", org: "life" },
];

Waffle.isWafflesFamily = function isWafflesFamily(orgOrCat) {
  const org = typeof orgOrCat === "string" && Waffle.ORG[orgOrCat]
    ? orgOrCat
    : Waffle.catById(orgOrCat).org;
  return org === "waffles" || org === "buena";
};

Waffle.WAFFLES_CATS = Waffle.CATS.filter((c) => c.org === "waffles").map((c) => c.id);
Waffle.BUENA_CATS = Waffle.CATS.filter((c) => c.org === "buena").map((c) => c.id);

Waffle.SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6vkOLCFkIwB7u5YzA4DBCF4_WE_fX6jMEpPGBGIQ-unepVTdFoDb4ZeV10E7NwY1m_A/exec";

Waffle.WAFFLES_SHEET = {
  id: "1fPzctVZUMSoXBelt0D6Iq7x7Tr6MQLuWJtFcoh8eZ6s",
  url: "https://docs.google.com/spreadsheets/d/1fPzctVZUMSoXBelt0D6Iq7x7Tr6MQLuWJtFcoh8eZ6s/edit?gid=0#gid=0",
  cols: ["creación de la tarea", "personas", "tarea", "detalle", "prioridad", "plazo", "bloqueos", "estatus"],
  peopleByCat: {
    rh: "Eduardo Sanchez, Renzo Valle",
    game: "Eduardo Sanchez, Violeta Pereyra, Dizzy Steeve",
    ambar: "Eduardo Sanchez, Zahira Cotrina, Violeta Pereyra · Buena Suerte",
    pharmony: "Eduardo Sanchez",
    mineria: "Eduardo Sanchez, Juan Mujica",
  },
  status: {
    backlog: "Backlog",
    todo: "Por iniciar",
    doing: "En progreso",
    review: "Revisión",
    done: "Tarea terminada",
  },
};

Waffle.ESTATUS_DIA = {
  name: "Estatus del día",
  cols: [
    "fecha",
    "semana",
    "clasificación",
    "organización",
    "área",
    "tarea",
    "tipo",
    "estatus",
    "detalle",
    "personas",
    "hora",
    "id",
  ],
};

Waffle.RESUMEN = {
  name: "Resumen",
  cols: [
    "tarea",
    "clasificación",
    "tipo",
    "organización",
    "área",
    "veces terminada",
    "días registrada",
    "última fecha",
    "id",
  ],
};

Waffle.orgName = function orgName(orgId) {
  return (Waffle.ORG[orgId] && Waffle.ORG[orgId].name) || orgId || "Personal";
};

Waffle.tipoLabel = function tipoLabel(type) {
  if (type === "once") return "Una vez";
  if (type === "monthly") return "Mensual";
  return "Diario";
};

Waffle.clasificacion = function clasificacion(task) {
  if (task && task.vital) return "Vital";
  return Waffle.tipoLabel(task && task.type);
};

Waffle.estatusDelDia = function estatusDelDia(done, scrum) {
  if (done) return "Tarea terminada";
  return (Waffle.WAFFLES_SHEET.status[scrum] || "Por iniciar");
};

Waffle.DEFAULTS = [
  { id: "f1", cat: "foco", title: "Encuentra el foco", note: "Una sola cosa. Lo demás espera.", type: "daily" },
  { id: "f3", cat: "foco", title: "Paz mental", note: "Un respiro antes de seguir", type: "daily" },
  { id: "f2", cat: "foco", title: "Dejar más ordenado de como lo encontré", note: "Mantra · cierre", type: "daily" },

  { id: "a1", cat: "aseo", title: "Dientes", note: "Mañana y noche", type: "daily" },
  { id: "a2", cat: "aseo", title: "Reflujo / medicación", note: "", type: "daily" },
  { id: "a3", cat: "aseo", title: "Afeitar", note: "", type: "daily" },
  { id: "a4", cat: "aseo", title: "Ejercicio", note: "Aunque sea corto", type: "daily" },
  { id: "a5", cat: "aseo", title: "Oler rico", note: "Mantra · uwu", type: "daily" },

  { id: "r1", cat: "rh", title: "Firmar documentos / cartas corporativas", note: "Waffles RH", type: "once" },
  { id: "r2", cat: "rh", title: "Revisar pendientes de gente", note: "10 min", type: "daily" },
  { id: "r0", cat: "rh", title: "10 min para ordenar Waffles", note: "Vital · dejar más ordenado de como lo encontré", type: "daily", vital: true },
  { id: "r3", cat: "rh", title: "One to one Waffles (si toca hoy)", note: "uwu · una persona, presencia real", type: "daily" },

  { id: "g1", cat: "game", title: "Desarrollar personaje", note: "", type: "daily" },
  { id: "g2", cat: "game", title: "Ordenar archivos", note: "", type: "once" },
  { id: "g3", cat: "game", title: "Revisión iluminado one to one", note: "Hijos y Angela", type: "once" },
  { id: "g4", cat: "game", title: "Claude de color beige / secuencia", note: "", type: "once" },
  { id: "g5", cat: "game", title: "Commit o captura de avance", note: "Evidencia del día", type: "daily" },

  { id: "b1", cat: "ambar", title: "Renegociar reels", note: "2 reels tatuajes / 1 reel Waffles · Buena Suerte", type: "once" },
  { id: "b2", cat: "ambar", title: "Publicar 1 cosa", note: "Buena Suerte", type: "daily" },
  { id: "b3", cat: "ambar", title: "Pedir cosas pendientes", note: "", type: "once" },
  { id: "b4", cat: "ambar", title: "Grabar reel (tecnología u otras cosas)", note: "A diario · Buena Suerte", type: "daily" },

  { id: "p1", cat: "pharmony", title: "10 min con Bard", note: "19:00 · demo", type: "daily", hour: 19, minute: 0 },
  { id: "p2", cat: "pharmony", title: "Commitear avances", note: "", type: "daily" },

  { id: "m1", cat: "mineria", title: "Ratic y Orillo: definir fechas", note: "MinerIA Waffles", type: "once" },
  { id: "m2", cat: "mineria", title: "Revisar bases del concurso", note: "", type: "once" },
  { id: "m3", cat: "mineria", title: "Avance MinerIA (código o paper)", note: "Aunque sea 20 min", type: "daily" },

  { id: "ls1", cat: "lovesong", title: "Letra: un verso o estribillo", note: "Love Song", type: "daily" },
  { id: "ls2", cat: "lovesong", title: "Melodía / armonía", note: "Piano, voz o hum", type: "daily" },
  { id: "ls3", cat: "lovesong", title: "Grabar un take", note: "Aunque sea rough", type: "daily" },
  { id: "ls4", cat: "lovesong", title: "Escuchar una referencia", note: "1 canción consciente", type: "daily" },
  { id: "ls5", cat: "lovesong", title: "Definir estructura de la canción", note: "Verso / coro / puente", type: "once" },
  { id: "ls6", cat: "lovesong", title: "Leer sobre seducción", note: "uwu · un rato, sin drama", type: "daily" },

  { id: "c0", cat: "casma", title: "10 min para ordenar trabajo SSOMA", note: "Vital · Casma", type: "daily", vital: true },
  { id: "c1", cat: "casma", title: "Avance SSOMA Casma", note: "Código, tesis o campo", type: "daily" },
  { id: "v2", cat: "casma", title: "Agradecer de corazón a la mina", note: "SSOMA Casma", type: "daily" },
  { id: "v3", cat: "casma", title: "Cargar linterna", note: "SSOMA Casma", type: "once" },

  { id: "fn1", cat: "finanzas", title: "Finanzas personales", note: "Mirar números 5 min", type: "daily" },
  { id: "fn2", cat: "finanzas", title: "Ahorrar 20 soles, sin sacar", note: "Diario · no tocar", type: "daily" },
  { id: "fn3", cat: "finanzas", title: "Fecha de pagos (quincena)", note: "Cada 15 del mes", type: "monthly", monthDay: 15 },

  { id: "art1", cat: "arte", title: "Anatomía artística I", note: "ESFAPUNA · práctica diaria", type: "daily", hour: 10, minute: 0 },
  { id: "art2", cat: "arte", title: "Anatomía artística II", note: "ESFAPUNA · práctica diaria", type: "daily", hour: 11, minute: 0 },
  { id: "art3", cat: "arte", title: "Dibujo / ejercicio de artista", note: "Una sesión consciente", type: "daily" },

  { id: "t1", cat: "maestra", title: "Pagar mensualidad", note: "Maestría · en soles", type: "monthly", monthDay: 15 },
  { id: "t2", cat: "maestra", title: "Preguntar cómo ser investigador", note: "Maestría", type: "once" },
  { id: "t3", cat: "maestra", title: "Estudiar / leer 25 min", note: "Maestría", type: "daily" },

  { id: "v1", cat: "vida", title: "Agradecer el trabajo", note: "", type: "daily" },
  { id: "v4", cat: "vida", title: "Ronroneo / buena onda", note: "Toca a Waffle", type: "daily" },
  { id: "v5", cat: "vida", title: "Antes de dormir, cargar el celular", note: "Mantra · uwu", type: "daily" },
  { id: "v6", cat: "vida", title: "Pedir ayuda", note: "Mantra · no tienes que solo", type: "daily" },
  { id: "v7", cat: "vida", title: "Cuidar amigos", note: "Mantra · uwu · presencia", type: "daily" },
  { id: "v8", cat: "vida", title: "Carta del Edu del pasado", note: "Eres un crack. Te quiere mucho.", type: "daily" },
  { id: "v9", cat: "vida", title: "Un paso, no diez", note: "Mantra · crack · el de antes ya confía", type: "daily" },
];

Waffle.MANTRA = "Mi paz mental. Dejar todo más ordenado de como lo encontré.";
Waffle.MANTRAS = [
  "Mi paz mental. Dejar todo más ordenado de como lo encontré.",
  "Antes de dormir, cargar el celular.",
  "Oler rico.",
  "Pedir ayuda.",
  "Cuidar amigos.",
  "Eres un crack. Una sola cosa.",
  "El Edu del pasado te quiere mucho.",
];
Waffle.CRACK = "Eres un crack.";
Waffle.PAST_LOVE = "El Edu del pasado te quiere mucho.";
Waffle.FOCUS_TASK_ID = "f1";
Waffle.PURR_TASK_ID = "v4";
Waffle.LETTER_TASK_ID = "v8";

/** Cómo Edu resuelve: cuerpo → paz → vitales → pendientes de una vez → hora → el resto. */
Waffle.PRIORITY = {
  vital: 1000,
  oto: 920,
  once: 480,
  monthly: 420,
  timedSoon: 780,
  timedOver: 640,
  daily: 70,
  cats: {
    foco: 95,
    aseo: 88,
    rh: 80,
    casma: 76,
    ambar: 70,
    lovesong: 64,
    pharmony: 60,
    mineria: 56,
    game: 50,
    finanzas: 46,
    maestra: 42,
    arte: 40,
    aprender: 34,
    vida: 28,
  },
};

Waffle.SCRUM = [
  { id: "backlog", name: "Backlog", hint: "Aún no entra al sprint" },
  { id: "todo", name: "Por hacer", hint: "Comprometido esta semana" },
  { id: "doing", name: "En curso", hint: "WIP 1 · el foco" },
  { id: "review", name: "Revisión", hint: "Casi, falta evidencia o cierre" },
  { id: "done", name: "Hecho", hint: "Más ordenado de como lo encontré" },
];

Waffle.VIBES = [
  { id: "uwu", label: "uwu", hint: "Cariño, cercanía" },
  { id: "bien", label: "Bien", hint: "Buena onda" },
  { id: "meh", label: "Meh", hint: "Falta un café" },
  { id: "falta", label: "Necesita charla", hint: "Hoy toca presencia" },
];

/** Eduardo no está: el 1:1 es CON los demás. */
Waffle.PEOPLE = [
  { id: "renzo", name: "Renzo Valle", role: "CEO · Business Intelligence", org: "waffles", color: "#84cc16", initials: "RV" },
  { id: "juan", name: "Juan Mujica", role: "Ingeniero de Proyectos", org: "waffles", color: "#38bdf8", initials: "JM" },
  { id: "violeta", name: "Violeta Pereyra", role: "Gestora de Arte", org: "waffles", color: "#f472b6", initials: "VP" },
  { id: "zahira", name: "Zahira Cotrina", role: "Diseñadora UX/UI", org: "waffles", color: "#fbbf24", initials: "ZC" },
  { id: "dizzy", name: "Dizzy Steeve", role: "Arquitectura & Música", org: "waffles", color: "#a78bfa", initials: "DS" },
  { id: "yose", name: "Yose", role: "Producción", org: "waffles", color: "#fb7185", initials: "YO" },
  { id: "p_angela", name: "Angela", role: "Personal · arte / juego", org: "personal", color: "#e8a0b8", initials: "AN" },
  { id: "p_maestra", name: "Maestra", role: "Personal · maestría", org: "personal", color: "#cbb59a", initials: "MA" },
];

Waffle.FACES = {
  greet: "./assets/waffle/motivate.png",
  focus: "./assets/waffle/motivate.png",
  block: "./assets/waffle/motivate.png",
  purr: "./assets/waffle/purr.png",
  sad: "./assets/waffle/comfort.png",
  done: "./assets/waffle/celebrate.png",
  mantra: "./assets/waffle/purr.png",
  learn: "./assets/waffle/idle.png",
  oto: "./assets/waffle/idle.png",
  crack: "./assets/waffle/celebrate.png",
  letter: "./assets/waffle/purr.png",
  prio: "./assets/waffle/motivate.png",
};

Waffle.LINES = {
  greet: [
    "Buenas, crack. Encuentra el foco. Una sola cosa.",
    "Waffle está listo. Tú también. El Edu de antes ya confía.",
    "Hola, causa. Paz mental primero. Después, un paso.",
  ],
  focus: [
    "Encuentra el foco. Una sola cosa. El resto espera.",
    "No empieces otra hasta terminar esta. Paz mental.",
    "Elige UNA. Waffle se queda aquí hasta que la cierres.",
    "Un paso, no diez. Eres un crack cuando cierras una.",
  ],
  block: [
    "Ey. Todavía no. Termina el foco primero.",
    "A Waffle le gusta la buena onda, no el caos. Una a la vez.",
    "Eso puede esperar. Cierra lo que ya empezaste, crack.",
  ],
  purr: [
    "Rrrrr. Buena onda. Sigue así.",
    "Ese ronroneo es para ti. Paz mental.",
    "Waffle ama los ronroneos. Tú también mereces este rato.",
    "uwu. El Edu del pasado te quiere mucho.",
  ],
  sad: [
    "A Waffle no le gusta verte triste. Ven. Un ronroneo.",
    "No estás solo. Ordenamos juntos, despacio. Paz mental primero.",
    "Waffle se acerca. La tristeza no se pelea: se acompaña. Luego, un paso.",
    "El Edu de antes te abraza. No tienes que poder con todo hoy.",
  ],
  done: [
    "Listo. Una cosa bien hecha. Eres un crack.",
    "Waffle está feliz. Dejaste esto más ordenado.",
    "Cerrado con buena onda. Elige el próximo. Solo uno.",
    "Eso. El Edu del pasado te quiere mucho. Siguiente foco.",
  ],
  mantra: [
    "Mi paz mental. Dejar todo más ordenado de como lo encontré.",
    "Paz mental primero. Después, un poco más de orden.",
    "Antes de dormir, carga el celular. Mañana te lo vas a agradecer.",
    "Oler rico. Es un cariño para ti y para quien se acerque.",
    "Pedir ayuda no es fallar. Waffle también se deja cargar.",
    "Cuidar amigos. Un mensaje, un uwu, presencia.",
    "Eres un crack. El Edu del pasado te quiere mucho.",
  ],
  learn: [
    "Anotado. Cuando sea el foco, lo aprendes de verdad. Una cosa.",
    "Waffle guardó eso. No lo toques hasta que sea el único foco.",
  ],
  oto: [
    "One to one es presencia, no checklist. uwu.",
    "Una persona. Un rato de verdad. Waffle se queda cerca.",
  ],
  crack: [
    "Eres un crack. En serio. Una bien hecha vale más que diez a medias.",
    "Crack. El Edu del pasado te quiere mucho. Sigue con una sola.",
    "Mira. Ya lo hiciste antes. Por eso te digo que eres un crack.",
  ],
  letter: [
    "El Edu del pasado te escribió. Ábrela cuando quieras, crack.",
    "Hay una carta para ti. Te quiere mucho. De verdad.",
  ],
  prio: [
    "Esto primero. El resto espera. Paz mental.",
    "Resolver ahora: una. Eres un crack cuando no te dispersas.",
  ],
};

Waffle.line = function line(kind) {
  const arr = Waffle.LINES[kind] || Waffle.LINES.greet;
  return arr[Math.floor(Math.random() * arr.length)];
};

Waffle.HAPPY_PCT = 70;

Waffle.catById = function catById(id) {
  return Waffle.CATS.find((c) => c.id === id) || { id, name: id, color: "#cbb59a", org: "life" };
};

Waffle.catName = function catName(id) {
  return Waffle.catById(id).name;
};

Waffle.minutesNow = function minutesNow() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

Waffle.taskDueMin = function taskDueMin(t) {
  if (t.hour == null) return null;
  return Number(t.hour) * 60 + Number(t.minute || 0);
};

Waffle.priorityScore = function priorityScore(task, extras) {
  const P = Waffle.PRIORITY;
  let score = P.cats[task.cat] || 10;
  if (task.vital) score += P.vital;
  if (task.type === "once") score += P.once;
  else if (task.type === "monthly") score += P.monthly;
  else score += P.daily;
  const due = Waffle.taskDueMin(task);
  if (due != null) {
    const now = extras && extras.nowMin != null ? extras.nowMin : Waffle.minutesNow();
    const diff = due - now;
    if (diff <= 0) score += P.timedOver;
    else if (diff <= 45) score += P.timedSoon;
    else score += 120;
  }
  if (extras && extras.oto) score += P.oto;
  if (extras && extras.isFocus) score += 2000;
  return score;
};

Waffle.whyLabel = function whyLabel(task, extras) {
  if (extras && extras.oto) return "1:1 hoy · presencia";
  if (task.vital) return "vital · ordenar primero";
  const due = Waffle.taskDueMin(task);
  if (due != null) {
    const now = extras && extras.nowMin != null ? extras.nowMin : Waffle.minutesNow();
    const hh = String(task.hour).padStart(2, "0");
    const mm = String(task.minute || 0).padStart(2, "0");
    if (now >= due) return "ya era a las " + hh + ":" + mm;
    if (due - now <= 45) return "en un rato · " + hh + ":" + mm;
    return hh + ":" + mm;
  }
  if (task.type === "once") return "pendiente · una vez";
  if (task.type === "monthly") return "vence este mes";
  return "hoy · " + Waffle.catName(task.cat);
};

Waffle.parseKey = function parseKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Date local a medianoche, o parsea YYYY-MM-DD. */
Waffle.asDate = function asDate(date) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return Waffle.parseKey(date);
  if (date && typeof date.getFullYear === "function") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Fecha local YYYY-MM-DD (no UTC). */
Waffle.dateKey = function dateKey(date) {
  const d = Waffle.asDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

Waffle.addDays = function addDays(date, n) {
  const d = Waffle.asDate(date);
  d.setDate(d.getDate() + n);
  return d;
};

Waffle.todayKey = function todayKey() {
  return Waffle.dateKey(new Date());
};

/**
 * ID semanal ISO-8601: 2026-W37
 * Semana empieza lunes. El jueves define el año de la semana.
 */
Waffle.isoWeekId = function isoWeekId(date) {
  const d = Waffle.asDate(date);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
};

Waffle.parseWeekId = function parseWeekId(weekId) {
  const m = String(weekId).match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), week: Number(m[2]) };
};

/** Lunes de esa semana ISO, como Date local. */
Waffle.weekStart = function weekStart(weekId) {
  const parsed = Waffle.parseWeekId(weekId);
  if (!parsed) return null;
  const { year, week } = parsed;
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const mondayWeek1 = new Date(year, 0, 4 - (day - 1));
  return Waffle.addDays(mondayWeek1, (week - 1) * 7);
};

Waffle.weekDates = function weekDates(weekId) {
  const start = Waffle.weekStart(weekId);
  if (!start) return [];
  return Array.from({ length: 7 }, (_, i) => Waffle.addDays(start, i));
};

Waffle.weekMeta = function weekMeta(weekId) {
  const dates = Waffle.weekDates(weekId);
  if (!dates.length) return null;
  const start = dates[0];
  const end = dates[6];
  const parsed = Waffle.parseWeekId(weekId);
  const fmt = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  const range = `${fmt(start)} – ${fmt(end)}`;
  return {
    id: weekId,
    year: parsed.year,
    week: parsed.week,
    startKey: Waffle.dateKey(start),
    endKey: Waffle.dateKey(end),
    dates: dates.map(Waffle.dateKey),
    label: `W${String(parsed.week).padStart(2, "0")}`,
    range,
    title: `${weekId} · ${range}`,
  };
};

Waffle.shiftWeek = function shiftWeek(weekId, delta) {
  const start = Waffle.weekStart(weekId);
  if (!start) return weekId;
  return Waffle.isoWeekId(Waffle.addDays(start, delta * 7));
};

Waffle.formatDayLong = function formatDayLong(key) {
  const d = Waffle.parseKey(key);
  return d.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
};

Waffle.formatDayShort = function formatDayShort(key) {
  const d = Waffle.parseKey(key);
  return d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" });
};

Waffle.weekdayLetter = function weekdayLetter(key) {
  const d = Waffle.parseKey(key);
  return ["D", "L", "M", "X", "J", "V", "S"][d.getDay()];
};
