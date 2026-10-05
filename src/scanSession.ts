import type { Candidate } from './lexicon';
// Hands the candidates from a scan screen to the review screen without squeezing
// them through route params. Lives only for the duration of one scan.
let pending: Candidate[] = [];
export const setPending = (c: Candidate[]) => { pending = c; };
export const takePending = () => { const c = pending; pending = []; return c; };
