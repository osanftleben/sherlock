// Fehler, die während des Spiels auftreten. Jede Meldung steht einmal in der Konsole; im
// Entwicklungsmodus zusätzlich auf einer roten Tafel oben in der Mitte, mit Ort im Code und
// wie oft sie seither aufgetreten ist. So fällt ein Fehler auf, auch wenn das Spiel weiterläuft.

const seen = new Map();
let panel = null;
let list = null;
let dismissed = false;
let lastDraw = 0;

export function reportError(part, err) {
  const message = err?.message ?? String(err);
  const key = `${part}: ${message}`;
  const entry = seen.get(key) ?? { part, message, where: whereIn(err), count: 0 };
  entry.count++;
  seen.set(key, entry);
  if (entry.count === 1) {
    console.error(`Fehler in ${part}:`, err);
    dismissed = false;
  }
  // Ein Fehler in jedem Bild zeichnet die Tafel höchstens zweimal pro Sekunde neu.
  const now = performance.now();
  if (import.meta.env.DEV && !dismissed && (entry.count === 1 || now - lastDraw > 500)) {
    lastDraw = now;
    showPanel();
  }
}

// Erste Zeile des Stapels, die in den Quelltext des Spiels zeigt, als „datei.js:zeile“.
function whereIn(err) {
  for (const line of String(err?.stack ?? '').split('\n')) {
    const m = line.match(/\/src\/([^?:)\s]+)(?:\?[^:)\s]*)?:(\d+)/);
    if (m) return `${m[1]}:${m[2]}`;
  }
  return null;
}

// Fehler außerhalb der Spielschleife, etwa in Tasten- oder Zeitgeberfunktionen.
export function watchErrors() {
  addEventListener('error', (e) => reportError('Skript', e.error ?? e.message));
  addEventListener('unhandledrejection', (e) => reportError('Skript', e.reason));
}

function showPanel() {
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'spielfehler';
    panel.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10000;max-width:min(640px,calc(100vw - 24px));max-height:40vh;overflow:auto;padding:10px 14px;background:rgba(40,10,8,.95);color:#ffd8cc;font:13px/1.45 system-ui,sans-serif;border:1px solid #c0392b;border-radius:6px';
    const head = document.createElement('div');
    head.textContent = 'Fehler im Spiel';
    head.style.cssText = 'font-weight:600;color:#ff8a7a;margin-bottom:4px';
    list = document.createElement('div');
    const close = document.createElement('button');
    close.textContent = 'Schließen';
    close.style.cssText = 'margin-top:8px;cursor:pointer';
    // Bis zu einer neuen Meldung bleibt die Tafel zu.
    close.onclick = () => {
      panel.remove();
      panel = null;
      dismissed = true;
    };
    panel.append(head, list, close);
    document.body.append(panel);
  }
  list.replaceChildren(...[...seen.values()].map((e) => {
    const p = document.createElement('div');
    p.style.margin = '3px 0';
    p.textContent = `${e.part}: ${e.message}${e.where ? ` (${e.where})` : ''}${e.count > 1 ? ` × ${e.count}` : ''}`;
    return p;
  }));
}
