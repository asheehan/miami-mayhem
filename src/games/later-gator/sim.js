// A run of one level: hopping, swimming, getting bonked, snacks and the swamp. Pure: no DOM.
import { COLS, isSafe, isBlocked, laneHits } from './level.js';

export const HOP_TIME = 0.16; // seconds per hop
export const BONK_TIME = 0.9; // the bonk and spin before he is put back
export const INVULN_TIME = 1.5; // blinking after being put back
export const HEARTS = 3;
export const WIN_TIME = 1.7; // the belly flop, before the overlay shows
export const EDGE = 0.5; // in a canal, drifting further than this past the outer columns is off the map

const DIRS = {
  up: [1, 0],
  down: [-1, 0],
  left: [0, -1],
  right: [0, 1],
};
export const DIR_NAMES = Object.keys(DIRS);

export function createRun(level) {
  return {
    level,
    time: 0,
    row: level.start.row,
    x: level.start.col,
    face: 'up', // which way he last hopped, for the view
    hop: null, // { dir, x0, row0, x1, row1, t }
    queued: null, // one buffered hop
    hearts: HEARTS,
    status: 'play', // 'play' | 'bonk' | 'lost' | 'won'
    bonkT: 0,
    bonkBy: null, // 'hit' | 'drift'
    invuln: 0,
    checkpoint: { row: level.start.row, col: level.start.col },
    best: level.start.row, // furthest row reached
    got: level.snacks.map(() => false),
    gotCount: 0,
    bump: null, // { dir, t } when a hop was refused, for a little wobble
    endTime: 0,
    hops: 0,
  };
}

export function cloneRun(run) {
  return {
    ...run,
    hop: run.hop && { ...run.hop },
    checkpoint: { ...run.checkpoint },
    got: run.got.slice(),
    bump: run.bump && { ...run.bump },
  };
}

export const laneAt = (run, row = run.row) => run.level.rows[row];
export const inWater = (run) => laneAt(run).type === 'canal';
export const stars = (run) => run.gotCount;

// Where a hop in direction `dir` from where he is would land, or null if it can't be made.
export function hopTarget(run, dir) {
  const [dr, dc] = DIRS[dir];
  const rows = run.level.rows;
  const row1 = run.row + dr;
  if (row1 < 0 || row1 >= rows.length) return null;
  const to = rows[row1].type;
  if (to === 'canal') {
    const x1 = run.x + dc;
    if (x1 < -EDGE + 0.05 || x1 > COLS - 1 + EDGE - 0.05) return null;
    return { row1, x1 };
  }
  if (dc !== 0) {
    // sideways on land: one whole square, never off the map or into a palm or umbrella
    const c = Math.round(run.x) + dc;
    if (c < 0 || c >= COLS || isBlocked(run.level, row1, c)) return null;
    return { row1, x1: c };
  }
  // forward or back onto land: snap to the nearest open square
  const c = Math.max(0, Math.min(COLS - 1, Math.round(run.x)));
  if (!isBlocked(run.level, row1, c)) return { row1, x1: c };
  if (laneAt(run).type !== 'canal') return null;
  const other = run.x < c ? c - 1 : c + 1;
  if (other >= 0 && other < COLS && !isBlocked(run.level, row1, other) && Math.abs(other - run.x) < 1.2) return { row1, x1: other };
  return null;
}

function startHop(run, dir) {
  const target = hopTarget(run, dir);
  run.face = dir;
  if (!target) {
    run.bump = { dir, t: run.time };
    return false;
  }
  run.hop = { dir, x0: run.x, row0: run.row, x1: target.x1, row1: target.row1, t: 0 };
  run.hops++;
  return true;
}

// Ask for a hop. While a hop is under way it is buffered (one deep; the newest wins).
export function hop(run, dir) {
  if (run.status !== 'play' || !DIRS[dir]) return false;
  if (run.hop) {
    run.queued = dir;
    return true;
  }
  return startHop(run, dir);
}

function land(run) {
  const h = run.hop;
  run.hop = null;
  run.row = h.row1;
  run.x = h.x1;
  const lane = laneAt(run);
  if (run.row > run.best) run.best = run.row;
  if (isSafe(lane.type) && run.row >= run.checkpoint.row) run.checkpoint = { row: run.row, col: Math.round(run.x) };
  const snacks = run.level.snacks;
  for (let i = 0; i < snacks.length; i++) {
    if (!run.got[i] && snacks[i].row === run.row && Math.abs(snacks[i].col - run.x) < 0.5) {
      run.got[i] = true;
      run.gotCount++;
    }
  }
  if (lane.type === 'swamp') {
    run.status = 'won';
    run.endTime = 0;
    run.queued = null;
    return;
  }
  if (run.queued) {
    const q = run.queued;
    run.queued = null;
    startHop(run, q);
  }
}

function bonk(run, by) {
  run.status = 'bonk';
  run.bonkT = 0;
  run.bonkBy = by;
  run.hearts--;
  run.queued = null;
}

function respawn(run) {
  run.status = 'play';
  run.hop = null;
  run.queued = null;
  run.row = run.checkpoint.row;
  run.x = run.checkpoint.col;
  run.face = 'up';
  run.invuln = INVULN_TIME;
}

export function step(run, dt) {
  run.time += dt;
  if (run.status === 'won') {
    run.endTime += dt;
    return;
  }
  if (run.status === 'lost') return;
  if (run.status === 'bonk') {
    run.bonkT += dt;
    if (run.bonkT >= BONK_TIME) {
      if (run.hearts <= 0) run.status = 'lost';
      else respawn(run);
    }
    return;
  }
  run.invuln = Math.max(0, run.invuln - dt);

  const h = run.hop;
  if (h) {
    // a hop from water keeps drifting with the current until it leaves it
    const from = run.level.rows[h.row0];
    if (from.type === 'canal') {
      h.x0 += from.drift * dt;
      if (run.level.rows[h.row1].type === 'canal') h.x1 += from.drift * dt;
    }
    h.t += dt;
    const p = Math.min(1, h.t / HOP_TIME);
    run.x = h.x0 + (h.x1 - h.x0) * p;
    run.row = p >= 0.5 ? h.row1 : h.row0;
    if (p >= 1) land(run);
    if (run.status !== 'play') return;
  } else if (inWater(run)) {
    run.x += laneAt(run).drift * dt;
  }

  // carried off the side of the map
  if (inWater(run) && (run.x < -EDGE || run.x > COLS - 1 + EDGE)) {
    run.x = Math.max(-EDGE, Math.min(COLS - 1 + EDGE, run.x));
    if (run.invuln <= 0) {
      run.hop = null;
      bonk(run, 'drift');
      return;
    }
  }

  if (run.invuln <= 0 && laneHits(laneAt(run), run.x, run.time)) bonk(run, 'hit');
}

// 0..1 of the way through the level, for the progress bar.
export const progress = (run) => Math.min(1, run.best / (run.level.rows.length - 1));
