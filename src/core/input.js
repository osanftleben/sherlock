// Tastatur und Maus. Klappt die Zeigersperre nicht, kann man mit gedrückter Maustaste schauen.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.dx = 0;
    this.dy = 0;
    this.locked = false;
    this.dragging = false;
    this.lookEnabled = false;
    this.onKey = null;
    this.onClick = null;
    this.onLockLost = null;

    addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (!e.repeat && this.onKey) this.onKey(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      const nowLocked = document.pointerLockElement === canvas;
      if (this.locked && !nowLocked && this.lookEnabled && this.onLockLost) this.onLockLost();
      this.locked = nowLocked;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.lookEnabled) return;
      if (!this.locked) {
        this.dragging = true;
        this.dragMoved = 0;
        this.lock();
      }
      if (this.locked && e.button === 0 && this.onClick) this.onClick();
    });
    addEventListener('mouseup', () => {
      if (this.dragging && this.dragMoved < 5 && this.onClick) this.onClick();
      this.dragging = false;
    });
    addEventListener('mousemove', (e) => {
      if (!this.lookEnabled) return;
      if (this.locked || this.dragging) {
        this.dx += e.movementX;
        this.dy += e.movementY;
        if (this.dragging) this.dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY);
      }
    });
  }

  lock() {
    try {
      const result = this.canvas.requestPointerLock();
      if (result && result.catch) result.catch(() => {});
    } catch { /* Fällt auf Schauen per Ziehen zurück. */ }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  consumeMouse() {
    const m = { x: this.dx, y: this.dy };
    this.dx = 0;
    this.dy = 0;
    return m;
  }

  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }
}
