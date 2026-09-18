/**
 * Waffle Daily — persistencia local (online y offline).
 * Fuente de verdad: tareas + checks por día. Las semanas se calculan.
 */
window.WaffleStore = (() => {
  const KEY = "waffle-daily-v2";
  const LEGACY = "waffle-checklist-v1";

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function emptyState() {
    return {
      version: 2,
      tasks: clone(Waffle.DEFAULTS),
      days: {},
      notes: {},
      weekNotes: {},
      focusByDay: {},
      learn: [],
      moodByDay: {},
      purrs: 0,
      people: clone(Waffle.PEOPLE),
      oneToOne: {},
      dailyScrum: {},
      settings: { scriptUrl: Waffle.SCRIPT_URL || "", token: "", alerts: false, letterWins: 0 },
      alertLog: {},
      syncAt: null,
      syncOk: null,
      streak: 0,
      streakDate: null,
      lastActive: null,
    };
  }

  function hydrate(s) {
    s.tasks = mergeSeedTasks(Array.isArray(s.tasks) ? s.tasks : clone(Waffle.DEFAULTS));
    s.days = s.days || {};
    s.notes = s.notes || {};
    s.weekNotes = s.weekNotes || {};
    s.focusByDay = s.focusByDay || {};
    s.learn = Array.isArray(s.learn) ? s.learn : [];
    s.moodByDay = s.moodByDay || {};
    s.purrs = s.purrs || 0;
    s.people = mergePeople(s.people);
    s.oneToOne = s.oneToOne || {};
    s.dailyScrum = s.dailyScrum || {};
    s.settings = Object.assign({ scriptUrl: Waffle.SCRIPT_URL || "", token: "", alerts: false, letterWins: 0 }, s.settings || {});
    if (Waffle.SCRIPT_URL) s.settings.scriptUrl = Waffle.SCRIPT_URL;
    s.alertLog = s.alertLog || {};
    s.tasks.forEach(ensureScrum);
    rollDailyScrum(s);
    return s;
  }

  function rollDailyScrum(s) {
    const today = Waffle.todayKey();
    const week = Waffle.isoWeekId(new Date());
    if (s.scrumRollDate === today) return;
    const focusId = s.focusByDay?.[today]?.taskId;
    (s.tasks || []).forEach((t) => {
      if (t.type !== "daily") return;
      if (s.days?.[today]?.[t.id]) t.scrum = "done";
      else if (focusId === t.id) t.scrum = "doing";
      else t.scrum = "todo";
      t.sprintId = week;
    });
    s.scrumRollDate = today;
  }

  function mergePeople(existing) {
    const list = Array.isArray(existing) ? existing.slice() : [];
    const byId = new Map(list.map((p) => [p.id, p]));
    for (const def of Waffle.PEOPLE) {
      if (!byId.has(def.id)) {
        list.push(clone(def));
        byId.set(def.id, def);
      }
    }
    return list;
  }

  function ensureScrum(t) {
    if (!t.scrum) t.scrum = t.type === "once" || t.type === "monthly" ? "backlog" : "todo";
    if (t.sprintId == null) t.sprintId = t.type === "daily" ? Waffle.isoWeekId(new Date()) : "";
    if (!t.points) t.points = t.type === "daily" ? 1 : 2;
    return t;
  }

  function mergeSeedTasks(tasks) {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const def of Waffle.DEFAULTS) {
      if (!byId.has(def.id)) {
        tasks.push(clone(def));
        byId.set(def.id, def);
      } else {
        const t = byId.get(def.id);
        t.cat = def.cat;
        t.title = def.title;
        t.note = def.note;
        t.type = def.type;
        if (def.monthDay) t.monthDay = def.monthDay;
        if (def.hour != null) t.hour = def.hour;
        if (def.minute != null) t.minute = def.minute;
        if (def.vital) t.vital = true;
      }
    }
    return tasks;
  }

  function migrateLegacy(raw) {
    try {
      const old = JSON.parse(raw);
      const state = emptyState();
      const oldTasks = Array.isArray(old.tasks) ? old.tasks : [];
      const ids = new Set(oldTasks.map((t) => t.id));
      state.tasks = mergeSeedTasks(oldTasks.map((t) => ({ ...t })));
      // keep user-created tasks that aren't in seed
      for (const t of oldTasks) {
        if (!ids.has(t.id)) continue;
      }
      state.days = old.days && typeof old.days === "object" ? old.days : {};
      state.streak = old.streak || 0;
      state.streakDate = old.streakDate || null;
      state.lastActive = old.lastActive || null;
      return state;
    } catch (_) {
      return emptyState();
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = hydrate(JSON.parse(raw));
        save(s);
        return s;
      }
      const legacy = localStorage.getItem(LEGACY);
      if (legacy) {
        const migrated = migrateLegacy(legacy);
        save(migrated);
        return migrated;
      }
    } catch (_) {}
    const fresh = emptyState();
    save(fresh);
    return fresh;
  }

  function save(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  let state = load();

  function get() {
    return state;
  }

  function persist() {
    save(state);
    if (window.WaffleSync && typeof window.WaffleSync.schedule === "function") window.WaffleSync.schedule();
  }

  function isDone(dateKey, taskId) {
    return !!state.days[dateKey]?.[taskId];
  }

  function completedOnceBefore(taskId, dateKey) {
    return Object.entries(state.days).some(([day, map]) => day < dateKey && map[taskId]);
  }

  function isOnceSettled(task, dateKey) {
    return task.type === "once" && completedOnceBefore(task.id, dateKey) && !isDone(dateKey, task.id);
  }

  function completedThisMonth(taskId, dateKey) {
    const prefix = String(dateKey).slice(0, 7);
    return Object.entries(state.days).some(([day, map]) => day.startsWith(prefix) && day !== dateKey && map[taskId]);
  }

  function isMonthlyHidden(task, dateKey) {
    if (task.type !== "monthly") return false;
    const d = Waffle.parseKey(dateKey);
    const due = task.monthDay || 15;
    if (d.getDate() < due) return true;
    if (completedThisMonth(task.id, dateKey) && !isDone(dateKey, task.id)) return true;
    return false;
  }

  function poolForDay(dateKey, catFilter) {
    return state.tasks.filter((t) => {
      if (catFilter && catFilter !== "all") {
        if (catFilter === "waffles") {
          if (!Waffle.isWafflesFamily(t.cat)) return false;
        } else if (t.cat !== catFilter) return false;
      }
      if (isOnceSettled(t, dateKey)) return false;
      if (isMonthlyHidden(t, dateKey)) return false;
      return true;
    });
  }

  function dayProgress(dateKey, catFilter) {
    const pool = poolForDay(dateKey, catFilter);
    const done = pool.filter((t) => isDone(dateKey, t.id)).length;
    const total = pool.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct, happy: pct >= Waffle.HAPPY_PCT };
  }

  function areaProgress(dateKey, catId) {
    return dayProgress(dateKey, catId);
  }

  function wafflesProgress(dateKey) {
    return dayProgress(dateKey, "waffles");
  }

  function taskById(id) {
    return state.tasks.find((t) => t.id === id) || null;
  }

  function getFocus(dateKey) {
    const f = state.focusByDay[dateKey];
    if (!f || !f.taskId) return null;
    const task = taskById(f.taskId);
    if (!task) return null;
    return { ...f, task };
  }

  function setFocus(dateKey, taskId) {
    if (taskId === Waffle.FOCUS_TASK_ID) {
      return { ok: false, reason: "pick-focus" };
    }
    const task = taskById(taskId);
    if (!task) return { ok: false, reason: "missing" };
    if (isDone(dateKey, taskId)) return { ok: false, reason: "done" };
    if (isOnceSettled(task, dateKey)) return { ok: false, reason: "settled" };
    state.focusByDay[dateKey] = { taskId, setAt: Date.now() };
    if (!state.days[dateKey]) state.days[dateKey] = {};
    state.days[dateKey][Waffle.FOCUS_TASK_ID] = true;
    state.tasks.forEach((x) => {
      if (x.scrum === "doing" && x.id !== taskId) x.scrum = "todo";
    });
    task.scrum = "doing";
    task.sprintId = Waffle.isoWeekId(Waffle.parseKey(dateKey));
    persist();
    return { ok: true, task };
  }

  function clearFocus(dateKey) {
    delete state.focusByDay[dateKey];
    persist();
  }

  function bumpStreak(dateKey) {
    const today = Waffle.todayKey();
    if (dateKey !== today) return;
    state.lastActive = today;
    const { pct } = dayProgress(today);
    if (pct >= Waffle.HAPPY_PCT) {
      const yk = Waffle.dateKey(Waffle.addDays(new Date(), -1));
      if (state.streakDate !== today) {
        state.streak = state.streakDate === yk ? (state.streak || 0) + 1 : Math.max(1, state.streak || 1);
        state.streakDate = today;
      }
    }
  }

  function markLearnDone(taskId) {
    const item = state.learn.find((x) => x.id === taskId);
    if (item) item.done = true;
  }

  /** Una a la vez: solo se puede completar el foco (salvo desmarcar o ronroneo). */
  function toggle(dateKey, taskId) {
    if (!state.days[dateKey]) state.days[dateKey] = {};

    if (state.days[dateKey][taskId]) {
      delete state.days[dateKey][taskId];
      persist();
      return { ok: true, unchecked: true };
    }

    if (taskId === Waffle.FOCUS_TASK_ID) {
      return { ok: false, reason: "pick-focus" };
    }

    const isPurr = taskId === Waffle.PURR_TASK_ID;
    const focus = getFocus(dateKey);

    if (!isPurr) {
      if (!focus) return { ok: false, reason: "no-focus" };
      if (focus.taskId !== taskId) {
        return { ok: false, reason: "focus", focusId: focus.taskId, focusTitle: focus.task.title };
      }
    }

    state.days[dateKey][taskId] = true;
    markLearnDone(taskId);
    const t = taskById(taskId);
    if (t) t.scrum = "done";
    let completedFocus = false;
    if (focus && focus.taskId === taskId) {
      delete state.focusByDay[dateKey];
      completedFocus = true;
    }
    bumpStreak(dateKey);
    persist();
    return { ok: true, completedFocus, purr: isPurr };
  }

  function purr(dateKey) {
    state.purrs = (state.purrs || 0) + 1;
    if (!state.days[dateKey]) state.days[dateKey] = {};
    state.days[dateKey][Waffle.PURR_TASK_ID] = true;
    bumpStreak(dateKey);
    persist();
    return state.purrs;
  }

  function setMood(dateKey, mood) {
    state.moodByDay[dateKey] = mood;
    persist();
  }

  function addLearn(title) {
    const clean = String(title || "").trim();
    if (!clean) return { ok: false, reason: "empty" };
    const task = addTask({
      title: clean,
      cat: "aprender",
      type: "once",
      note: "Objeto para aprender",
    });
    state.learn.unshift({ id: task.id, title: clean, created: Date.now(), done: false });
    persist();
    return { ok: true, task };
  }

  function personById(id) {
    return (state.people || []).find((p) => p.id === id) || Waffle.PEOPLE.find((p) => p.id === id) || null;
  }

  function ensureOto(personId) {
    if (!state.oneToOne[personId]) {
      state.oneToOne[personId] = {
        lastAt: "",
        nextAt: "",
        cadenceDays: 7,
        vibe: "",
        notes: "",
        items: [],
        log: [],
      };
    }
    return state.oneToOne[personId];
  }

  function dueOneToOnes(dateKey) {
    return (state.people || []).filter((p) => {
      const o = state.oneToOne[p.id];
      if (!o || !o.nextAt) return false;
      return o.nextAt <= dateKey;
    });
  }

  function setOto(personId, patch) {
    const o = ensureOto(personId);
    Object.assign(o, patch);
    persist();
    return o;
  }

  function logTalk(personId, text, vibe) {
    const o = ensureOto(personId);
    const today = Waffle.todayKey();
    o.log.unshift({ id: "log_" + Date.now(), at: today, text: String(text || "").trim(), vibe: vibe || o.vibe });
    o.log = o.log.slice(0, 40);
    o.lastAt = today;
    if (vibe) o.vibe = vibe;
    const cad = Number(o.cadenceDays) || 7;
    o.nextAt = Waffle.dateKey(Waffle.addDays(today, cad));
    persist();
    return o;
  }

  function addOtoItem(personId, title) {
    const o = ensureOto(personId);
    const item = { id: "oi_" + Date.now(), title: String(title).trim(), status: "todo" };
    o.items.unshift(item);
    persist();
    return item;
  }

  function toggleOtoItem(personId, itemId) {
    const o = ensureOto(personId);
    const it = o.items.find((x) => x.id === itemId);
    if (!it) return;
    it.status = it.status === "done" ? "todo" : "done";
    persist();
  }

  function addPerson({ name, org, role }) {
    const id = "p_" + Date.now();
    const initials = String(name)
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const person = {
      id,
      name: String(name).trim(),
      role: (role || "Personal").trim(),
      org: org === "waffles" ? "waffles" : "personal",
      color: org === "waffles" ? "#e8b86a" : "#e8a0b8",
      initials: initials || "??",
    };
    state.people.push(person);
    ensureOto(id);
    persist();
    return person;
  }

  function setDailyScrum(dateKey, patch) {
    state.dailyScrum[dateKey] = Object.assign(
      { yesterday: "", today: "", blockers: "" },
      state.dailyScrum[dateKey] || {},
      patch
    );
    persist();
    return state.dailyScrum[dateKey];
  }

  function yesterdayDoneTitles(dateKey) {
    const y = Waffle.dateKey(Waffle.addDays(dateKey, -1));
    const map = state.days[y] || {};
    return state.tasks.filter((t) => map[t.id]).map((t) => t.title);
  }

  function moveScrum(taskId, col, dateKey) {
    const t = taskById(taskId);
    if (!t) return { ok: false };
    const day = dateKey || Waffle.todayKey();
    if (col === "doing") {
      const res = setFocus(day, taskId);
      if (!res.ok) return res;
      t.scrum = "doing";
      t.sprintId = Waffle.isoWeekId(Waffle.parseKey(day));
      persist();
      return { ok: true };
    }
    if (col === "done") {
      if (!isDone(day, taskId)) {
        const res = toggle(day, taskId);
        if (!res.ok) return res;
      }
      t.scrum = "done";
      persist();
      return { ok: true };
    }
    if (state.focusByDay[day]?.taskId === taskId) delete state.focusByDay[day];
    t.scrum = col;
    if (col === "todo" || col === "review") t.sprintId = Waffle.isoWeekId(Waffle.parseKey(day));
    if (col === "backlog") t.sprintId = "";
    persist();
    return { ok: true };
  }

  function board(weekId, dateKey, catFilter) {
    const day = dateKey || Waffle.todayKey();
    const week = weekId || Waffle.isoWeekId(Waffle.parseKey(day));
    const cols = {};
    Waffle.SCRUM.forEach((c) => {
      cols[c.id] = [];
    });
    const focus = getFocus(day);
    poolForDay(day, catFilter || "all").forEach((t) => {
      ensureScrum(t);
      let col = t.scrum || "todo";
      if (isDone(day, t.id)) col = "done";
      else if (focus && focus.taskId === t.id) col = "doing";
      else if (t.type === "once" && t.sprintId && t.sprintId !== week && col !== "review" && col !== "doing") {
        col = "backlog";
      }
      if (!cols[col]) col = "todo";
      cols[col].push(t);
    });
    Waffle.SCRUM.forEach((c) => {
      cols[c.id].sort((a, b) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0));
    });
    return cols;
  }

  function setSettings(patch) {
    Object.assign(state.settings, patch);
    persist();
  }

  function markSynced(ok) {
    state.syncAt = new Date().toISOString();
    state.syncOk = !!ok;
    save(state);
  }

  function resetDay(dateKey) {
    state.days[dateKey] = {};
    delete state.focusByDay[dateKey];
    persist();
  }

  function addTask({ title, cat, type, note, hour, minute, monthDay }) {
    const kind = type === "once" || type === "monthly" ? type : "daily";
    const task = ensureScrum({
      id: "u" + Date.now(),
      title: String(title).trim(),
      cat,
      type: kind,
      note: (note || "").trim(),
    });
    if (kind === "monthly") task.monthDay = Number(monthDay) || 15;
    if (Number.isInteger(hour)) task.hour = hour;
    if (Number.isInteger(minute)) task.minute = minute;
    const hm = (task.note || "").match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (hm && task.hour == null) {
      task.hour = Number(hm[1]);
      task.minute = Number(hm[2]);
    }
    state.tasks.push(task);
    persist();
    return task;
  }

  function removeTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    state.learn = (state.learn || []).filter((x) => x.id !== id);
    const today = Waffle.todayKey();
    if (state.focusByDay[today]?.taskId === id) delete state.focusByDay[today];
    persist();
  }

  function setNote(dateKey, text) {
    if (!text) delete state.notes[dateKey];
    else state.notes[dateKey] = text;
    persist();
  }

  function setWeekNote(weekId, text) {
    if (!text) delete state.weekNotes[weekId];
    else state.weekNotes[weekId] = text;
    persist();
  }

  function elapsedDays(weekId) {
    const meta = Waffle.weekMeta(weekId);
    const today = Waffle.todayKey();
    return meta.dates.filter((k) => k <= today);
  }

  function weekReport(weekId) {
    const meta = Waffle.weekMeta(weekId);
    const days = elapsedDays(weekId);
    const daily = days.map((k) => ({ key: k, ...dayProgress(k) }));
    const allDays = meta.dates.map((k) => ({
      key: k,
      future: k > Waffle.todayKey(),
      ...dayProgress(k),
    }));
    const avg = days.length ? Math.round(daily.reduce((s, d) => s + d.pct, 0) / days.length) : 0;
    const happyDays = daily.filter((d) => d.happy).length;
    const activeDays = daily.filter((d) => d.done > 0).length;

    const areas = {};
    for (const cat of Waffle.CATS) {
      const rows = days.map((k) => areaProgress(k, cat.id));
      const pct = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
      areas[cat.id] = { pct, happy: rows.filter((r) => r.happy).length, days: rows.length };
    }
    const waffleRows = days.map((k) => wafflesProgress(k));
    const wafflesPct = waffleRows.length
      ? Math.round(waffleRows.reduce((s, r) => s + r.pct, 0) / waffleRows.length)
      : 0;

    return {
      id: weekId,
      meta,
      days: allDays,
      elapsed: days.length,
      avg,
      happyDays,
      activeDays,
      areas,
      wafflesPct,
      note: state.weekNotes[weekId] || "",
    };
  }

  function knownWeekIds() {
    const keys = Object.keys(state.days);
    const set = new Set();
    set.add(Waffle.isoWeekId(new Date()));
    for (const k of keys) set.add(Waffle.isoWeekId(Waffle.parseKey(k)));
    const list = [...set].sort().reverse();
    return list;
  }

  function exportJson() {
    return JSON.stringify(state, null, 2);
  }

  function importJson(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || !Array.isArray(data.tasks)) {
      throw new Error("Archivo inválido");
    }
    state = hydrate({
      version: 2,
      tasks: data.tasks,
      days: data.days || {},
      notes: data.notes || {},
      weekNotes: data.weekNotes || {},
      focusByDay: data.focusByDay || {},
      learn: data.learn || [],
      moodByDay: data.moodByDay || {},
      purrs: data.purrs || 0,
      people: data.people,
      oneToOne: data.oneToOne || {},
      dailyScrum: data.dailyScrum || {},
      settings: data.settings,
      syncAt: data.syncAt || null,
      syncOk: data.syncOk,
      streak: data.streak || 0,
      streakDate: data.streakDate || null,
      lastActive: data.lastActive || null,
      alertLog: data.alertLog || {},
    });
    persist();
  }

  function eventsForDay(dateKey) {
    return poolForDay(dateKey).filter((t) => !isDone(dateKey, t.id));
  }

  const SCRUM_RANK = { backlog: 0, todo: 1, doing: 2, review: 3, done: 4 };

  function mergeRemote(dump) {
    if (!dump || dump.ok === false) return { ok: false, reason: "payload" };
    const remoteTasks = Array.isArray(dump.tasks) ? dump.tasks : [];
    if (!remoteTasks.length && !(dump.checks || []).length) {
      return { ok: true, empty: true, merged: 0 };
    }

    const byId = new Map(state.tasks.map((t) => [t.id, t]));
    let merged = 0;
    remoteTasks.forEach((rt) => {
      if (!rt || !rt.id) return;
      const local = byId.get(rt.id);
      if (!local) {
        const t = ensureScrum({
          id: String(rt.id),
          title: String(rt.title || "").trim() || "Tarea",
          cat: rt.cat || "vida",
          type: rt.type === "once" || rt.type === "monthly" ? rt.type : "daily",
          note: String(rt.note || ""),
          scrum: rt.scrum || "todo",
          sprintId: rt.sprintId || "",
          points: Number(rt.points) || 1,
        });
        if (rt.hour !== "" && rt.hour != null) t.hour = Number(rt.hour);
        if (rt.minute !== "" && rt.minute != null) t.minute = Number(rt.minute);
        state.tasks.push(t);
        byId.set(t.id, t);
        merged += 1;
        return;
      }
      const rs = SCRUM_RANK[rt.scrum] || 0;
      const ls = SCRUM_RANK[local.scrum] || 0;
      if (rs > ls) local.scrum = rt.scrum;
      if (rt.sprintId && !local.sprintId) local.sprintId = rt.sprintId;
      if (rt.note && !local.note) local.note = String(rt.note);
      merged += 1;
    });

    (dump.checks || []).forEach((c) => {
      if (!c || !c.date || !c.taskId) return;
      if (!state.days[c.date]) state.days[c.date] = {};
      state.days[c.date][c.taskId] = true;
    });

    (dump.foco || []).forEach((f) => {
      if (!f || !f.date || !f.taskId) return;
      if (!state.focusByDay[f.date]) {
        state.focusByDay[f.date] = { taskId: f.taskId, setAt: f.setAt || Date.now() };
      }
    });

    const learnById = new Map((state.learn || []).map((x) => [x.id, x]));
    (dump.learn || []).forEach((x) => {
      if (!x || !x.id) return;
      const local = learnById.get(x.id);
      if (!local) {
        state.learn.push({
          id: x.id,
          title: String(x.title || ""),
          done: !!x.done,
          created: x.created || Date.now(),
        });
      } else if (x.done) local.done = true;
    });

    const peopleById = new Map((state.people || []).map((p) => [p.id, p]));
    (dump.people || []).forEach((p) => {
      if (!p || !p.id || peopleById.has(p.id)) return;
      state.people.push({
        id: p.id,
        name: String(p.name || ""),
        role: String(p.role || ""),
        org: p.org === "waffles" ? "waffles" : "personal",
        color: p.color || "#cbb59a",
        initials: String(p.name || "?")
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      });
      peopleById.set(p.id, p);
    });

    (dump.oneToOne || []).forEach((row) => {
      if (!row || !row.personId) return;
      const o = ensureOto(row.personId);
      if (row.lastAt && (!o.lastAt || row.lastAt > o.lastAt)) o.lastAt = String(row.lastAt);
      if (row.nextAt && !o.nextAt) o.nextAt = String(row.nextAt);
      if (row.vibe && !o.vibe) o.vibe = String(row.vibe);
      if (row.notes && !o.notes) o.notes = String(row.notes);
      if (row.cadenceDays) o.cadenceDays = Number(row.cadenceDays) || o.cadenceDays;
      if (row.items) {
        try {
          const items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
          if (Array.isArray(items) && items.length && !(o.items || []).length) o.items = items;
        } catch (_) {}
      }
    });

    (dump.oneToOneLog || []).forEach((l) => {
      if (!l || !l.personId || !l.id) return;
      const o = ensureOto(l.personId);
      if ((o.log || []).some((x) => x.id === l.id)) return;
      o.log = o.log || [];
      o.log.push({ id: l.id, at: l.at || "", text: l.text || "", vibe: l.vibe || "" });
    });
    Object.values(state.oneToOne).forEach((o) => {
      if (Array.isArray(o.log)) {
        o.log.sort((a, b) => String(b.at).localeCompare(String(a.at)));
        o.log = o.log.slice(0, 40);
      }
    });

    (dump.dailyScrum || []).forEach((d) => {
      if (!d || !d.date) return;
      if (!state.dailyScrum[d.date]) {
        state.dailyScrum[d.date] = {
          yesterday: d.yesterday || "",
          today: d.today || "",
          blockers: d.blockers || "",
        };
      }
    });

    (dump.notes || []).forEach((n) => {
      if (!n || !n.date || !n.text) return;
      if (!state.notes[n.date]) state.notes[n.date] = String(n.text);
    });

    (dump.semanas || []).forEach((w) => {
      if (!w || !w.weekId || !w.note) return;
      if (!state.weekNotes[w.weekId]) state.weekNotes[w.weekId] = String(w.note);
    });

    if (Number(dump.streak) > (state.streak || 0)) state.streak = Number(dump.streak);
    if (Number(dump.purrs) > (state.purrs || 0)) state.purrs = Number(dump.purrs);

    persist();
    return { ok: true, merged };
  }

  function rankedPendings(dateKey, limit) {
    const day = dateKey || Waffle.todayKey();
    const nowMin = Waffle.minutesNow();
    const focus = getFocus(day);
    const rows = [];
    dueOneToOnes(day).forEach((p) => {
      const fake = {
        id: "oto:" + p.id,
        title: "1:1 · " + p.name,
        cat: p.org === "personal" ? "vida" : "rh",
        type: "once",
        note: "uwu · presencia",
        vital: true,
        otoId: p.id,
      };
      rows.push({
        task: fake,
        score: Waffle.priorityScore(fake, { oto: true, nowMin }),
        why: Waffle.whyLabel(fake, { oto: true }),
      });
    });
    poolForDay(day).forEach((t) => {
      if (isDone(day, t.id)) return;
      if (t.id === Waffle.FOCUS_TASK_ID) return;
      const extras = { nowMin, isFocus: !!(focus && focus.taskId === t.id) };
      rows.push({
        task: t,
        score: Waffle.priorityScore(t, extras),
        why: extras.isFocus ? "es el foco ahora" : Waffle.whyLabel(t, extras),
      });
    });
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, limit || 8);
  }

  function nextSuggestedFocus(dateKey) {
    const day = dateKey || Waffle.todayKey();
    const ranked = rankedPendings(day, 12);
    const pick = ranked.find((r) => !r.task.otoId && r.task.id !== Waffle.PURR_TASK_ID && r.task.id !== Waffle.LETTER_TASK_ID);
    return pick || null;
  }

  function markAlertFired(slotId, dateKey) {
    const day = dateKey || Waffle.todayKey();
    if (!state.alertLog) state.alertLog = {};
    state.alertLog[day] = state.alertLog[day] || {};
    state.alertLog[day][slotId] = Date.now();
    persist();
  }

  function wasAlertFired(slotId, dateKey) {
    const day = dateKey || Waffle.todayKey();
    return !!(state.alertLog && state.alertLog[day] && state.alertLog[day][slotId]);
  }

  function bumpLetterWin() {
    state.settings.letterWins = (state.settings.letterWins || 0) + 1;
    const today = Waffle.todayKey();
    if (!state.days[today]) state.days[today] = {};
    state.days[today][Waffle.LETTER_TASK_ID] = true;
    persist();
    return state.settings.letterWins;
  }

  return {
    KEY,
    get,
    persist,
    isDone,
    isOnceSettled,
    poolForDay,
    dayProgress,
    areaProgress,
    wafflesProgress,
    toggle,
    getFocus,
    setFocus,
    clearFocus,
    purr,
    setMood,
    addLearn,
    personById,
    ensureOto,
    dueOneToOnes,
    setOto,
    logTalk,
    addOtoItem,
    toggleOtoItem,
    addPerson,
    setDailyScrum,
    yesterdayDoneTitles,
    moveScrum,
    board,
    setSettings,
    markSynced,
    taskById,
    resetDay,
    addTask,
    removeTask,
    setNote,
    setWeekNote,
    weekReport,
    knownWeekIds,
    exportJson,
    importJson,
    eventsForDay,
    mergeRemote,
    rankedPendings,
    nextSuggestedFocus,
    markAlertFired,
    wasAlertFired,
    bumpLetterWin,
  };
})();
