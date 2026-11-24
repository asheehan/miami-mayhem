// Memory Beach picture catalogue. Pure data: which pictures exist, which ones look alike
// (a family: never two from one family in the same game), which can be recoloured for the
// colour-twins levels, and the buddy pairs. The drawings themselves live in pictures.js.

// The main library: bold Miami pictures for the plain pairs and triples levels.
export const LIBRARY = [
  { id: 'flamingo', family: 'pink-bird' },
  { id: 'gator', family: 'reptile' },
  { id: 'pelican' },
  { id: 'manatee', family: 'sea-mammal' },
  { id: 'dolphin', family: 'sea-mammal' },
  { id: 'iguana', family: 'reptile' },
  { id: 'crab' },
  { id: 'turtle' },
  { id: 'parrot', family: 'red-bird' },
  { id: 'toucan' },
  { id: 'octopus', family: 'blob' },
  { id: 'jellyfish', family: 'blob' },
  { id: 'starfish', family: 'star' },
  { id: 'fish' },
  { id: 'seahorse' },
  { id: 'pineapple' },
  { id: 'coconut', family: 'brown-round' },
  { id: 'mango', family: 'round-fruit' },
  { id: 'icecream', family: 'icy' },
  { id: 'snowcone', family: 'icy' },
  { id: 'sandwich', family: 'bread' },
  { id: 'taco', family: 'bread' },
  { id: 'watermelon', family: 'round-fruit' },
  { id: 'surfboard', family: 'long-board' },
  { id: 'beachball', family: 'ball' },
  { id: 'sunglasses' },
  { id: 'flipflop' },
  { id: 'sandcastle', family: 'building' },
  { id: 'lighthouse', family: 'tower' },
  { id: 'sailboat', family: 'boat' },
  { id: 'speedboat', family: 'boat' },
  { id: 'rocket', family: 'tower' },
  { id: 'palm' },
  { id: 'hibiscus', family: 'flower' },
  { id: 'conch' },
  { id: 'lifeguard', family: 'building' },
  { id: 'skate' },
  { id: 'car' },
  { id: 'conga', family: 'music' },
  { id: 'maracas', family: 'music' },
  { id: 'kite', family: 'long-board' },
  { id: 'umbrella' },
  { id: 'sun', family: 'star' },
];

// Colours for the colour-twins levels: five that a six-year-old names without thinking.
export const COLOURS = [
  { id: 'red', fill: '#ff3b30' },
  { id: 'blue', fill: '#2f6bff' },
  { id: 'green', fill: '#2fbf4a' },
  { id: 'yellow', fill: '#ffd21a' },
  { id: 'purple', fill: '#a64dff' },
];

// Pictures with one big main colour that can be swapped for any of COLOURS.
export const TINTABLE = [
  { id: 'crab' },
  { id: 'fish' },
  { id: 'flipflop' },
  { id: 'car' },
  { id: 'kite' },
  { id: 'octopus' },
  { id: 'surfboard' },
  { id: 'skate' },
];

// Buddies: two different pictures that go together. Only pairs a six-year-old gets at once.
// A family keeps two lookalike pairs out of one game (two brown faces, two long sticks).
export const BUDDY_PAIRS = [
  { a: 'pail', b: 'spade' },
  { a: 'turtle', b: 'egg' },
  { a: 'cone', b: 'scoop' },
  { a: 'key', b: 'chest' },
  { a: 'dog', b: 'bone', family: 'brown-face' },
  { a: 'monkey', b: 'banana', family: 'brown-face' },
  { a: 'bat', b: 'baseball', family: 'stick' },
  { a: 'rod', b: 'fish', family: 'stick' },
  { a: 'bee', b: 'honey' },
  { a: 'cloud', b: 'umbrella' },
  { a: 'rabbit', b: 'carrot' },
  { a: 'mouse', b: 'cheese' },
  { a: 'spider', b: 'web' },
];

// Every picture once, in sticker-album order: the library first, then the buddies' own.
export const ALBUM = (() => {
  const ids = LIBRARY.map((p) => p.id);
  for (const p of BUDDY_PAIRS) for (const id of [p.a, p.b]) if (!ids.includes(id)) ids.push(id);
  return ids;
})();
