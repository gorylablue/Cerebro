// Movimiento al estilo de iOS (skill apple-design): resortes interrumpibles, arrastre 1:1,
// impulso proyectado y resistencia en los bordes. Lo usan las Prioridades, el panel de
// departamento y las ventanas para poder cerrarse deslizando con el dedo.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// En Safari de iOS, :active solo se pinta si la página escucha toques.
document.addEventListener('touchstart', () => {}, { passive: true });

// Resorte con los dos parámetros de Apple: damping (1 = sin rebote, <1 rebota) y
// response (segundos; no es una duración fija). Parte del valor actual y de la velocidad
// del dedo, así que se puede interrumpir en cualquier momento. Devuelve una función para detenerlo.
export function spring({ from, to, velocity = 0, damping = 1, response = 0.35, onUpdate, onDone }) {
  if (reduceMotion.matches) { onUpdate(to); onDone?.(); return () => {}; }
  const k = (2 * Math.PI / response) ** 2;
  const c = (4 * Math.PI * damping) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = requestAnimationFrame(function step(now) {
    const dt = Math.min(0.064, (now - last) / 1000);
    last = now;
    const n = Math.max(1, Math.ceil(dt / 0.004));
    for (let i = 0; i < n; i++) {
      v += (-k * (x - to) - c * v) * (dt / n);
      x += v * (dt / n);
    }
    if (Math.abs(x - to) < 0.4 && Math.abs(v) < 10) { onUpdate(to); onDone?.(); return; }
    onUpdate(x);
    raf = requestAnimationFrame(step);
  });
  return () => cancelAnimationFrame(raf);
}

// Dónde terminaría el gesto si siguiera con su impulso (función de Apple, como el scroll).
export const project = (velocity, rate = 0.99) => ((velocity / 1000) * rate) / (1 - rate);

// Más allá del borde, cada vez sigue menos al dedo, en vez de frenar en seco.
export const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));

// Quita los estilos del arrastre (se llama al volver a abrir el elemento).
export function clearDrag(el) {
  if (!el) return;
  el._stopSpring?.();
  el._dragOffset = 0;
  el.style.transform = '';
  el.style.transition = '';
}

/**
 * Cerrar deslizando.
 * target:  el elemento que se mueve.
 * handle:  dónde se puede agarrar (por defecto, el mismo elemento).
 * axis():  'x' o 'y' (función, porque cambia con la orientación).
 * sign:    1 = se cierra hacia abajo/derecha, -1 = hacia arriba/izquierda.
 * onProgress(p): 0 abierto → 1 cerrado, para atenuar el fondo al mismo ritmo.
 * onDismiss(): cierra de verdad (la lógica normal de la app).
 * enabled(): si el gesto está disponible ahora mismo.
 */
export function dismissGesture({ target, handle = target, axis = () => 'y', sign = 1, onProgress, onDismiss, enabled = () => true }) {
  let start = null;
  let locked = false;
  let ax = 'y';
  let history = [];

  const size = () => (ax === 'y' ? target.offsetHeight : target.offsetWidth);
  const apply = (o) => {
    target._dragOffset = o;
    const px = o * sign;
    target.style.transform = ax === 'y' ? `translate3d(0, ${px}px, 0)` : `translate3d(${px}px, 0, 0)`;
    onProgress?.(Math.max(0, Math.min(1, o / size())));
  };

  handle.addEventListener('pointerdown', (e) => {
    if (!enabled() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    ax = axis();
    target._stopSpring?.(); // interrumpir: se agarra desde donde está ahora mismo
    start = { x: e.clientX, y: e.clientY, offset: target._dragOffset || 0, id: e.pointerId };
    locked = !!target._dragOffset;
    history = [{ t: performance.now(), p: 0 }];
    if (locked) { handle.setPointerCapture(e.pointerId); target.style.transition = 'none'; }
  });

  handle.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dMain = (ax === 'y' ? e.clientY - start.y : e.clientX - start.x) * sign;
    const dCross = ax === 'y' ? e.clientX - start.x : e.clientY - start.y;
    if (!locked) {
      // Umbral de 10 px antes de decidir la dirección; si es el otro eje, se deja al scroll normal.
      if (Math.abs(dMain) < 10 && Math.abs(dCross) < 10) return;
      if (Math.abs(dMain) <= Math.abs(dCross) || dMain < 0) { start = null; return; }
      locked = true;
      handle.setPointerCapture(e.pointerId);
      target.style.transition = 'none';
      start.lockAt = dMain; // sin salto: el panel arranca justo debajo del dedo
    }
    e.preventDefault();
    let o = start.offset + dMain - (start.lockAt || 0);
    if (o < 0) o = rubberband(o, size());
    apply(o);
    const now = performance.now();
    history.push({ t: now, p: dMain });
    while (history.length > 2 && now - history[0].t > 100) history.shift();
  });

  const end = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const wasLocked = locked;
    start = null;
    locked = false;
    if (!wasLocked) return;
    // Evita que soltar el dedo active el botón que quedó debajo.
    const block = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', block, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', block, { capture: true }), 350);

    const a = history[0];
    const b = history[history.length - 1];
    const velocity = b && a && b.t > a.t ? ((b.p - a.p) / (b.t - a.t)) * 1000 : 0; // px/s
    const o = target._dragOffset || 0;
    const full = size();
    const close = e.type !== 'pointercancel' && velocity > -80 && (o + project(velocity) > Math.min(full * 0.5, 220) || velocity > 650);
    const to = close ? full * 1.04 : 0;
    target._stopSpring = spring({
      from: o, to, velocity,
      damping: !close && Math.abs(velocity) > 400 ? 0.8 : 1, // rebote solo si hubo impulso
      response: close ? 0.3 : 0.35,
      onUpdate: apply,
      onDone: () => {
        target._stopSpring = null;
        if (close) onDismiss();
        else { clearDrag(target); onProgress?.(0); }
      },
    });
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}
