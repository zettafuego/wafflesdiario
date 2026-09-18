/**
 * Waffle Daily → Google Sheets vía Apps Script.
 * POST text/plain evita preflight CORS. Offline: se reintenta al volver la red.
 */
window.WaffleSync = (() => {
  let timer = null;

  function url() {
    return (window.WaffleStore.get().settings?.scriptUrl || "").trim();
  }

  function snapshot() {
    const s = window.WaffleStore.get();
    const weekId = window.Waffle.isoWeekId(new Date());
    return {
      app: "waffle-daily",
      token: s.settings?.token || "",
      at: new Date().toISOString(),
      weekId,
      streak: s.streak || 0,
      purrs: s.purrs || 0,
      tasks: s.tasks.map((t) => ({
        id: t.id,
        sprintId: t.sprintId || "",
        cat: t.cat,
        org: window.Waffle.catById(t.cat).org,
        title: t.title,
        note: t.note || "",
        type: t.type,
        scrum: t.scrum || "",
        points: t.points || 1,
        hour: t.hour ?? "",
        minute: t.minute ?? "",
      })),
      checks: Object.entries(s.days || {}).flatMap(([date, map]) =>
        Object.keys(map)
          .filter((id) => map[id])
          .map((taskId) => ({ date, taskId, weekId: window.Waffle.isoWeekId(window.Waffle.parseKey(date)) }))
      ),
      foco: Object.entries(s.focusByDay || {}).map(([date, f]) => ({
        date,
        taskId: f.taskId,
        setAt: f.setAt || "",
      })),
      learn: (s.learn || []).map((x) => ({ id: x.id, title: x.title, done: !!x.done, created: x.created || "" })),
      people: (s.people || []).map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role || "",
        org: p.org,
        color: p.color || "",
      })),
      oneToOne: Object.entries(s.oneToOne || {}).map(([personId, o]) => ({
        personId,
        lastAt: o.lastAt || "",
        nextAt: o.nextAt || "",
        cadenceDays: o.cadenceDays || 7,
        vibe: o.vibe || "",
        notes: o.notes || "",
        items: JSON.stringify(o.items || []),
      })),
      oneToOneLog: Object.entries(s.oneToOne || {}).flatMap(([personId, o]) =>
        (o.log || []).map((l) => ({
          id: l.id,
          personId,
          at: l.at,
          text: l.text || "",
          vibe: l.vibe || "",
        }))
      ),
      dailyScrum: Object.entries(s.dailyScrum || {}).map(([date, d]) => ({
        date,
        weekId: window.Waffle.isoWeekId(window.Waffle.parseKey(date)),
        yesterday: d.yesterday || "",
        today: d.today || "",
        blockers: d.blockers || "",
      })),
      semanas: window.WaffleStore.knownWeekIds().map((id) => {
        const r = window.WaffleStore.weekReport(id);
        return { weekId: id, avg: r.avg, happyDays: r.happyDays, activeDays: r.activeDays, note: r.note || "" };
      }),
      notes: Object.entries(s.notes || {}).map(([date, text]) => ({ date, text })),
      controlWaffles: wafflesControlRows(),
      estatusDia: estatusDiaRows(),
    };
  }

  function hourLabel(t) {
    if (t.hour == null || t.hour === "") return "";
    const h = String(t.hour).padStart(2, "0");
    const m = String(t.minute || 0).padStart(2, "0");
    return h + ":" + m;
  }

  function datesToSave() {
    const s = window.WaffleStore.get();
    const set = new Set([window.Waffle.todayKey()]);
    Object.keys(s.days || {}).forEach((d) => set.add(d));
    Object.keys(s.dailyScrum || {}).forEach((d) => set.add(d));
    return [...set].sort();
  }

  /** Log diario clasificado: fecha · área · estatus. Terminado = Tarea terminada. */
  function estatusDiaRows() {
    const W = window.Waffle;
    const S = window.WaffleStore;
    const rows = [];
    datesToSave().forEach((date) => {
      const week = W.isoWeekId(W.parseKey(date));
      S.poolForDay(date).forEach((t) => {
        if (t.id === W.PURR_TASK_ID) return;
        const cat = W.catById(t.cat);
        const done = S.isDone(date, t.id);
        const focus = S.getFocus(date);
        const scrum = done ? "done" : focus && focus.taskId === t.id ? "doing" : t.scrum || "todo";
        rows.push({
          fecha: date,
          semana: week,
          clasificación: W.clasificacion(t),
          organización: W.orgName(cat.org),
          área: W.catName(t.cat),
          tarea: t.title,
          tipo: W.tipoLabel(t.type),
          estatus: W.estatusDelDia(done, scrum),
          detalle: t.note || "",
          personas: W.WAFFLES_SHEET.peopleByCat[t.cat] || "Eduardo Sanchez",
          hora: hourLabel(t),
          id: t.id,
        });
      });
    });
    return rows;
  }

  function resumenRows() {
    const map = {};
    estatusDiaRows().forEach((r) => {
      const id = r.id || r.tarea;
      if (!map[id]) {
        map[id] = {
          tarea: r.tarea,
          clasificación: r.clasificación || r["clasificación"],
          tipo: r.tipo,
          organización: r.organización || r["organización"],
          área: r.área || r["área"],
          "veces terminada": 0,
          "días registrada": 0,
          "última fecha": "",
          id: id,
        };
      }
      const o = map[id];
      o["días registrada"] += 1;
      if (r.estatus === "Tarea terminada") o["veces terminada"] += 1;
      if (String(r.fecha || "") > String(o["última fecha"] || "")) o["última fecha"] = r.fecha;
    });
    return Object.keys(map)
      .map((k) => map[k])
      .sort((a, b) => String(a.tarea).localeCompare(String(b.tarea)));
  }

  /** Waffles: las diarias suman una fila por día. Las de una vez actualizan la misma carta. */
  function wafflesControlRows() {
    const W = window.Waffle;
    const S = window.WaffleStore;
    const s = S.get();
    const rows = [];
    datesToSave().forEach((date) => {
      const week = W.isoWeekId(W.parseKey(date));
      const meta = W.weekMeta(week);
      const ds = s.dailyScrum[date] || {};
      const blockers = ds.blockers || "";
      const focus = S.getFocus(date);
      S.poolForDay(date, "waffles").forEach((t) => {
        const done = S.isDone(date, t.id);
        const scrum = done ? "done" : focus && focus.taskId === t.id ? "doing" : t.scrum || "todo";
        const estatus = W.estatusDelDia(done, scrum);
        const classif = W.clasificacion(t);
        const daily = t.type === "daily";
        const marker = daily ? "[wd:" + t.id + ":" + date + "]" : "[wd:" + t.id + "]";
        rows.push({
          taskId: t.id,
          createdAt: date,
          people: W.WAFFLES_SHEET.peopleByCat[t.cat] || "Eduardo Sanchez",
          title: t.title,
          detail: [W.catName(t.cat), classif, W.tipoLabel(t.type), t.note, daily ? "diario " + date : "sprint " + week, marker]
            .filter(Boolean)
            .join(" · "),
          priority: t.vital || t.id === "b4" || scrum === "doing" ? "alta" : daily ? "media" : "alta",
          deadline: daily ? date : meta.endKey,
          blockers: estatus === "Tarea terminada" ? "" : blockers,
          status: estatus,
        });
      });
    });
    return rows;
  }

  function controlCsv() {
    const cols = window.Waffle.WAFFLES_SHEET.cols;
    const keys = ["createdAt", "people", "title", "detail", "priority", "deadline", "blockers", "status"];
    const rows = wafflesControlRows();
    const head = cols.join(",");
    const body = rows
      .map((r) => keys.map((k) => csvEscape(r[k]).replace(/;/g, ",")).join(","))
      .join("\n");
    return "\uFEFF" + head + "\n" + body;
  }

  function controlTsv() {
    const cols = window.Waffle.WAFFLES_SHEET.cols;
    const keys = ["createdAt", "people", "title", "detail", "priority", "deadline", "blockers", "status"];
    const rows = wafflesControlRows();
    return cols.join("\t") + "\n" + rows.map((r) => keys.map((k) => String(r[k] || "").replace(/\t/g, " ")).join("\t")).join("\n");
  }

  function downloadWafflesExcel() {
    const blob = new Blob([controlCsv()], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `waffles-control-${window.Waffle.todayKey()}.csv`;
    a.click();
  }

  function downloadEstatusDia() {
    const cols = window.Waffle.ESTATUS_DIA.cols;
    const csv = toCsv(estatusDiaRows(), cols);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `estatus-del-dia-${window.Waffle.todayKey()}.csv`;
    a.click();
  }

  async function copyWafflesExcel() {
    const tsv = controlTsv();
    try {
      await navigator.clipboard.writeText(tsv);
      return { ok: true, n: wafflesControlRows().length };
    } catch (_) {
      return { ok: false, n: wafflesControlRows().length };
    }
  }

  async function fillWafflesExcel() {
    downloadEstatusDia();
    downloadWafflesExcel();
    const copied = await copyWafflesExcel();
    const sheet = window.Waffle.WAFFLES_SHEET.url;
    if (sheet) window.open(sheet, "_blank");
    let up = copied;
    if (url()) up = await push();
    return { ok: !!(up && up.ok), n: estatusDiaRows().length, error: up && up.error };
  }

  async function post(payload) {
    const endpoint = url();
    if (!endpoint) return { ok: false, error: "sin-url" };
    if (!navigator.onLine) return { ok: false, error: "offline" };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    let body = null;
    try {
      body = await res.json();
    } catch (_) {}
    const ok = !!(res.ok || (body && body.ok) || res.type === "opaque");
    return { ok, body, error: body && body.error };
  }

  function token() {
    return window.WaffleStore.get().settings?.token || "";
  }

  async function ping() {
    try {
      const res = await post({ app: "waffle-daily", token: token(), action: "ping" });
      window.WaffleStore.markSynced(!!res.ok);
      return res;
    } catch (err) {
      window.WaffleStore.markSynced(false);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  async function pull() {
    try {
      const res = await post({ app: "waffle-daily", token: token(), action: "pull" });
      if (!res.ok || !res.body) {
        window.WaffleStore.markSynced(false);
        return { ok: false, error: res.error || "pull" };
      }
      const merged = window.WaffleStore.mergeRemote(res.body);
      window.WaffleStore.markSynced(true);
      return { ok: true, merged, body: res.body };
    } catch (err) {
      window.WaffleStore.markSynced(false);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  async function push() {
    try {
      const res = await post(snapshot());
      window.WaffleStore.markSynced(!!res.ok);
      return res;
    } catch (err) {
      window.WaffleStore.markSynced(false);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  /** Baja, mezcla, sube. Eso es la base: celu y PC ven lo mismo. */
  async function syncAll() {
    if (!url()) return { ok: false, error: "sin-url" };
    if (!navigator.onLine) return { ok: false, error: "offline" };
    const down = await pull();
    const up = await push();
    return { ok: !!up.ok, down, up };
  }

  function schedule() {
    if (!url()) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      push();
    }, 500);
  }

  function csvEscape(v) {
    const s = String(v == null ? "" : v);
    if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(rows, cols) {
    const head = cols.join(";");
    const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(";")).join("\n");
    return "\uFEFF" + head + "\n" + body;
  }

  function downloadExcel() {
    const snap = snapshot();
    const chunks = [
      "=== TAREAS ===",
      toCsv(snap.tasks, ["id", "sprintId", "cat", "org", "title", "note", "type", "scrum", "points"]),
      "",
      "=== CHECKS ===",
      toCsv(snap.checks, ["date", "taskId", "weekId"]),
      "",
      "=== 1:1 ===",
      toCsv(snap.oneToOne, ["personId", "lastAt", "nextAt", "cadenceDays", "vibe", "notes"]),
      "",
      "=== 1:1 LOG ===",
      toCsv(snap.oneToOneLog, ["id", "personId", "at", "vibe", "text"]),
      "",
      "=== DAILY SCRUM ===",
      toCsv(snap.dailyScrum, ["date", "weekId", "yesterday", "today", "blockers"]),
      "",
      "=== ESTATUS DEL DIA ===",
      toCsv(snap.estatusDia, window.Waffle.ESTATUS_DIA.cols),
      "",
      "=== RESUMEN ===",
      toCsv(resumenRows(), window.Waffle.RESUMEN.cols),
      "",
      "=== SEMANAS ===",
      toCsv(snap.semanas, ["weekId", "avg", "happyDays", "activeDays", "note"]),
      "",
      "=== APRENDER ===",
      toCsv(snap.learn, ["id", "title", "done", "created"]),
    ];
    const blob = new Blob([chunks.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `waffle-scrum-${window.Waffle.todayKey()}.csv`;
    a.click();
  }

  window.addEventListener("online", () => {
    if (url()) syncAll();
  });

  return {
    snapshot,
    ping,
    pull,
    push,
    syncAll,
    schedule,
    downloadExcel,
    downloadWafflesExcel,
    downloadEstatusDia,
    copyWafflesExcel,
    fillWafflesExcel,
    wafflesControlRows,
    estatusDiaRows,
    url,
  };
})();
