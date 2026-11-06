import { uhrmacher } from './uhrmacher.js';

// Alle Fälle in der Reihenfolge, in der sie auf dem Titelbildschirm stehen.
// Ein Fall mit `after: '<id>'` wird erst freigegeben, wenn jener Fall gelöst ist.
export const CASE_LIST = [uhrmacher];
export const CASES = Object.fromEntries(CASE_LIST.map((c) => [c.id, c]));
export const FIRST_CASE = CASE_LIST[0].id;
