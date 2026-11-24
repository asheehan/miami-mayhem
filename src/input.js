// Pointer input. Reports positions in canvas CSS pixels; main.js does the hit testing.
// No game rules here.
//
// handlers: {
//   onPickUp(x, y) -> bool   pointer went down; return true to start a drag
//   onDrag(x, y)             pointer moved during a drag
//   onDrop(x, y)             drag ended (pointer up or cancelled)
//   onTap(x, y)              pointer went down and up without starting a drag
// }
export function attachInput(canvas, handlers) {
  let active = null; // { id, dragging }

  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e) => {
    if (active) return;
    e.preventDefault();
    const p = point(e);
    const dragging = !!handlers.onPickUp?.(p.x, p.y);
    active = { id: e.pointerId, dragging, last: p };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // capture is best effort
    }
  };

  const move = (e) => {
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault();
    const p = point(e);
    active.last = p;
    if (active.dragging) {
      handlers.onDrag?.(p.x, p.y);
    }
  };

  const up = (e) => {
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault();
    // a cancelled touch has no position worth trusting, so it ends where it last was
    const p = e.type === 'pointercancel' ? active.last : point(e);
    const { dragging } = active;
    active = null;
    if (dragging) handlers.onDrop?.(p.x, p.y);
    else if (e.type === 'pointerup') handlers.onTap?.(p.x, p.y);
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
  };
}
