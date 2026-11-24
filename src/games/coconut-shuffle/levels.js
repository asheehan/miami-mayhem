// Coconut Shuffle levels: five rounds each, ramping gently. The first levels are slow with
// three shells; then more swaps, faster, more shells, double swaps, and one twist at a time.
//
// shells   how many shells (3-5)
// swaps    shuffling steps (a double swap or a ring spin counts as one)
// time     seconds per swap (the gap between swaps is a third of that)
// show     seconds the critter is shown before the shells drop
// reach    the furthest apart two swapping shells can be (1 = neighbours only)
// doubles  steps where two pairs swap at once
// fakes    fake-out wiggles (two shells start to swap, then go back)
// decoy    hops of a blue decoy crab (it runs in, then hops between empty shells)
// ring     the shells sit in a ring; spins = steps where the whole ring turns
// leaf     a palm leaf sweeps over the middle during one swap
// two      two critters hide; the one to find is shown at the end
// teach    the picker badge
export const LEVELS = [
  { name: 'Slow and easy', shells: 3, swaps: 3, time: 1.25, show: 2.0, reach: 1, teach: 'shells' },
  { name: 'One more', shells: 3, swaps: 4, time: 1.15, show: 1.8, reach: 1, teach: 'shells' },
  { name: 'Long way round', shells: 3, swaps: 5, time: 1.05, show: 1.6, teach: 'shells' },
  { name: 'Busy beach', shells: 3, swaps: 6, time: 0.9, show: 1.4, teach: 'more' },
  { name: 'Quick hands', shells: 3, swaps: 7, time: 0.75, show: 1.3, teach: 'fast' },
  { name: 'Four shells', shells: 4, swaps: 6, time: 0.8, show: 1.3, teach: 'shells' },
  { name: 'Four and quick', shells: 4, swaps: 8, time: 0.68, show: 1.2, teach: 'fast' },
  { name: 'Five shells', shells: 5, swaps: 8, time: 0.68, show: 1.2, teach: 'shells' },
  { name: 'Double trouble', shells: 5, swaps: 8, time: 0.66, show: 1.2, doubles: 3, teach: 'double' },
  { name: 'Sneaky crab', shells: 4, swaps: 8, time: 0.62, show: 1.2, decoy: 2, teach: 'decoy' },
  { name: 'Fake out', shells: 4, swaps: 9, time: 0.58, show: 1.1, fakes: 3, teach: 'fake' },
  { name: 'Round and round', shells: 5, swaps: 9, time: 0.58, show: 1.1, ring: true, spins: 4, teach: 'ring' },
  { name: 'Palm leaf', shells: 5, swaps: 10, time: 0.54, show: 1.1, leaf: true, doubles: 2, teach: 'leaf' },
  { name: 'Find the pink one', shells: 5, swaps: 10, time: 0.52, show: 1.0, two: true, teach: 'two' },
  {
    name: 'Shuffle master', shells: 5, swaps: 14, time: 0.42, show: 1.0, doubles: 4, fakes: 2, decoy: 2, leaf: true, teach: 'master',
  },
];

// One number for how hard a level is: steps per second of watching, weighted by how many
// shells there are to lose track among and how many twists are in play.
export function difficulty(L) {
  const twists = (L.doubles ? 1 : 0) + (L.fakes ? 1 : 0) + (L.decoy ? 1 : 0) + (L.ring ? 1 : 0) + (L.leaf ? 1 : 0) + (L.two ? 1.5 : 0);
  return (L.swaps / L.time) * (1 + (L.shells - 3) * 0.3) * (1 + twists * 0.2);
}

// What a 6-year-old's first levels must stay within.
export const EASY = { shells: 3, maxSwaps: 5, minTime: 1.0 };
