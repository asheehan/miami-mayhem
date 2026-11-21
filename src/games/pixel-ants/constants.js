export const SPAWN_INTERVAL = 0.3; // seconds between ants from one slot
export const ANT_SPEED = 12; // cells per second
export const SLOT_Y = 3.5; // slot centre, in cells below the bottom row
export const MAX_DEAL_TRIES = 50;
export const JITTER = 1.5; // queue sort key jitter, in rows
export const RETRY_INTERVAL = 0.1; // seconds before a slot with nothing to take looks again
export const TARGETING = 'rows'; // 'rows' = clear a layer side to side; 'nearest' = shortest walk
// Hard difficulty: the picture at double resolution, with bigger blocks and faster ants
// so a game is about twice as long rather than four times.
export const HARD = { blockMin: 20, blockMax: 80, spawnInterval: 0.15 };
