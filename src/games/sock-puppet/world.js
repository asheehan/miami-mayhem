// The story world: every place, stock friend, found thing, problem, fix and ending the story
// cards offer, and the stage's backdrops and props. Pure data; pictures are in scenes.js and
// friends.js (keyed by these ids), words in story.js.
//
// noun: how a sentence names it, without an article ('grumpy gator', 'octopus'); story.js
// adds 'a' / 'an' / 'the'.

export const PLACES = [
  { id: 'beach', noun: 'beach', at: 'at the beach' },
  { id: 'pirate-ship', noun: 'pirate ship', at: 'on a pirate ship' },
  { id: 'space', noun: 'outer space', at: 'in outer space' },
  { id: 'jungle', noun: 'jungle', at: 'in the jungle' },
  { id: 'candy-land', noun: 'candy land', at: 'in candy land' },
  { id: 'under-sea', noun: 'bottom of the sea', at: 'under the sea' },
  { id: 'food-truck', noun: 'food truck', at: 'at the food truck' },
  { id: 'castle', noun: 'castle', at: 'in a castle' },
  { id: 'snowy-mountain', noun: 'snowy mountain', at: 'on a snowy mountain' },
  { id: 'dino-valley', noun: 'dinosaur valley', at: 'in dinosaur valley' },
];

// Stock friends. A friend can also be another puppet from the shelf ('p:<uid>').
export const FRIENDS = [
  { id: 'crab', noun: 'crab' },
  { id: 'robot', noun: 'robot' },
  { id: 'gator', noun: 'grumpy gator' },
  { id: 'dragon', noun: 'dragon' },
  { id: 'flamingo', noun: 'flamingo' },
  { id: 'octopus', noun: 'octopus' },
  { id: 'alien', noun: 'alien' },
  { id: 'penguin', noun: 'penguin' },
  { id: 'monkey', noun: 'monkey' },
  { id: 'manatee', noun: 'manatee' },
];

export const THINGS = [
  { id: 'treasure-chest', noun: 'treasure chest' },
  { id: 'magic-wand', noun: 'magic wand' },
  { id: 'giant-egg', noun: 'giant egg' },
  { id: 'balloons', noun: 'bunch of balloons' },
  { id: 'map', noun: 'treasure map' },
  { id: 'rubber-duck', noun: 'rubber duck' },
  { id: 'guitar', noun: 'guitar' },
  { id: 'pizza', noun: 'enormous pizza' },
  { id: 'kite', noun: 'kite' },
  { id: 'golden-key', noun: 'golden key' },
];

// effect: the overlay scenes.js draws on that page.
export const PROBLEMS = [
  { id: 'taco-rain', effect: 'taco-rain' },
  { id: 'lost-hat', effect: 'lost-hat' },
  { id: 'giant-wave', effect: 'giant-wave' },
  { id: 'hiccups', effect: 'hiccups' },
  { id: 'big-wind', effect: 'big-wind' },
  { id: 'stinky', effect: 'stinky' },
  { id: 'sticky-mud', effect: 'sticky-mud' },
  { id: 'lights-out', effect: 'lights-out' },
  { id: 'bouncy', effect: 'bouncy' },
  { id: 'runaway', effect: 'runaway' },
];

export const FIXES = [
  { id: 'silly-song', effect: 'notes' },
  { id: 'wiggle-dance', effect: 'dance' },
  { id: 'use-thing', effect: 'sparkles' },
  { id: 'big-hug', effect: 'hearts' },
  { id: 'tickles', effect: 'tickle' },
  { id: 'magic-words', effect: 'magic' },
  { id: 'whale-help', effect: 'whale' },
  { id: 'machine', effect: 'machine' },
  { id: 'sock-fan', effect: 'wind' },
  { id: 'bubble', effect: 'bubble' },
];

// scene: where the last page happens ('same' = the story's place).
export const ENDINGS = [
  { id: 'party', effect: 'confetti', scene: 'same' },
  { id: 'nap', effect: 'zzz', scene: 'same' },
  { id: 'fly-away', effect: 'hot-air-balloon', scene: 'sky' },
  { id: 'ice-cream', effect: 'ice-cream', scene: 'same' },
  { id: 'parade', effect: 'parade', scene: 'same' },
  { id: 'fireworks', effect: 'fireworks', scene: 'same' },
  { id: 'campfire', effect: 'campfire', scene: 'same' },
  { id: 'sail-home', effect: 'boat', scene: 'sea' },
  { id: 'disco', effect: 'disco', scene: 'same' },
  { id: 'picnic', effect: 'picnic', scene: 'same' },
];

// Extra scenes only endings use.
export const EXTRA_SCENES = ['sky', 'sea'];

// Story beats in order.
export const BEATS = ['place', 'friend', 'thing', 'problem', 'fix', 'ending'];

// The stage: backdrops (any place) and the props that can be dragged about.
export const STAGE_BACKDROPS = PLACES.map((p) => p.id);
export const STAGE_PROPS = ['treasure-chest', 'rubber-duck', 'balloons', 'pizza', 'guitar', 'giant-egg', 'palm', 'rock'];

// Poses a page can ask for. The puppet and every friend can be drawn in each.
export const POSES = ['wave', 'surprised', 'laugh', 'worried', 'cheer', 'sleep', 'dance', 'think'];
