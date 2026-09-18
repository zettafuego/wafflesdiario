/**
 * Alertas al celular y a la computadora (Notification + service worker).
 * Si la PWA está instalada, Windows y Android las muestran en el sistema.
 */
window.WaffleAlerts = (() => {
  const ICON = "./assets/icons/icon-192.png";

  function supported() {
    return "Notification" in window;
  }

  function permission() {
    if (!supported()) return "denied";
    return Notification.permission;
  }

  function enabled() {
    return !!(window.WaffleStore.get().settings || {}).alerts && permission() === "granted";
  }

  async function ask() {
    if (!supported()) return { ok: false, reason: "no-api" };
    const perm = await Notification.requestPermission();
    const ok = perm === "granted";
    window.WaffleStore.setSettings({ alerts: ok });
    if (ok) {
      ping(
        "Waffle te va a avisar",
        "Celu y computadora. Eres un crack. El Edu del pasado te quiere mucho."
      );
    }
    return { ok, perm };
  }

  function disable() {
    window.WaffleStore.setSettings({ alerts: false });
  }

  function ping(title, body, tag, sticky) {
    if (permission() !== "granted") return false;
    const opts = {
      body: body || "",
      tag: tag || "waffle-" + Date.now(),
      icon: ICON,
      badge: ICON,
      lang: "es",
      requireInteraction: !!sticky,
      vibrate: [80, 40, 80],
      data: { url: "./" },
    };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, opts))
        .catch(() => {
          try {
            new Notification(title, opts);
          } catch (_) {}
        });
    } else {
      try {
        new Notification(title, opts);
      } catch (_) {}
    }
    try {
      navigator.vibrate?.(120);
    } catch (_) {}
    return true;
  }

  function topLine() {
    const ranked = window.WaffleStore.rankedPendings(window.Waffle.todayKey(), 3);
    if (!ranked.length) return "Nada urgente. Paz mental, crack.";
    return ranked
      .map((r, i) => (i + 1) + ". " + r.task.title)
      .join(" · ");
  }

  function slots() {
    const W = window.Waffle;
    const S = window.WaffleStore;
    const today = W.todayKey();
    const focus = S.getFocus(today);
    const ranked = S.rankedPendings(today, 1);
    const top = ranked[0];
    const vitalLeft = S.poolForDay(today).filter((t) => t.vital && !S.isDone(today, t.id));
    const dueOto = S.dueOneToOnes(today);
    const list = [
      {
        id: "wake",
        hour: 7,
        minute: 30,
        title: "Buenas, crack",
        body: "Cuerpo primero: dientes, reflujo, oler rico. Luego una sola cosa.",
        sticky: false,
      },
      {
        id: "morning",
        hour: 8,
        minute: 0,
        title: "Resolver ahora",
        body: topLine(),
        sticky: true,
      },
      {
        id: "noon",
        hour: 12,
        minute: 30,
        title: focus ? "¿Cerraste el foco?" : "Aún no hay foco",
        body: focus
          ? "Foco: " + focus.task.title + ". Una. El Edu de antes te espera al otro lado."
          : "Encuentra el foco. " + (top ? top.task.title : "Una sola cosa."),
        sticky: !focus,
      },
      {
        id: "vital",
        hour: 16,
        minute: 0,
        title: vitalLeft.length ? "Vitales pendientes" : "Buen ritmo",
        body: vitalLeft.length
          ? vitalLeft.map((t) => t.title).join(" · ") + ". 10 min. Dejar más ordenado."
          : "Vitales ok. Eres un crack. El Edu del pasado te quiere mucho.",
        sticky: vitalLeft.length > 0,
      },
      {
        id: "bard",
        hour: 19,
        minute: 0,
        title: "Pharmony · Bard",
        body: "19:00. 10 min con Bard. Demo. Una sola cosa.",
        sticky: true,
      },
      {
        id: "night",
        hour: 21,
        minute: 45,
        title: "Cargar el celular",
        body: "Antes de dormir, carga el celu. Paz mental. Mañana te lo vas a agradecer.",
        sticky: true,
      },
      {
        id: "letter",
        hour: 22,
        minute: 15,
        title: "Carta del Edu del pasado",
        body: "Eres un crack. El Edu del pasado te quiere mucho.",
        sticky: true,
      },
    ];
    if (dueOto.length) {
      list.push({
        id: "oto",
        hour: 9,
        minute: 30,
        title: "1:1 hoy",
        body: "Presencia con " + dueOto.map((p) => p.name).join(", ") + ". uwu. No es acta.",
        sticky: true,
      });
    }
    S.poolForDay(today)
      .filter((t) => t.hour != null && !S.isDone(today, t.id))
      .forEach((t) => {
        list.push({
          id: "task-" + t.id,
          hour: t.hour,
          minute: t.minute || 0,
          title: t.title,
          body: (t.note || W.catName(t.cat)) + " · una sola. Eres un crack.",
          sticky: true,
        });
      });
    return list;
  }

  function tick() {
    if (!enabled()) return;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    slots().forEach((s) => {
      const due = s.hour * 60 + (s.minute || 0);
      if (cur < due || cur > due + 12) return;
      if (window.WaffleStore.wasAlertFired(s.id)) return;
      window.WaffleStore.markAlertFired(s.id);
      ping(s.title, s.body, "waffle-" + s.id, s.sticky);
    });
  }

  function nagIfNoFocus() {
    if (!enabled()) return;
    const today = window.Waffle.todayKey();
    if (window.WaffleStore.getFocus(today)) return;
    if (window.WaffleStore.wasAlertFired("nag-focus")) return;
    const now = window.Waffle.minutesNow();
    if (now < 8 * 60 || now > 21 * 60) return;
    window.WaffleStore.markAlertFired("nag-focus");
    const top = window.WaffleStore.nextSuggestedFocus(today);
    ping(
      "Encuentra el foco",
      top ? "Empieza por: " + top.task.title : "Una sola cosa. Paz mental, crack.",
      "waffle-nag-focus",
      true
    );
  }

  let timer = null;
  function start() {
    if (timer) return;
    tick();
    nagIfNoFocus();
    timer = setInterval(() => {
      tick();
    }, 20000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tick();
    });
  }

  return {
    supported,
    permission,
    enabled,
    ask,
    disable,
    ping,
    tick,
    start,
    topLine,
  };
})();
