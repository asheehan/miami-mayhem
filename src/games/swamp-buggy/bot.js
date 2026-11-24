// Drivers for tests, the menu's demo run and the ?debug autopilot. Pure: they read a run and
// return a pedal ('gas', 'brake' or null).
import { groundAngle, groundY, GRAVITY } from './sim.js';

const TAU = Math.PI * 2;

// Where (roughly) the buggy will come down: steps its flight forward until it meets the ground.
function landingX(s) {
  const b = s.buggy;
  let x = b.x;
  let y = b.y;
  let vy = b.vy;
  const dt = 0.05;
  for (let i = 0; i < 60; i++) {
    x += b.vx * dt;
    vy -= GRAVITY * dt;
    y += vy * dt;
    if (y < groundY(s.track, x, s.time) + 1.2) break;
  }
  return x;
}

// Holds the gas; in the air it levels the buggy to match the ground it's going to land on.
export function botPedal(s) {
  const b = s.buggy;
  if (s.status === 'done') return null;
  if (!s.airborne || s.hangT < 0.1) return 'gas';
  const target = groundAngle(s.track, landingX(s), s.time);
  let a = (b.a - target) % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  // ease off as it gets close so it doesn't overshoot
  const lead = a + b.w * 0.25;
  if (lead > 0.12) return 'brake';
  if (lead < -0.12) return 'gas';
  return null;
}

// A six-year-old's favourite strategy: hold the gas the whole way.
export const gasPedal = (s) => (s.status === 'done' ? null : 'gas');

// A child poking at both pedals at random.
export function makeRandomPedal(rng) {
  let pedal = 'gas';
  let until = 0;
  return (s) => {
    if (s.time >= until) {
      const r = rng();
      pedal = r < 0.65 ? 'gas' : r < 0.85 ? null : 'brake';
      until = s.time + 0.2 + rng() * 1.3;
    }
    return pedal;
  };
}
