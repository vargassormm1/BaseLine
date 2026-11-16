import type { Format } from "./types";
/** The original Baseline rule, unchanged: a win is worth 5 (one set), 10 (best of 3) or 20 (best of 5); a loss 0.
 *  Each match stores the points fixed when it was recorded, so a future rule change never rewrites history. */
export const POINTS: Record<Format, number> = { 1: 5, 3: 10, 5: 20 };
export const pointsFor = (f: Format) => POINTS[f];
