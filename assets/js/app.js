(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let view = "board";
  let filter = "all";
  let otoFilter = "waffles";
  let otoPersonId = null;
  let selectedDate = Waffle.todayKey();
  let selectedWeek = Waffle.isoWeekId(new Date());
  let deferredInstall = null;

  const FILTERS = [
    ["all", "Todo"],
    ["foco", "Foco"],
    ["waffles", "Waffles"],
    ["casma", "SSOMA Casma"],
    ["lovesong", "Love Song"],
    ["finanzas", "Finanzas"],
    ["aprender", "Aprender"],
    ["aseo", "Aseo"],
    ["arte", "Arte"],
    ["maestra", "Maestría"],
    ["vida", "Vida"],
  ];

  let greeted = false;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function waffleHide() {
    $("#waffleMsg")?.classList.add("hidden");
    $("#waffleCard")?.classList.remove("purring");
  }

  function waffleSay(kind, extra) {
    const overlay = $("#waffleMsg");
    const img = $("#waffleMsgImg");
    const text = $("#waffleMsgText");
    const waves = $("#waffleWaves");
    if (!overlay || !img || !text) return;
    img.src = Waffle.FACES[kind] || Waffle.FACES.greet;
    img.className = "waffle-face " + kind;
    text.textContent = extra || Waffle.line(kind);
    waves.classList.toggle("on", kind === "purr" || kind === "sad" || kind === "mantra");
    $("#waffleHearts").textContent = kind === "sad" ? "♡" : kind === "purr" || kind === "done" ? "♡ ♡" : "✦";
    overlay.classList.remove("hidden");
    if (kind === "purr" || kind === "sad" || kind === "mantra") {
      $("#waffleCard")?.classList.add("purring");
    }
    clearTimeout(waffleSay._t);
    waffleSay._t = setTimeout(waffleHide, kind === "block" ? 3600 : 4800);
  }

  function openFocusDlg() {
    const box = $("#focusChoices");
    const dateKey = selectedDate;
    const pending = WaffleStore.poolForDay(dateKey).filter(
      (t) => t.id !== Waffle.FOCUS_TASK_ID && !WaffleStore.isDone(dateKey, t.id)
    );
    box.innerHTML = "";
    if (!pending.length) {
      box.innerHTML = `<p class="sub">No hay pendientes. Waffle ronronea igual.</p>`;
    } else {
      pending.forEach((t) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "focus-choice";
        b.innerHTML = `<b>${esc(t.title)}</b><span>${esc(Waffle.catName(t.cat))}${t.note ? " · " + esc(t.note) : ""}</span>`;
        b.onclick = () => {
          const res = WaffleStore.setFocus(dateKey, t.id);
          $("#focusDlg").close();
          if (res.ok) waffleSay("focus", `Foco: ${t.title}. Una sola cosa.`);
          render();
        };
        box.appendChild(b);
      });
    }
    $("#focusDlg").showModal();
  }

  function tryToggle(dateKey, taskId) {
    const res = WaffleStore.toggle(dateKey, taskId);
    if (!res.ok) {
      if (res.reason === "no-focus" || res.reason === "pick-focus") {
        waffleSay("focus");
        openFocusDlg();
      } else if (res.reason === "focus") {
        waffleSay("block", `Todavía no. Termina primero: ${res.focusTitle}`);
      }
      return;
    }
    if (res.completedFocus) {
      waffleSay("crack", `${Waffle.CRACK} ${Waffle.PAST_LOVE}`);
      const next = WaffleStore.nextSuggestedFocus(dateKey);
      if (next) {
        setTimeout(() => {
          waffleSay("prio", `Siguiente: ${next.task.title}. Una sola.`);
        }, 3200);
      }
    } else if (res.purr) waffleSay("purr");
    render();
    saveToExcel(res.unchecked ? "Excel: estatus actualizado" : "Excel: Tarea terminada");
  }

  function saveToExcel(msg) {
    if (!window.WaffleSync || typeof window.WaffleSync.push !== "function") return;
    window.WaffleSync.push().then((r) => {
      if (!r.ok) return;
      if (msg) toast(msg);
    });
  }

  function doPurr() {
    WaffleStore.purr(selectedDate);
    waffleSay("purr");
    render();
  }

  function onlineLabel() {
    return navigator.onLine ? "En línea" : "Sin conexión · datos en este dispositivo";
  }

  function drawCat(pct, mood) {
    const sad = mood === "sad";
    const happy = !sad && pct >= Waffle.HAPPY_PCT;
    const mid = !sad && pct >= 35;
    const svg = $("#catSvg") || $("#catSvgBoard");
    if (!svg && !$("#catSvgBoard")) return;
    const mouth = happy
      ? `<path d="M70 86 Q80 96 90 86" fill="none" stroke="#3b2416" stroke-width="3" stroke-linecap="round"/>`
      : mid
        ? `<path d="M72 88 H88" stroke="#3b2416" stroke-width="3" stroke-linecap="round"/>`
        : `<path d="M70 92 Q80 84 90 92" fill="none" stroke="#3b2416" stroke-width="3" stroke-linecap="round"/>`;
    const cheeks = happy
      ? `<circle cx="58" cy="78" r="6" fill="#e7a38a" opacity=".55"/><circle cx="102" cy="78" r="6" fill="#e7a38a" opacity=".55"/>`
      : "";
    const tail = happy
      ? `<path d="M28 78 C8 58, 18 30, 36 38" fill="none" stroke="#c48a4a" stroke-width="10" stroke-linecap="round"/>`
      : `<path d="M28 86 C10 92, 12 110, 30 108" fill="none" stroke="#c48a4a" stroke-width="10" stroke-linecap="round"/>`;
    const markup = `
      ${tail}
      <ellipse cx="80" cy="78" rx="42" ry="36" fill="#d7a15c"/>
      <path d="M46 52 L38 22 L62 44 Z" fill="#d7a15c"/>
      <path d="M114 52 L122 22 L98 44 Z" fill="#d7a15c"/>
      <path d="M50 46 L42 28 L60 42 Z" fill="#f3d2a8"/>
      <path d="M110 46 L118 28 L100 42 Z" fill="#f3d2a8"/>
      <ellipse cx="80" cy="86" rx="18" ry="12" fill="#f3d2a8"/>
      <ellipse cx="64" cy="72" rx="7" ry="8" fill="#2b1b12"/>
      <ellipse cx="96" cy="72" rx="7" ry="8" fill="#2b1b12"/>
      <circle cx="66" cy="70" r="2" fill="#fff"/>
      <circle cx="98" cy="70" r="2" fill="#fff"/>
      <path d="M80 78 L80 86" stroke="#7a4a28" stroke-width="2"/>
      <path d="M80 86 Q74 90 68 86" fill="none" stroke="#7a4a28" stroke-width="1.6"/>
      <path d="M80 86 Q86 90 92 86" fill="none" stroke="#7a4a28" stroke-width="1.6"/>
      ${mouth}${cheeks}
      <ellipse cx="68" cy="108" rx="10" ry="6" fill="#c48a4a"/>
      <ellipse cx="94" cy="108" rx="10" ry="6" fill="#c48a4a"/>
    `;
    ["catSvg", "catSvgBoard"].forEach((id) => {
      const el = $("#" + id);
      if (el) el.innerHTML = markup;
    });
    const moodLine = sad
      ? "Waffle no quiere verte triste"
      : happy
        ? "Waffle ronronea feliz"
        : mid
          ? "Waffle te mira atento"
          : "Waffle pide buena onda";
    ["moodText", "moodTextBoard"].forEach((id) => {
      const el = $("#" + id);
      if (el) el.textContent = moodLine;
    });
  }

  function taskCard(t, dateKey) {
    const done = WaffleStore.isDone(dateKey, t.id);
    const focus = WaffleStore.getFocus(dateKey);
    const isFocus = focus && focus.taskId === t.id;
    const locked = !done && t.id !== Waffle.PURR_TASK_ID && t.id !== Waffle.FOCUS_TASK_ID && (!focus || focus.taskId !== t.id);
    const el = document.createElement("article");
    el.className = "task" + (done ? " done" : "") + (locked ? " locked" : "") + (isFocus ? " is-focus" : "");
    el.innerHTML = `
      <button class="check" type="button" aria-label="completar">${done ? "✓" : ""}</button>
      <div>
        <div class="t-title">${esc(t.title)}</div>
        <div class="t-meta">
          <span class="tag">${isFocus ? "foco" : t.type === "daily" ? "diaria" : t.type === "monthly" ? "día " + (t.monthDay || 15) : "una vez"}</span>
          ${t.vital ? `<span class="tag">vital</span>` : ""}
          ${locked ? `<span class="tag">espera</span>` : ""}
          ${t.note ? esc(t.note) : ""}
          ${!done && t.id !== Waffle.FOCUS_TASK_ID ? `<div><button class="foco-btn" type="button">${isFocus ? "es el foco" : "hacer foco"}</button></div>` : ""}
        </div>
      </div>
      <button class="icon-btn" type="button" title="borrar">✕</button>
    `;
    el.querySelector(".check").onclick = () => tryToggle(dateKey, t.id);
    const focoBtn = el.querySelector(".foco-btn");
    if (focoBtn) {
      focoBtn.onclick = (e) => {
        e.stopPropagation();
        if (isFocus) {
          waffleSay("focus", `Sigue con: ${t.title}`);
          return;
        }
        const res = WaffleStore.setFocus(dateKey, t.id);
        if (res.ok) waffleSay("focus", `Foco: ${t.title}. Una sola cosa.`);
        render();
      };
    }
    el.querySelector(".icon-btn").onclick = () => {
      if (confirm("¿Quitar esta tarea?")) {
        WaffleStore.removeTask(t.id);
        render();
      }
    };
    return el;
  }

  function appendGroup(host, catId, items, dateKey, headingTag) {
    if (!items.length) return;
    const g = document.createElement("section");
    g.className = "group";
    const doneG = items.filter((t) => WaffleStore.isDone(dateKey, t.id)).length;
    const tag = headingTag || "h2";
    const cls = headingTag === "h3" ? "" : " g";
    g.innerHTML = `<${tag} class="${cls.trim()}"><span>${esc(Waffle.catName(catId))}</span><span>${doneG}/${items.length}</span></${tag}>`;
    items
      .slice()
      .sort((a, b) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0))
      .forEach((t) => g.appendChild(taskCard(t, dateKey)));
    host.appendChild(g);
  }

  function renderFilters(box) {
    box = box || $("#filters");
    if (!box) return;
    box.innerHTML = "";
    FILTERS.forEach(([id, name]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (filter === id ? " on" : "");
      b.textContent = name;
      b.onclick = () => {
        filter = id;
        render();
      };
      box.appendChild(b);
    });
  }

  function renderTaskList(dateKey) {
    const list = $("#list");
    list.innerHTML = "";
    const tasks = WaffleStore.get().tasks.filter((t) => {
      if (WaffleStore.isOnceSettled(t, dateKey) && filter === "all") return false;
      if (filter === "all") return true;
      if (filter === "waffles") return Waffle.isWafflesFamily(t.cat);
      return t.cat === filter;
    });

    const groups = {};
    tasks.forEach((t) => {
      (groups[t.cat] ||= []).push(t);
    });

    const showWafflesBlock = filter === "all" || filter === "waffles";
    const lifeOrder = ["foco", "aseo", "lovesong", "finanzas", "aprender", "arte", "maestra", "casma", "vida"];
    let any = false;

    if (filter === "all") {
      appendGroup(list, "foco", groups.foco || [], dateKey);
      appendGroup(list, "aseo", groups.aseo || [], dateKey);
      if (groups.foco?.length || groups.aseo?.length) any = true;
    }

    if (showWafflesBlock) {
      const techIds = Waffle.WAFFLES_CATS;
      const buenaIds = Waffle.BUENA_CATS || ["ambar"];
      const waffleItems = [...techIds, ...buenaIds].flatMap((id) => groups[id] || []);
      if (waffleItems.length) {
        any = true;
        const wrap = document.createElement("section");
        wrap.className = "org-block";
        const wp = WaffleStore.wafflesProgress(dateKey);
        wrap.innerHTML = `<div class="org-head"><h2>Waffles</h2><span class="pct">${wp.pct}% · ${wp.done}/${wp.total}</span></div>
          <div class="btn-row" style="margin-top:0">
            <button class="btn primary" type="button" id="fillWafflesBtn">Guardar estatus del día</button>
          </div>
          <p class="t-meta" style="margin:0 4px 8px">Al terminar, el Excel la marca Tarea terminada. Clasificada por área y tipo.</p>`;
        const inner = document.createElement("div");
        inner.innerHTML = `<h3 class="g"><span>Waffles Tech</span><span></span></h3>`;
        techIds.forEach((id) => appendGroup(inner, id, groups[id] || [], dateKey, "h3"));
        inner.insertAdjacentHTML("beforeend", `<h3 class="g"><span>Waffles · Buena Suerte</span><span></span></h3>`);
        buenaIds.forEach((id) => appendGroup(inner, id, groups[id] || [], dateKey, "h3"));
        wrap.appendChild(inner);
        list.appendChild(wrap);
        $("#fillWafflesBtn")?.addEventListener("click", fillWafflesNow);
      }
    }

    const rest = filter === "all"
      ? ["casma", "lovesong", "finanzas", "aprender", "arte", "maestra", "vida"]
      : lifeOrder.filter((id) => id === filter);
    rest.forEach((id) => {
      if (groups[id]?.length) {
        any = true;
        appendGroup(list, id, groups[id], dateKey);
      }
    });

    if (filter !== "all" && filter !== "waffles") {
      // already handled in rest if it's a life cat; waffles handled above
    }

    if (!any) list.innerHTML = `<div class="empty">Nada por aquí. Suma una tarea o cambia el filtro.</div>`;
  }

  function renderToday() {
    showView("view-today");

    const dateKey = selectedDate;
    const isToday = dateKey === Waffle.todayKey();
    const prog = WaffleStore.dayProgress(dateKey);
    const st = WaffleStore.get();
    const weekId = Waffle.isoWeekId(Waffle.parseKey(dateKey));

    $("#todayLabel").textContent = isToday ? "Hoy" : Waffle.formatDayLong(dateKey);
    $("#heroTitle").textContent = isToday ? "Checklist de Waffle" : "Día " + dateKey;
    $("#heroSub").textContent = isToday
      ? "Eres un crack. Una a la vez. El Edu del pasado te quiere mucho."
      : "Estás viendo un día de la semana " + weekId + ".";

    const banner = $("#mantraBanner");
    if (banner) {
      const extras = (Waffle.MANTRAS || []).slice(1);
      banner.innerHTML =
        `${esc(Waffle.MANTRA)}<ul>${extras.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` +
        `<small>Mantras · uwu · también son tareas de hoy</small>`;
    }

    $("#pct").textContent = prog.pct + "%";
    $("#doneN").textContent = prog.done + "/" + prog.total;
    $("#streak").textContent = st.streak || 0;
    $("#barFill").style.width = prog.pct + "%";
    $("#weekPill").textContent = weekId;
    $("#weekPill").onclick = () => {
      selectedWeek = weekId;
      view = "week";
      syncDock();
      render();
    };
    $("#netPill").textContent = onlineLabel();
    $("#netPill").classList.toggle("warn", !navigator.onLine);
    $("#netPill").classList.toggle("ok", navigator.onLine);
    drawCat(prog.pct, st.moodByDay[dateKey]);
    renderFilters();
    renderFocusCard(dateKey);
    renderPrio(dateKey);
    renderMood(dateKey);
    renderLearn();
    renderDailyScrum(dateKey);
    renderTaskList(dateKey);
    refreshSyncStatus();

    const note = $("#dayNote");
    note.value = st.notes[dateKey] || "";
    note.onblur = () => WaffleStore.setNote(dateKey, note.value.trim());

    if (isToday && !greeted) {
      greeted = true;
      setTimeout(() => {
        const mood = st.moodByDay[dateKey];
        if (mood === "sad") waffleSay("sad");
        else if (!WaffleStore.getFocus(dateKey)) waffleSay("focus", "Crack. Encuentra el foco. Una sola cosa.");
        else waffleSay("purr", Waffle.PAST_LOVE);
      }, 500);
    }
  }

  function renderFocusCard(dateKey) {
    const el = $("#focusCard");
    const focus = WaffleStore.getFocus(dateKey);
    if (!focus) {
      el.className = "focus-card empty";
      el.innerHTML = `
        <h3>Encuentra el foco</h3>
        <p class="focus-title">Todavía no hay uno</p>
        <p class="t-meta">No hagas otra hasta terminar una. Elige UNA cosa.</p>
        <div class="btn-row">
          <button class="btn primary" type="button" id="pickFocusBtn">Encontrar el foco</button>
        </div>`;
      $("#pickFocusBtn").onclick = openFocusDlg;
      return;
    }
    el.className = "focus-card";
    el.innerHTML = `
      <h3>Foco de ahora</h3>
      <p class="focus-title">${esc(focus.task.title)}</p>
      <p class="t-meta">${esc(Waffle.catName(focus.task.cat))}${focus.task.note ? " · " + esc(focus.task.note) : ""}</p>
      <div class="btn-row">
        <button class="btn primary" type="button" id="finishFocusBtn">Terminé esta</button>
        <button class="btn ghost" type="button" id="changeFocusBtn">Cambiar foco</button>
      </div>`;
    $("#finishFocusBtn").onclick = () => tryToggle(dateKey, focus.taskId);
    $("#changeFocusBtn").onclick = () => {
      waffleSay("focus", "Ok. Nuevo foco, pero sigue siendo uno solo.");
      openFocusDlg();
    };
  }

  function renderPrio(dateKey) {
    const el = $("#prioBox");
    if (!el) return;
    const ranked = WaffleStore.rankedPendings(dateKey, 5);
    if (!ranked.length) {
      el.innerHTML = `<h3>Resolver ahora</h3><p class="t-meta">Nada urgente. Paz mental. ${esc(Waffle.PAST_LOVE)}</p>`;
      return;
    }
    el.innerHTML = `<h3>Resolver ahora</h3>
      <p class="t-meta" style="margin-bottom:8px">Vitales y pendientes de una vez primero. Una. Eres un crack.</p>`;
    ranked.forEach((row, i) => {
      const t = row.task;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "prio-item";
      b.innerHTML = `<span class="n">${i + 1}</span>
        <span><b>${esc(t.title)}</b><span class="why">${esc(row.why)}</span></span>
        <span class="go">${t.otoId ? "1:1" : "foco"}</span>`;
      b.onclick = () => {
        if (t.otoId) {
          view = "oto";
          syncDock();
          render();
          openOto(t.otoId);
          return;
        }
        const res = WaffleStore.setFocus(dateKey, t.id);
        if (res.ok) waffleSay("prio", `Foco: ${t.title}. Una sola. ${Waffle.CRACK}`);
        render();
      };
      el.appendChild(b);
    });
  }

  function renderMood(dateKey) {
    const el = $("#moodRow");
    const current = WaffleStore.get().moodByDay[dateKey] || "";
    el.innerHTML = `<span>¿Cómo estás?</span>`;
    [
      ["good", "Buena onda"],
      ["ok", "Ok"],
      ["sad", "Triste"],
    ].forEach(([id, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (current === id ? " on" : "");
      b.textContent = label;
      b.onclick = () => {
        WaffleStore.setMood(dateKey, id);
        if (id === "sad") waffleSay("sad");
        else if (id === "good") waffleSay("purr");
        else waffleSay("mantra");
        render();
      };
      el.appendChild(b);
    });
  }

  function renderLearn() {
    const el = $("#learnBox");
    const items = WaffleStore.get().learn || [];
    el.innerHTML = `
      <h3>Objetos para aprender</h3>
      <p class="t-meta" style="margin-bottom:8px">Mándalos aquí. Se vuelven tarea de Aprender. Solo se estudian cuando son el foco.</p>
      <div class="learn-row">
        <input id="learnInput" placeholder="Ej. shaders, armonía, SQL de minas…" />
        <button class="btn primary" type="button" id="learnSend">Mandar</button>
      </div>
      <div id="learnList"></div>`;
    const list = $("#learnList");
    if (!items.length) {
      list.innerHTML = `<p class="sub">Todavía no hay objetos. Manda el primero.</p>`;
    } else {
      items.slice(0, 12).forEach((it) => {
        const row = document.createElement("div");
        row.className = "learn-item" + (it.done ? " done" : "");
        row.innerHTML = `<span>${esc(it.title)}</span>`;
        if (!it.done) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "btn ghost";
          b.style.cssText = "flex:0;padding:6px 10px;font-size:12px";
          b.textContent = "Hacer foco";
          b.onclick = () => {
            const res = WaffleStore.setFocus(selectedDate, it.id);
            if (res.ok) waffleSay("learn", `Foco de aprendizaje: ${it.title}`);
            else if (res.reason === "done") waffleSay("done", "Eso ya lo cerraste.");
            render();
          };
          row.appendChild(b);
        }
        list.appendChild(row);
      });
    }
    $("#learnSend").onclick = sendLearn;
    $("#learnInput").onkeydown = (e) => {
      if (e.key === "Enter") sendLearn();
    };
  }

  async function fillWafflesNow() {
    const res = await WaffleSync.fillWafflesExcel();
    const n = res?.n || 0;
    waffleSay("done", n ? `Estatus del día: ${n} filas en el Excel. Terminadas = Tarea terminada.` : "No hay filas para guardar.");
    toast(res?.ok ? `Excel: ${n} tareas · clasificadas` : `CSV listo · ${n} filas. Revisa la conexión /exec`);
  }

  function sendLearn() {
    const input = $("#learnInput");
    const title = input?.value.trim();
    if (!title) return;
    const res = WaffleStore.addLearn(title);
    if (res.ok) {
      waffleSay("learn");
      render();
    }
  }

  function showView(id) {
    ["view-today", "view-week", "view-weeks", "view-board", "view-oto", "view-letter"].forEach((v) => {
      $("#" + v)?.classList.toggle("hidden", v !== id);
    });
    if (id !== "view-letter") window.WaffleGame?.stop();
    document.body.classList.toggle("pizarra", id === "view-board");
    $(".wrap")?.classList.toggle("wide", id === "view-board");
  }

  function renderDailyScrum(dateKey) {
    const el = $("#dailyBox");
    if (!el) return;
    const d = WaffleStore.get().dailyScrum[dateKey] || {};
    const yDone = WaffleStore.yesterdayDoneTitles(dateKey);
    const focus = WaffleStore.getFocus(dateKey);
    const due = WaffleStore.dueOneToOnes(dateKey);
    el.innerHTML = `
      <h3>Daily Scrum</h3>
      <p class="t-meta" style="margin-bottom:8px">Ayer / hoy / bloqueos. Sprint ${esc(Waffle.isoWeekId(Waffle.parseKey(dateKey)))}.</p>
      <label>Ayer</label>
      <textarea id="dsYesterday">${esc(d.yesterday || yDone.join(" · "))}</textarea>
      <label>Hoy (foco)</label>
      <textarea id="dsToday">${esc(d.today || (focus ? focus.task.title : ""))}</textarea>
      <label>Bloqueos</label>
      <textarea id="dsBlockers">${esc(d.blockers || "")}</textarea>
      ${due.length ? `<p class="t-meta" style="margin-top:8px">1:1 de hoy: ${due.map((p) => esc(p.name)).join(", ")}</p>` : ""}`;
    ["dsYesterday", "dsToday", "dsBlockers"].forEach((id) => {
      $("#" + id).onblur = () => {
        WaffleStore.setDailyScrum(dateKey, {
          yesterday: $("#dsYesterday").value.trim(),
          today: $("#dsToday").value.trim(),
          blockers: $("#dsBlockers").value.trim(),
        });
      };
    });
  }

  function renderBoard() {
    showView("view-board");
    const dateKey = selectedDate;
    const weekId = Waffle.isoWeekId(Waffle.parseKey(dateKey));
    const prog = WaffleStore.dayProgress(dateKey);
    const st = WaffleStore.get();
    $("#boardKicker").textContent = Waffle.formatDayLong(dateKey);
    $("#boardWeekPill").textContent = "Sprint " + weekId;
    $("#boardNetPill").textContent = onlineLabel();
    drawCat(prog.pct, st.moodByDay[dateKey]);
    const banner = $("#mantraBannerBoard");
    if (banner) {
      banner.innerHTML =
        `${esc(Waffle.MANTRA)}<small>Mantras · uwu · arrastra todo en la pizarra</small>`;
    }
    renderFilters($("#boardFilters"));

    const cols = WaffleStore.board(weekId, dateKey, filter);
    const due = WaffleStore.dueOneToOnes(dateKey);
    if (filter === "all" || filter === "waffles") {
      due.forEach((p) => {
        cols.todo.push({
          id: "oto:" + p.id,
          title: "1:1 · " + p.name,
          cat: p.org === "personal" ? "vida" : "rh",
          note: "uwu · presencia",
          type: "daily",
          vital: true,
          otoId: p.id,
          scrum: "todo",
        });
      });
    }

    const host = $("#board");
    host.innerHTML = "";
    Waffle.SCRUM.forEach((col) => {
      const lane = document.createElement("section");
      lane.className = "lane";
      lane.dataset.col = col.id;
      const items = cols[col.id] || [];
      lane.innerHTML = `<h3><span>${esc(col.name)}</span><span>${items.length}</span></h3>
        <p class="t-meta lane-hint">${esc(col.hint || "")}</p>`;
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "lane-empty";
        empty.textContent = col.id === "doing" ? "Suelta aquí el foco" : "Nada aquí todavía";
        lane.appendChild(empty);
      }
      items.forEach((t) => {
        const b = document.createElement("article");
        b.className = "card" + (col.id === "doing" ? " doing" : "") + (t.vital ? " vital" : "");
        b.draggable = !t.otoId;
        b.dataset.id = t.id;
        const daily = t.type === "daily" ? `<span class="tag quiet">Cada día</span>` : t.type === "once" ? `<span class="tag">Una vez</span>` : "";
        b.innerHTML = `<b>${esc(t.title)}</b>
          <div class="card-meta"><span class="tag">${esc(Waffle.catName(t.cat))}</span>${daily}${t.vital ? '<span class="tag gold">Vital</span>' : ""}</div>
          ${t.note ? `<div class="t-meta">${esc(t.note)}</div>` : ""}`;
        if (t.otoId) {
          b.onclick = () => openOto(t.otoId);
        } else {
          b.onclick = () => cycleScrum(t);
          b.addEventListener("dragstart", (e) => {
            b.classList.add("dragging");
            e.dataTransfer.setData("text/plain", t.id);
            e.dataTransfer.effectAllowed = "move";
          });
          b.addEventListener("dragend", () => b.classList.remove("dragging"));
        }
        lane.appendChild(b);
      });
      lane.addEventListener("dragover", (e) => {
        e.preventDefault();
        lane.classList.add("drag-over");
      });
      lane.addEventListener("dragleave", () => lane.classList.remove("drag-over"));
      lane.addEventListener("drop", (e) => {
        e.preventDefault();
        lane.classList.remove("drag-over");
        const id = e.dataTransfer.getData("text/plain");
        if (!id || id.startsWith("oto:")) return;
        const task = WaffleStore.taskById(id);
        if (!task) return;
        const res = WaffleStore.moveScrum(id, col.id, dateKey);
        if (!res.ok) {
          if (res.reason === "no-focus" || res.reason === "pick-focus") {
            waffleSay("focus");
            openFocusDlg();
          } else if (res.reason === "focus") {
            waffleSay("block", `WIP 1. Termina primero: ${res.focusTitle}`);
          }
          return;
        }
        if (col.id === "doing") waffleSay("focus", `En curso: ${task.title}`);
        if (col.id === "done") waffleSay("done");
        render();
        saveToExcel(col.id === "done" ? "Excel: Tarea terminada" : "Excel: pizarra sincronizada");
      });
      host.appendChild(lane);
    });

    if (!greeted) {
      greeted = true;
      setTimeout(() => {
        const mood = st.moodByDay[dateKey];
        if (mood === "sad") waffleSay("sad");
        else if (!WaffleStore.getFocus(dateKey)) waffleSay("focus", "Pizarra lista. Elige UNA carta y suéltala en En curso.");
        else waffleSay("purr");
      }, 400);
    }
  }

  function cycleScrum(t) {
    const order = Waffle.SCRUM.map((c) => c.id);
    const cur = t.scrum || "todo";
    const next = order[(order.indexOf(cur) + 1) % order.length];
    const res = WaffleStore.moveScrum(t.id, next, selectedDate);
    if (!res.ok) {
      if (res.reason === "no-focus" || res.reason === "pick-focus") {
        waffleSay("focus");
        openFocusDlg();
      } else if (res.reason === "focus") {
        waffleSay("block", `WIP 1. Termina primero: ${res.focusTitle}`);
      }
      return;
    }
    if (next === "doing") waffleSay("focus", `En curso: ${t.title}`);
    if (next === "done") waffleSay("done");
    render();
    saveToExcel(next === "done" ? "Excel: Tarea terminada" : "Excel: pizarra sincronizada");
  }

  function renderOto() {
    showView("view-oto");
    const filters = $("#otoFilters");
    filters.innerHTML = "";
    [
      ["waffles", "Waffles uwu"],
      ["personal", "Personal"],
    ].forEach(([id, name]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (otoFilter === id ? " on" : "");
      b.textContent = name;
      b.onclick = () => {
        otoFilter = id;
        render();
      };
      filters.appendChild(b);
    });

    const today = Waffle.todayKey();
    const people = (WaffleStore.get().people || []).filter((p) => p.org === otoFilter);
    const due = WaffleStore.dueOneToOnes(today).filter((p) => p.org === otoFilter);
    const dueBox = $("#otoDue");
    dueBox.innerHTML = due.length
      ? `<div class="due-banner">Hoy toca 1:1 con ${due.map((p) => esc(p.name)).join(", ")}. Presencia, no prisa.</div>`
      : "";

    const list = $("#otoList");
    list.innerHTML = "";
    people.forEach((p) => {
      const o = WaffleStore.ensureOto(p.id);
      const isDue = o.nextAt && o.nextAt <= today;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "oto-card" + (isDue ? " due" : "");
      const vibe = Waffle.VIBES.find((v) => v.id === o.vibe);
      b.innerHTML = `
        <div class="oto-head">
          <div class="oto-av" style="background:${esc(p.color)}">${esc(p.initials)}</div>
          <div>
            <strong>${esc(p.name)}</strong>
            <div class="t-meta">${esc(p.role)}${vibe ? " · " + vibe.label : ""}</div>
            <div class="t-meta">${o.lastAt ? "último " + o.lastAt : "aún no hay charla"} · próximo ${o.nextAt || "—"}</div>
          </div>
        </div>`;
      b.onclick = () => openOto(p.id);
      list.appendChild(b);
    });
    if (!people.length) list.innerHTML = `<div class="empty">Nadie aquí todavía. Agrega a quien quieres cuidar.</div>`;
  }

  function openOto(personId) {
    otoPersonId = personId;
    const p = WaffleStore.personById(personId);
    const o = WaffleStore.ensureOto(personId);
    $("#otoDlgTitle").textContent = p ? p.name : "One to one";
    $("#otoDlgSub").textContent = (p?.role || "") + " · uwu · una a la vez";
    $("#otoNotes").value = o.notes || "";
    $("#otoTalk").value = "";
    $("#otoNext").value = o.nextAt || "";
    $("#otoCadence").value = o.cadenceDays || 7;
    const row = $("#otoVibeRow");
    row.innerHTML = "";
    Waffle.VIBES.forEach((v) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (o.vibe === v.id ? " on" : "");
      b.textContent = v.label;
      b.onclick = () => {
        WaffleStore.setOto(personId, { vibe: v.id });
        openOto(personId);
      };
      row.appendChild(b);
    });
    const items = $("#otoItems");
    items.innerHTML = "";
    (o.items || []).forEach((it) => {
      const line = document.createElement("label");
      line.className = "check-row";
      line.style.display = "flex";
      line.style.gap = "8px";
      line.style.margin = "6px 0";
      line.innerHTML = `<input type="checkbox" ${it.status === "done" ? "checked" : ""}/> <span>${esc(it.title)}</span>`;
      line.querySelector("input").onchange = () => {
        WaffleStore.toggleOtoItem(personId, it.id);
        openOto(personId);
      };
      items.appendChild(line);
    });
    const log = $("#otoLog");
    log.innerHTML = (o.log || [])
      .slice(0, 6)
      .map((l) => `<p class="t-meta">${esc(l.at)} · ${esc(l.text)}</p>`)
      .join("");
    waffleSay("oto", `1:1 con ${p?.name || ""}. Presencia.`);
    $("#otoDlg").showModal();
  }

  function refreshSyncStatus() {
    const el = $("#syncStatus");
    if (!el) return;
    const s = WaffleStore.get();
    const url = s.settings?.scriptUrl;
    if (!url) {
      el.textContent = "Falta la puerta /exec. Está fija en data.js.";
      return;
    }
    el.textContent = s.syncAt
      ? (s.syncOk ? "Excel Waffles · sync OK · " : "Excel Waffles · sync falló · ") + s.syncAt.replace("T", " ").slice(0, 16)
      : "Excel: control de tareas. Sincronizar deja celu y PC al día.";
  }

  function areaBar(name, pct, color) {
    return `
      <div class="area-row">
        <div class="top"><b>${esc(name)}</b><span>${pct}%</span></div>
        <div class="bar"><i style="width:${pct}%;background:linear-gradient(90deg, ${color}, var(--gold-2))"></i></div>
      </div>`;
  }

  function renderWeek() {
    showView("view-week");

    const report = WaffleStore.weekReport(selectedWeek);
    const m = report.meta;
    $("#weekIdBig").textContent = m.id;
    $("#weekRange").textContent = m.range + (report.elapsed < 7 ? ` · ${report.elapsed}/7 días transcurridos` : "");
    $("#weekAvg").textContent = report.avg + "%";
    $("#weekHappy").textContent = report.happyDays;
    $("#weekActive").textContent = report.activeDays;
    $("#weekBarFill").style.width = report.avg + "%";
    $("#weekNote").value = report.note || "";

    const heat = $("#heat");
    heat.innerHTML = "";
    report.days.forEach((d) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = (d.key === selectedDate ? "on " : "") + (d.future ? "future" : "");
      b.disabled = d.future;
      b.innerHTML = `<span class="wd">${Waffle.weekdayLetter(d.key)}</span>
        <span class="dn">${Waffle.parseKey(d.key).getDate()}</span>
        <span class="hp">${d.future ? "—" : d.pct + "%"}</span>`;
      if (!d.future) {
        b.onclick = () => {
          selectedDate = d.key;
          view = "today";
          syncDock();
          render();
        };
      }
      heat.appendChild(b);
    });

    $("#areaBars").innerHTML =
      areaBar("Waffles (Tech + Buena Suerte)", report.wafflesPct, "#e8b86a") +
      Waffle.CATS.map((c) => areaBar(c.org === "waffles" ? "WT · " + c.name : c.name, report.areas[c.id].pct, c.color)).join("");
  }

  function renderWeeks() {
    showView("view-weeks");

    const box = $("#weekList");
    box.innerHTML = "";
    const ids = WaffleStore.knownWeekIds();
    const current = Waffle.isoWeekId(new Date());
    ids.forEach((id) => {
      const r = WaffleStore.weekReport(id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "week-card";
      btn.innerHTML = `
        <div>
          <div class="wid">${esc(id)}</div>
          <div class="rng">${esc(r.meta.range)} · ${id === current ? "en curso" : r.happyDays + " días felices"} · WT ${r.wafflesPct}%</div>
        </div>
        <div class="big">${r.avg}%</div>`;
      btn.onclick = () => {
        selectedWeek = id;
        selectedDate = r.days.find((d) => !d.future)?.key || r.meta.startKey;
        view = "week";
        syncDock();
        render();
      };
      box.appendChild(btn);
    });
    if (!ids.length) box.innerHTML = `<div class="empty">Aún no hay semanas. Marca tareas hoy y aparece ${current}.</div>`;
  }

  function syncDock() {
    $$(".dock [data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
  }

  function render() {
    if (view === "today") renderToday();
    else if (view === "week") renderWeek();
    else if (view === "weeks") renderWeeks();
    else if (view === "board") renderBoard();
    else if (view === "oto") renderOto();
    else if (view === "letter") renderLetter();
    else renderToday();
  }

  function renderLetter() {
    showView("view-letter");
    const win = $("#letterWin");
    win.classList.add("hidden");
    const canvas = $("#letterCanvas");
    window.WaffleGame.start(canvas, (res) => {
      win.classList.remove("hidden");
      waffleSay("crack", `${Waffle.CRACK} ${Waffle.PAST_LOVE}`);
      if (window.WaffleAlerts?.enabled()) {
        window.WaffleAlerts.ping(
          Waffle.CRACK,
          Waffle.PAST_LOVE + (res.perfect ? " Carta completa." : " Igual te quiero."),
          "waffle-letter-win",
          true
        );
      }
    });
  }

  function fillCatSelect() {
    const sel = $("#fCat");
    const groups = [
      ["Waffles Tech", (c) => c.org === "waffles"],
      ["Waffles · Buena Suerte", (c) => c.org === "buena"],
      ["SSOMA Casma", (c) => c.org === "casma"],
      ["Personal", (c) => c.org === "life"],
    ];
    sel.innerHTML = groups
      .map(([label, fn]) => {
        const opts = Waffle.CATS.filter(fn);
        if (!opts.length) return "";
        return `<optgroup label="${label}">` + opts.map((c) => `<option value="${c.id}">${c.name}</option>`).join("") + `</optgroup>`;
      })
      .join("");
  }

  function icsForDay(dateKey) {
    const evs = WaffleStore.eventsForDay(dateKey);
    const stamp = dateKey.replace(/-/g, "");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Waffle Daily//ES",
      ...evs.flatMap((e) => {
        const hour = e.hour ?? 9;
        const minute = e.minute ?? 0;
        const start = `${stamp}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
        return [
          "BEGIN:VEVENT",
          `UID:${e.id}-${dateKey}@waffle`,
          `DTSTAMP:${stamp}T090000`,
          `DTSTART:${start}`,
          "DURATION:PT25M",
          `SUMMARY:${e.title} · ${Waffle.catName(e.cat)}`,
          `DESCRIPTION:${(e.note || "Waffle Daily").replace(/\n/g, " ")}`,
          "END:VEVENT",
        ];
      }),
      "END:VCALENDAR",
    ];
    return lines.join("\r\n");
  }

  function bind() {
    $$(".dock [data-view]").forEach((b) => {
      b.onclick = () => {
        view = b.dataset.view;
        if (view === "today") selectedDate = Waffle.todayKey();
        if (view === "week") selectedWeek = Waffle.isoWeekId(Waffle.parseKey(selectedDate));
        syncDock();
        render();
      };
    });

    $("#addBtn").onclick = () => {
      fillCatSelect();
      $("#fTitle").value = "";
      $("#fNote").value = "";
      $("#fType").value = "daily";
      $("#addDlg").showModal();
    };
    $("#cancelAdd").onclick = () => $("#addDlg").close();
    $("#saveAdd").onclick = () => {
      const title = $("#fTitle").value.trim();
      if (!title) return;
      WaffleStore.addTask({
        title,
        cat: $("#fCat").value,
        type: $("#fType").value,
        note: $("#fNote").value.trim(),
      });
      $("#addDlg").close();
      render();
    };

    $("#moreBtn").onclick = () => {
      const s = WaffleStore.get().settings || {};
      if ($("#sheetUrl")) $("#sheetUrl").value = (window.Waffle.WAFFLES_SHEET && window.Waffle.WAFFLES_SHEET.url) || "";
      $("#scriptUrl").value = s.scriptUrl || window.Waffle.SCRIPT_URL || "";
      $("#scriptToken").value = s.token || "";
      refreshSyncStatus();
      refreshAlertsStatus();
      $("#moreDlg").showModal();
    };
    $("#closeMore").onclick = () => $("#moreDlg").close();
    $("#scriptUrl").onchange = () => WaffleStore.setSettings({ scriptUrl: $("#scriptUrl").value.trim() });
    $("#scriptToken").onchange = () => WaffleStore.setSettings({ token: $("#scriptToken").value.trim() });
    $("#syncNowBtn").onclick = async () => {
      WaffleStore.setSettings({
        scriptUrl: $("#scriptUrl").value.trim(),
        token: $("#scriptToken").value.trim(),
      });
      const res = await WaffleSync.syncAll();
      refreshSyncStatus();
      render();
      toast(
        res.ok
          ? "Sheets al día · celu y PC"
          : res.error === "sin-url"
            ? "Falta la URL …/exec de Apps Script"
            : res.error === "offline"
              ? "Sin red. Queda en este aparato."
              : "No conectó. Revisa el /exec y que el script sea versión nueva."
      );
    };
    $("#pingBtn").onclick = async () => {
      WaffleStore.setSettings({
        scriptUrl: $("#scriptUrl").value.trim(),
        token: $("#scriptToken").value.trim(),
      });
      const res = await WaffleSync.ping();
      refreshSyncStatus();
      toast(res.ok ? "Conexión OK. Ya puedes sincronizar." : "No responde. URL /exec o implementación.");
    };
    $("#excelBtn").onclick = () => {
      WaffleSync.downloadExcel();
      toast("CSV para Excel descargado");
    };
    $("#wafflesExcelBtn").onclick = fillWafflesNow;
    if ($("#openSheetBtn")) {
      $("#openSheetBtn").onclick = () => {
        const u = window.Waffle.WAFFLES_SHEET && window.Waffle.WAFFLES_SHEET.url;
        if (u) window.open(u, "_blank");
      };
    }
    $("#gotoWeek").onclick = () => {
      $("#moreDlg").close();
      selectedWeek = Waffle.isoWeekId(Waffle.parseKey(selectedDate));
      view = "week";
      syncDock();
      render();
    };
    $("#gotoWeeks").onclick = () => {
      $("#moreDlg").close();
      view = "weeks";
      syncDock();
      render();
    };

    function refreshAlertsStatus() {
      const el = $("#alertsStatus");
      const btn = $("#alertsBtn");
      if (!el || !btn) return;
      if (!window.WaffleAlerts?.supported()) {
        el.textContent = "Este navegador no deja notificaciones. Abre Chrome o Edge, o instala la app.";
        btn.disabled = true;
        return;
      }
      const on = window.WaffleAlerts.enabled();
      const perm = window.WaffleAlerts.permission();
      btn.textContent = on ? "Alertas activas · tocar para probar" : "Activar alertas (celu y PC)";
      el.textContent = on
        ? "Waffle avisa aquí y en el celu si instalas la app. Mañana, foco, Bard 19:00, cargar celu, carta de noche."
        : perm === "denied"
          ? "Las bloqueaste en el navegador. Actívalas en el candado del sitio y recarga."
          : "Sin alertas. Actívalas para el celu y la computadora.";
    }

    $("#alertsBtn").onclick = async () => {
      if (window.WaffleAlerts.enabled()) {
        window.WaffleAlerts.ping(Waffle.CRACK, Waffle.PAST_LOVE + " Prueba de alerta.", "waffle-test", false);
        toast("Alerta de prueba enviada");
        return;
      }
      const res = await window.WaffleAlerts.ask();
      refreshAlertsStatus();
      toast(res.ok ? "Alertas listas. Waffle te avisa." : "No se pudieron activar las alertas");
    };

    $("#letterAgain").onclick = () => {
      $("#letterWin").classList.add("hidden");
      renderLetter();
    };
    $("#letterToToday").onclick = () => {
      window.WaffleGame?.stop();
      view = "today";
      selectedDate = Waffle.todayKey();
      syncDock();
      render();
    };

    $("#otoAddBtn").onclick = () => {
      const name = $("#otoName").value.trim();
      if (!name) return;
      WaffleStore.addPerson({ name, org: $("#otoOrg").value, role: $("#otoRole").value.trim() });
      $("#otoName").value = "";
      $("#otoRole").value = "";
      waffleSay("oto", `${name} entra al círculo. uwu.`);
      render();
    };
    $("#closeOto").onclick = () => $("#otoDlg").close();
    $("#otoItemAdd").onclick = () => {
      const title = $("#otoItem").value.trim();
      if (!title || !otoPersonId) return;
      WaffleStore.addOtoItem(otoPersonId, title);
      $("#otoItem").value = "";
      openOto(otoPersonId);
    };
    $("#saveOtoTalk").onclick = () => {
      if (!otoPersonId) return;
      WaffleStore.setOto(otoPersonId, {
        notes: $("#otoNotes").value.trim(),
        nextAt: $("#otoNext").value,
        cadenceDays: Number($("#otoCadence").value) || 7,
      });
      const talk = $("#otoTalk").value.trim();
      if (talk) WaffleStore.logTalk(otoPersonId, talk);
      $("#otoDlg").close();
      waffleSay("purr", "Charla guardada. Dejaste el vínculo más ordenado.");
      render();
    };

    $("#resetBtn").onclick = () => {
      if (!confirm("Esto no borra las tareas. Solo desmarca el día que estás viendo.")) return;
      WaffleStore.resetDay(selectedDate);
      $("#moreDlg").close();
      render();
    };

    $("#icsBtn").onclick = () => {
      const blob = new Blob([icsForDay(selectedDate)], { type: "text/calendar" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `waffle-${selectedDate}.ics`;
      a.click();
    };

    $("#gcalBtn").onclick = () => {
      const pending = WaffleStore.eventsForDay(selectedDate);
      const text = encodeURIComponent("Waffle · bloque de tareas del día");
      const details = encodeURIComponent(pending.map((e) => `☐ ${e.title}${e.note ? " — " + e.note : ""}`).join("\n"));
      const d = selectedDate.replace(/-/g, "");
      window.open(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${d}T090000/${d}T210000&details=${details}`,
        "_blank"
      );
    };

    $("#exportBtn").onclick = () => {
      const blob = new Blob([WaffleStore.exportJson()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `waffle-daily-${Waffle.todayKey()}.json`;
      a.click();
      toast("Copia de seguridad descargada");
    };

    $("#importBtn").onclick = () => $("#importFile").click();
    $("#importFile").onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          WaffleStore.importJson(String(reader.result));
          toast("Datos restaurados");
          render();
        } catch (err) {
          toast("No se pudo importar");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    };

    $("#prevWeek").onclick = () => {
      selectedWeek = Waffle.shiftWeek(selectedWeek, -1);
      render();
    };
    $("#nextWeek").onclick = () => {
      selectedWeek = Waffle.shiftWeek(selectedWeek, 1);
      render();
    };
    $("#weekNote").addEventListener("blur", () => {
      WaffleStore.setWeekNote(selectedWeek, $("#weekNote").value.trim());
    });

    $("#waffleCard")?.addEventListener("click", doPurr);
    $("#waffleCardBoard")?.addEventListener("click", doPurr);
    $("#fillWafflesBoardBtn")?.addEventListener("click", fillWafflesNow);
    $("#mantraBannerBoard")?.addEventListener("click", () => {
      const list = Waffle.MANTRAS || [Waffle.MANTRA];
      waffleSay("mantra", list[Math.floor(Math.random() * list.length)]);
    });
    $("#waffleMsgOk")?.addEventListener("click", waffleHide);
    $("#waffleMsg")?.addEventListener("click", (e) => {
      if (e.target.id === "waffleMsg") waffleHide();
    });
    $("#closeFocus")?.addEventListener("click", () => $("#focusDlg").close());
    $("#mantraBanner")?.addEventListener("click", () => {
      const list = Waffle.MANTRAS || [Waffle.MANTRA];
      waffleSay("mantra", list[Math.floor(Math.random() * list.length)]);
    });

    $("#installBtn")?.addEventListener("click", async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      $("#installBanner").classList.remove("show");
    });

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
      $("#installBanner").classList.add("show");
    });

    window.addEventListener("online", render);
    window.addEventListener("offline", render);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  bind();
  syncDock();
  render();
  if (window.WaffleSync && window.WaffleSync.url()) {
    window.WaffleSync.syncAll().then(() => render());
  }
  window.WaffleAlerts?.start();
})();
