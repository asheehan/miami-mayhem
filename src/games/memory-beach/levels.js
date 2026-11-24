// Memory Beach levels. Pure data.
//
// cols, rows: the grid (portrait: never more than 5 across, so phone cards stay big)
// mode:       'pairs'   two of the same picture
//             'buddies' two different pictures that go together (pail and spade)
//             'colour'  same picture, same colour (a red crab is no twin for a blue crab)
//             'triples' three of the same picture
// colours:    colour levels only: how many colours each picture comes in
// preview:    seconds every card shows face up at the start (0 for none)
// gull:       { after } a seagull swaps two face-down cards once, after this many turns
// wave:       { after, times } a wave washes in and shows one row for a moment, every
//             `after` turns, up to `times` times
// teach:      the first level of a new idea shows a little picture demo before it starts

export const LEVELS = [
  { cols: 2, rows: 2, mode: 'pairs', preview: 4, teach: 'pairs' },
  { cols: 2, rows: 3, mode: 'pairs', preview: 4 },
  { cols: 2, rows: 4, mode: 'pairs', preview: 4 },
  { cols: 3, rows: 4, mode: 'pairs', preview: 4 },
  { cols: 2, rows: 4, mode: 'buddies', preview: 4, teach: 'buddies' },
  { cols: 3, rows: 4, mode: 'pairs', preview: 3.5, wave: { after: 3, times: 1 }, teach: 'wave' },
  { cols: 3, rows: 4, mode: 'colour', colours: 3, preview: 3.5, teach: 'colour' },
  { cols: 4, rows: 4, mode: 'pairs', preview: 3 },
  { cols: 3, rows: 4, mode: 'buddies', preview: 3 },
  { cols: 3, rows: 4, mode: 'pairs', preview: 2.5, gull: { after: 3 }, teach: 'gull' },
  { cols: 4, rows: 4, mode: 'colour', colours: 2, preview: 2 },
  { cols: 3, rows: 4, mode: 'triples', preview: 2, teach: 'triples' },
  { cols: 4, rows: 5, mode: 'pairs', preview: 1.5, wave: { after: 4, times: 2 } },
  { cols: 4, rows: 5, mode: 'buddies', preview: 1 },
  { cols: 4, rows: 4, mode: 'pairs', preview: 0, gull: { after: 4 } },
  { cols: 4, rows: 5, mode: 'colour', colours: 2, preview: 0 },
  { cols: 4, rows: 6, mode: 'triples', preview: 0, wave: { after: 5, times: 2 } },
  { cols: 5, rows: 6, mode: 'pairs', preview: 0, gull: { after: 6 }, wave: { after: 5, times: 2 } },
];

// Two players on one iPad: pick a board by picture. Always plain pairs, no preview.
export const TWO_SIZES = [
  { id: 'small', cols: 3, rows: 4 },
  { id: 'medium', cols: 4, rows: 5 },
  { id: 'big', cols: 5, rows: 6 },
];

export const twoPlayerLevel = (id) => {
  const s = TWO_SIZES.find((t) => t.id === id) || TWO_SIZES[0];
  return { cols: s.cols, rows: s.rows, mode: 'pairs', preview: 0, size: s.id };
};
