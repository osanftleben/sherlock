// Spielstand: alles, was der Detektiv weiß oder getan hat, ist eine ID in `known`.
// Konvention: c_ = Hinweis, d_ = Schlussfolgerung, f_ = Merker, o_ = gewählte Dialogoption.
const KEY = 'sherlock-berlin-save-v1';

export class GameState {
  constructor() {
    this.reset();
    this.listeners = [];
  }

  reset() {
    this.caseId = null;
    this.known = new Set();
    this.attempts = 0;
    this.solved = false;
    this.location = null;
    this.player = null;
    this.triedPairs = new Set();
  }

  has(id) {
    return this.known.has(id);
  }

  // Bedingungsliste: alle Einträge müssen gelten, "!id" verlangt, dass id unbekannt ist.
  check(list) {
    if (!list) return true;
    return list.every((id) => (id[0] === '!' ? !this.known.has(id.slice(1)) : this.known.has(id)));
  }

  add(id) {
    if (this.known.has(id)) return false;
    this.known.add(id);
    for (const fn of this.listeners) fn(id);
    return true;
  }

  onAdd(fn) {
    this.listeners.push(fn);
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        caseId: this.caseId,
        known: [...this.known],
        attempts: this.attempts,
        solved: this.solved,
        location: this.location,
        player: this.player,
        triedPairs: [...this.triedPairs],
      }));
    } catch { /* Ohne Speicher läuft das Spiel einfach ohne Fortsetzen. */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.caseId = data.caseId;
      this.known = new Set(data.known);
      this.attempts = data.attempts || 0;
      this.solved = !!data.solved;
      this.location = data.location;
      this.player = data.player;
      this.triedPairs = new Set(data.triedPairs || []);
      return true;
    } catch {
      return false;
    }
  }

  static hasSave() {
    try {
      return !!localStorage.getItem(KEY);
    } catch {
      return false;
    }
  }

  static clearSave() {
    try {
      localStorage.removeItem(KEY);
    } catch { /* siehe save() */ }
  }
}
