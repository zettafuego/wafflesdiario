/**
 * Carta del Edu del pasado — atrapa las notas.
 * Siempre termina diciendo: eres un crack / el Edu del pasado te quiere mucho.
 */
window.WaffleGame = (() => {
  const NEED = 8;
  const NOTES = [
    "Eres un crack.",
    "El Edu del pasado te quiere mucho.",
    "Paz mental, causa.",
    "Una sola cosa.",
    "uwu",
    "Te quiero. De verdad.",
    "Pide ayuda.",
    "Oler rico.",
    "Carga el celu.",
    "Deja más ordenado.",
    "No estás solo.",
    "Waffle ronronea.",
  ];

  let canvas = null;
  let ctx = null;
  let running = false;
  let raf = 0;
  let state = null;
  let onWin = null;
  let bound = false;

  function size() {
    const w = Math.min(canvas.parentElement.clientWidth || 360, 420);
    const h = Math.max(420, Math.round(w * 1.25));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function reset() {
    const { w, h } = size();
    state = {
      w,
      h,
      x: w / 2,
      caught: 0,
      missed: 0,
      items: [],
      spawn: 0,
      t: 0,
      over: false,
      lastPhrase: "Atrapa las cartas, crack.",
      pointer: false,
    };
  }

  function spawn() {
    const s = state;
    s.items.push({
      x: 28 + Math.random() * (s.w - 56),
      y: -24,
      v: 1.35 + Math.random() * 1.5 + s.caught * 0.08,
      text: NOTES[Math.floor(Math.random() * NOTES.length)],
      kind: Math.random() < 0.55 ? "heart" : "note",
    });
  }

  function drawWaffle(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#d7a15c";
    ctx.beginPath();
    ctx.ellipse(0, 8, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(-26, -22);
    ctx.lineTo(-6, -6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(26, -22);
    ctx.lineTo(6, -6);
    ctx.fill();
    ctx.fillStyle = "#2b1b12";
    ctx.beginPath();
    ctx.ellipse(-9, 4, 4, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(9, 4, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-8, 2.5, 1.4, 0, Math.PI * 2);
    ctx.arc(10, 2.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a4a28";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, 14);
    ctx.quadraticCurveTo(0, 20, 8, 14);
    ctx.stroke();
    ctx.restore();
  }

  function loop() {
    if (!running || !state) return;
    const s = state;
    s.t += 1;
    s.spawn += 1;
    if (s.spawn > 48 - Math.min(s.caught * 2, 22)) {
      s.spawn = 0;
      spawn();
    }

    ctx.clearRect(0, 0, s.w, s.h);
    const g = ctx.createLinearGradient(0, 0, 0, s.h);
    g.addColorStop(0, "#3a281c");
    g.addColorStop(1, "#1c140f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s.w, s.h);

    ctx.fillStyle = "rgba(246,234,215,0.08)";
    for (let i = 0; i < 18; i++) {
      const px = (i * 47 + s.t * 0.3) % s.w;
      const py = (i * 73 + s.t * 0.2) % s.h;
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#f6ead7";
    ctx.font = "600 13px Outfit, sans-serif";
    ctx.fillText("Cartas " + s.caught + "/" + NEED, 14, 24);
    ctx.fillStyle = "#e8b86a";
    ctx.fillText("Edu del pasado", s.w - 128, 24);

    const next = [];
    s.items.forEach((it) => {
      it.y += it.v;
      const hitX = Math.abs(it.x - s.x) < 36;
      const hitY = it.y > s.h - 78 && it.y < s.h - 28;
      if (hitX && hitY) {
        s.caught += 1;
        s.lastPhrase = it.text;
        return;
      }
      if (it.y > s.h + 20) {
        s.missed += 1;
        return;
      }
      next.push(it);
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.sin((s.t + it.x) / 18) * 0.12);
      if (it.kind === "heart") {
        ctx.fillStyle = "#e8a0b8";
        ctx.font = "22px serif";
        ctx.textAlign = "center";
        ctx.fillText("♡", 0, 0);
      } else {
        ctx.fillStyle = "#fff4e3";
        ctx.fillRect(-22, -12, 44, 28);
        ctx.strokeStyle = "#e8b86a";
        ctx.strokeRect(-22, -12, 44, 28);
        ctx.fillStyle = "#2a1b12";
        ctx.font = "600 9px Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("carta", 0, 6);
      }
      ctx.restore();
    });
    s.items = next;

    drawWaffle(s.x, s.h - 48);

    ctx.fillStyle = "#fff4e3";
    ctx.font = "650 15px Outfit, sans-serif";
    ctx.textAlign = "center";
    wrap(s.lastPhrase, s.w / 2, s.h - 12, s.w - 24);
    ctx.textAlign = "left";

    if (s.caught >= NEED) {
      finish(true);
      return;
    }
    if (s.missed >= 10 && s.caught >= 3) {
      finish(false);
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function wrap(text, x, y, max) {
    const words = String(text).split(" ");
    let line = "";
    let yy = y;
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > max) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += 16;
      } else line = test;
    });
    ctx.fillText(line, x, yy);
  }

  function finish(perfect) {
    running = false;
    cancelAnimationFrame(raf);
    state.over = true;
    const wins = window.WaffleStore.bumpLetterWin();
    if (typeof onWin === "function") onWin({ perfect, wins, caught: state.caught });
  }

  function pointer(ev) {
    if (!state || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX ?? ev.touches?.[0]?.clientX) - rect.left;
    if (!Number.isFinite(x)) return;
    state.x = Math.max(28, Math.min(state.w - 28, x));
  }

  function key(ev) {
    if (!state || !running) return;
    if (ev.key === "ArrowLeft" || ev.key === "a") state.x = Math.max(28, state.x - 22);
    if (ev.key === "ArrowRight" || ev.key === "d") state.x = Math.min(state.w - 28, state.x + 22);
  }

  function bindInput() {
    if (bound || !canvas) return;
    bound = true;
    canvas.addEventListener("pointermove", pointer);
    canvas.addEventListener("pointerdown", pointer);
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      pointer(e);
    }, { passive: false });
    window.addEventListener("keydown", key);
  }

  function start(el, winCb) {
    canvas = el;
    ctx = canvas.getContext("2d");
    onWin = winCb;
    reset();
    running = true;
    bindInput();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  return { start, stop, NEED };
})();
