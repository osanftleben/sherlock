// Spielstand: alles, was der Detektiv in einem Fall weiß oder getan hat, ist eine ID in `known`.
// Konvention: c_ = Hinweis, d_ = Schlussfolgerung, f_ = Merker, o_ = gewählte Dialogoption.
//
// Im Browser liegt ein einziger Speicher mit einem Eintrag pro Fall:
//   { current: 'uhrmacher', cases: { uhrmacher: { known, attempts, solved, location, player, triedPairs } } }
// `current` ist der zuletzt gespielte Fall.
const KEY = 'sherlock-berlin-save-v2';
const OLD_KEY = 'sherlock-berlin-save-v1'; // ein einziger Fall pro Speicher

export class GameState {
  // defaultCase: Fall, dem ein alter Spielstand ohne Fallangabe zugeordnet wird.
  constructor(defaultCase) {
    this.defaultCase = defaultCase;
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

  // Schreibt den laufenden Fall in den Speicher und merkt ihn als zuletzt gespielt.
  save() {
    if (!this.caseId) return;
    const store = this.read();
    store.current = this.caseId;
    store.cases[this.caseId] = {
      known: [...this.known],
      attempts: this.attempts,
      solved: this.solved,
      location: this.location,
      player: this.player,
      triedPairs: [...this.triedPairs],
    };
    this.write(store);
  }

  // Lädt den Stand eines Falls. Ohne gespeicherten Stand beginnt er leer.
  load(caseId) {
    const entry = this.read().cases[caseId];
    this.reset();
    this.caseId = caseId;
    if (!entry) return false;
    this.known = new Set(entry.known);
    this.attempts = entry.attempts || 0;
    this.solved = !!entry.solved;
    this.location = entry.location;
    this.player = entry.player;
    this.triedPairs = new Set(entry.triedPairs || []);
    return true;
  }

  // Für den Titelbildschirm: welcher Fall zuletzt lief und wie weit jeder ist.
  summary() {
    const store = this.read();
    const cases = {};
    for (const [id, e] of Object.entries(store.cases)) cases[id] = { solved: !!e.solved };
    return { current: store.current, cases };
  }

  clearCase(caseId) {
    const store = this.read();
    delete store.cases[caseId];
    if (store.current === caseId) store.current = null;
    this.write(store);
  }

  read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const store = JSON.parse(raw);
        return { current: store.current || null, cases: store.cases || {} };
      }
      // Alter Spielstand mit nur einem Fall: einmalig übernehmen.
      const old = localStorage.getItem(OLD_KEY);
      if (old) {
        const data = JSON.parse(old);
        const id = data.caseId || this.defaultCase;
        const { caseId, ...entry } = data;
        const store = { current: id, cases: { [id]: entry } };
        // Den alten Stand erst löschen, wenn der neue sicher geschrieben ist.
        if (this.write(store)) localStorage.removeItem(OLD_KEY);
        return store;
      }
    } catch { /* Ohne Speicher läuft das Spiel einfach ohne Fortsetzen. */ }
    return { current: null, cases: {} };
  }

  write(store) {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
      return true;
    } catch {
      return false; // siehe read()
    }
  }
}
