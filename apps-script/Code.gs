/**
 * Waffle Daily — base de datos en el Excel de Waffles (control de tareas).
 *
 * 1. Abre el Spreadsheet de Waffles (id SPREADSHEET_ID).
 * 2. Extensiones → Apps Script → pega este archivo. Guarda.
 * 3. Ejecuta setup() una vez (autoriza).
 * 4. Implementar → Aplicación web → yo / Cualquiera → URL /exec.
 *
 * La app manda JSON como text/plain (sin preflight CORS).
 */
const TOKEN = ""; // opcional: misma clave que en la app
const SPREADSHEET_ID = "1fPzctVZUMSoXBelt0D6Iq7x7Tr6MQLuWJtFcoh8eZ6s";

const TABS = {
  Tareas: ["id", "sprintId", "cat", "org", "title", "note", "type", "scrum", "points", "hour", "minute"],
  Checks: ["date", "taskId", "weekId"],
  Foco: ["date", "taskId", "setAt"],
  Aprender: ["id", "title", "done", "created"],
  Personas: ["id", "name", "role", "org", "color"],
  OneToOne: ["personId", "lastAt", "nextAt", "cadenceDays", "vibe", "notes", "items"],
  OneToOneLog: ["id", "personId", "at", "vibe", "text"],
  DailyScrum: ["date", "weekId", "yesterday", "today", "blockers"],
  Semanas: ["weekId", "avg", "happyDays", "activeDays", "note"],
  Notas: ["date", "text"],
  Meta: ["key", "value"],
};

const CONTROL_HEADERS = [
  "creación de la tarea",
  "personas",
  "tarea",
  "detalle",
  "prioridad",
  "plazo",
  "bloqueos",
  "estatus",
];

const ESTATUS_HEADERS = [
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
];

const RESUMEN_HEADERS = [
  "tarea",
  "clasificación",
  "tipo",
  "organización",
  "área",
  "veces terminada",
  "días registrada",
  "última fecha",
  "id",
];

function ss_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sheet_(name, cols) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const header = sh.getRange(1, 1, 1, cols.length).getValues()[0];
  const empty = header.every((c) => c === "");
  if (empty || header[0] !== cols[0]) {
    sh.clear();
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function writeTab_(name, cols, rows) {
  const sh = sheet_(name, cols);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, cols.length).clearContent();
  if (!rows || !rows.length) return 0;
  const data = rows.map((r) => cols.map((c) => (r[c] == null ? "" : r[c])));
  sh.getRange(2, 1, data.length, cols.length).setValues(data);
  return data.length;
}

function controlSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName("control de tareas");
  if (!sh) {
    sh = ss.insertSheet("control de tareas");
    sh.getRange(1, 1, 1, CONTROL_HEADERS.length).setValues([CONTROL_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function controlKey_(detalle, title, createdAt) {
  const d = String(detalle || "");
  const m = d.match(/\[wd:([^\]:]+)(?::([^\]]+))?\]/);
  if (m) return m[2] ? m[1] + "|" + m[2] : m[1];
  return "";
}

/** Diario: una fila por día (se suma). Una vez: actualiza la misma carta. No borra el equipo. */
function writeControl_(rows) {
  const sh = controlSheet_();
  if (!rows || !rows.length) return 0;
  const last = sh.getLastRow();
  const existing = last > 1 ? sh.getRange(2, 1, last - 1, 8).getValues() : [];
  const byKey = {};
  existing.forEach((row, i) => {
    const k = controlKey_(row[3], row[2], row[0]);
    if (k) byKey[k] = i;
  });
  const updates = [];
  const toAppend = [];
  rows.forEach((r) => {
    const line = [
      r.createdAt || "",
      r.people || "",
      r.title || "",
      r.detail || "",
      r.priority || "",
      r.deadline || "",
      r.blockers || "",
      r.status || "",
    ];
    const k = controlKey_(r.detail, r.title, r.createdAt);
    if (k && byKey[k] != null) updates.push({ idx: byKey[k] + 2, line: line });
    else toAppend.push(line);
  });
  updates.forEach((u) => sh.getRange(u.idx, 1, 1, 8).setValues([u.line]));
  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, 8).setValues(toAppend);
  }
  return rows.length;
}

function mapEstatusRow_(r) {
  return {
    fecha: r.fecha || "",
    semana: r.semana || "",
    clasificación: r["clasificación"] || r.clasificacion || "",
    organización: r["organización"] || r.organizacion || "",
    área: r["área"] || r.area || "",
    tarea: r.tarea || "",
    tipo: r.tipo || "",
    estatus: r.estatus || "",
    detalle: r.detalle || "",
    personas: r.personas || "",
    hora: r.hora || "",
    id: r.id || "",
  };
}

/** Une por fecha+id. Los días viejos se quedan: las diarias se suman. */
function writeEstatusDia_(rows) {
  const incoming = (rows || []).map(mapEstatusRow_);
  const sh = sheet_("Estatus del día", ESTATUS_HEADERS);
  const last = sh.getLastRow();
  const existing = last > 1 ? sh.getRange(2, 1, last - 1, ESTATUS_HEADERS.length).getValues() : [];
  const data = existing.map((row) => row.slice());
  const index = {};
  data.forEach((row, i) => {
    const fecha = String(row[0] || "");
    const id = String(row[11] || "");
    if (fecha && id) index[fecha + "|" + id] = i;
  });
  incoming.forEach((r) => {
    const line = ESTATUS_HEADERS.map((c) => (r[c] == null ? "" : r[c]));
    const k = String(r.fecha || "") + "|" + String(r.id || "");
    if (k === "|") return;
    if (index[k] != null) data[index[k]] = line;
    else {
      index[k] = data.length;
      data.push(line);
    }
  });
  if (last > 1) sh.getRange(2, 1, last - 1, ESTATUS_HEADERS.length).clearContent();
  if (data.length) sh.getRange(2, 1, data.length, ESTATUS_HEADERS.length).setValues(data);
  writeResumenFrom_(data);
  return data.length;
}

function writeResumenFrom_(estatusData) {
  const byId = {};
  (estatusData || []).forEach((row) => {
    const id = String(row[11] || row[5] || "");
    if (!id) return;
    if (!byId[id]) {
      byId[id] = {
        tarea: row[5] || "",
        clasificación: row[2] || "",
        tipo: row[6] || "",
        organización: row[3] || "",
        área: row[4] || "",
        "veces terminada": 0,
        "días registrada": 0,
        "última fecha": "",
        id: id,
      };
    }
    const o = byId[id];
    o["días registrada"] += 1;
    if (String(row[7] || "") === "Tarea terminada") o["veces terminada"] += 1;
    const fecha = String(row[0] || "");
    if (fecha > String(o["última fecha"] || "")) o["última fecha"] = fecha;
  });
  const list = Object.keys(byId)
    .map((k) => byId[k])
    .sort((a, b) => String(a.tarea).localeCompare(String(b.tarea)));
  return writeTab_("Resumen", RESUMEN_HEADERS, list);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function parseBody_(e) {
  if (!e || !e.postData) return {};
  const raw = e.postData.contents || "";
  try {
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function rows_(name, cols) {
  const ss = ss_();
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, cols.length).getValues();
  return values
    .map((row) => {
      const o = {};
      cols.forEach((c, i) => {
        o[c] = row[i];
      });
      return o;
    })
    .filter((o) => o[cols[0]] !== "" && o[cols[0]] != null);
}

function meta_() {
  const rows = rows_("Meta", TABS.Meta);
  const out = {};
  rows.forEach((r) => {
    out[r.key] = r.value;
  });
  return out;
}

function dump_(body) {
  if (TOKEN && body.token !== TOKEN) {
    return { ok: false, error: "token" };
  }
  const meta = meta_();
  return {
    ok: true,
    app: "waffle-daily",
    action: "pull",
    at: meta.at || "",
    weekId: meta.weekId || "",
    streak: Number(meta.streak) || 0,
    purrs: Number(meta.purrs) || 0,
    tasks: rows_("Tareas", TABS.Tareas),
    checks: rows_("Checks", TABS.Checks),
    foco: rows_("Foco", TABS.Foco),
    learn: rows_("Aprender", TABS.Aprender),
    people: rows_("Personas", TABS.Personas),
    oneToOne: rows_("OneToOne", TABS.OneToOne),
    oneToOneLog: rows_("OneToOneLog", TABS.OneToOneLog),
    dailyScrum: rows_("DailyScrum", TABS.DailyScrum),
    semanas: rows_("Semanas", TABS.Semanas),
    notes: rows_("Notas", TABS.Notas),
  };
}

function apply_(body) {
  if (TOKEN && body.token !== TOKEN) {
    return { ok: false, error: "token" };
  }
  const counts = {};
  counts.Tareas = writeTab_("Tareas", TABS.Tareas, body.tasks || []);
  counts.Checks = writeTab_("Checks", TABS.Checks, body.checks || []);
  counts.Foco = writeTab_("Foco", TABS.Foco, body.foco || []);
  counts.Aprender = writeTab_("Aprender", TABS.Aprender, body.learn || []);
  counts.Personas = writeTab_("Personas", TABS.Personas, body.people || []);
  counts.OneToOne = writeTab_("OneToOne", TABS.OneToOne, body.oneToOne || []);
  counts.OneToOneLog = writeTab_("OneToOneLog", TABS.OneToOneLog, body.oneToOneLog || []);
  counts.DailyScrum = writeTab_("DailyScrum", TABS.DailyScrum, body.dailyScrum || []);
  counts.Semanas = writeTab_("Semanas", TABS.Semanas, body.semanas || []);
  counts.Notas = writeTab_("Notas", TABS.Notas, body.notes || []);
  counts.Control = writeControl_(body.controlWaffles || []);
  counts.EstatusDia = writeEstatusDia_(body.estatusDia || []);
  writeTab_("Meta", TABS.Meta, [
    { key: "app", value: "waffle-daily" },
    { key: "at", value: body.at || new Date().toISOString() },
    { key: "weekId", value: body.weekId || "" },
    { key: "streak", value: body.streak || 0 },
    { key: "purrs", value: body.purrs || 0 },
  ]);
  return { ok: true, wrote: counts, at: new Date().toISOString() };
}

function doPost(e) {
  const body = parseBody_(e);
  if (!body || body.app !== "waffle-daily") {
    return json_({ ok: false, error: "payload" });
  }
  if (body.action === "pull" || body.action === "ping") {
    const dump = dump_(body);
    if (body.action === "ping") {
      return json_({ ok: dump.ok !== false, app: "waffle-daily", ping: true, at: dump.at || "" });
    }
    return json_(dump);
  }
  return json_(apply_(body));
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action === "pull") {
    return json_(dump_({ token: (e.parameter && e.parameter.token) || "" }));
  }
  return json_({ ok: true, app: "waffle-daily", hint: "POST JSON text/plain. action=pull para bajar." });
}

/** Primera corrida: crea las pestañas vacías. */
function setup() {
  Object.keys(TABS).forEach((name) => sheet_(name, TABS[name]));
  controlSheet_();
  sheet_("Estatus del día", ESTATUS_HEADERS);
  sheet_("Resumen", RESUMEN_HEADERS);
}
