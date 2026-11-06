import { buildWerkstatt } from './werkstatt.js';
import { buildApotheke } from './apotheke.js';
import { buildDestille } from './destille.js';
import { buildBank } from './bank.js';
import { buildPension } from './pension.js';

// Innenräume, ein Modul je Raum. Gemeinsames steht in room.js und fittings.js.
export function buildInteriors() {
  return [buildPension(), buildWerkstatt(), buildApotheke(), buildDestille(), buildBank()];
}
