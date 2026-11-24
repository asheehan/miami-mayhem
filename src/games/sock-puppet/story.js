// The story maker. Pure: no DOM. Dealing the picture cards for each beat, turning the six
// picks (place, friend, thing, problem, fix, ending) and a seed into a short storybook (a
// title page and one page per beat, each with one or two short sentences and what to draw),
// and the bookshelf of finished stories (only the picks and the seed are kept).
import { PLACES, FRIENDS, THINGS, PROBLEMS, FIXES, ENDINGS, BEATS, POSES } from './world.js';
import { makeRng, pick, shuffled } from './rng.js';

export { BEATS };
export const CARDS_PER_BEAT = 4;
export const PAGE_MAX = 170; // characters per page, so it fits big on a phone
export const BOOKS_MAX = 24;

const byId = (list) => new Map(list.map((x) => [x.id, x]));
const PLACE = byId(PLACES);
const FRIEND = byId(FRIENDS);
const THING = byId(THINGS);
const PROBLEM = byId(PROBLEMS);
const FIX = byId(FIXES);
const ENDING = byId(ENDINGS);
const POOLS = { place: PLACES, friend: FRIENDS, thing: THINGS, problem: PROBLEMS, fix: FIXES, ending: ENDINGS };

// ---------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------

// 'a' or 'an' for a noun phrase, by its first sound.
export function article(noun) {
  const w = noun.trim().toLowerCase();
  if (/^(uni|use|one|eu)/.test(w)) return 'a';
  if (/^(hour|honest|honou?r)/.test(w)) return 'an';
  return /^[aeiou]/.test(w) ? 'an' : 'a';
}
export const withA = (noun) => `${article(noun)} ${noun}`;
export const possessive = (name) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Capitalises each sentence and tidies spaces.
export function tidy(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

// ---------------------------------------------------------------------------------------------
// The details that make each pick its own
// ---------------------------------------------------------------------------------------------

const PLACE_WORDS = {
  beach: { to: 'to the beach', bits: ['The sand was warm and the waves went swoosh.', 'Seagulls laughed and the sun was hot.', 'There were shells everywhere!'] },
  'pirate-ship': { to: 'onto a pirate ship', bits: ['Yo-ho-ho! The ship rocked on the waves.', 'The sails flapped and the deck went creak.', 'A flag waved at the very top.'] },
  space: { to: 'all the way to outer space', bits: ['The stars twinkled and the planets spun.', 'Everything floated, even the socks!', 'The moon said hello. Well, almost.'] },
  jungle: { to: 'deep into the jungle', bits: ['Parrots squawked in the tall, tall trees.', 'The leaves were as big as umbrellas.', 'Something went ooh-ooh-aah-aah!'] },
  'candy-land': { to: 'to candy land', bits: ['The trees were lollipops and the hills were gumdrops.', 'Everything smelled like strawberries.', 'Even the rocks were made of fudge!'] },
  'under-sea': { to: 'down under the sea', bits: ['Fish swam by and bubbles went blub-blub.', 'The seaweed wiggled hello.', 'It was very wet, even for a sock.'] },
  'food-truck': { to: 'to the food truck', bits: ['It smelled of tacos and sizzling treats.', 'The music was loud and the lights were bright.', 'The line was long, but nobody minded.'] },
  castle: { to: 'to a great big castle', bits: ['The towers were tall and the flags were flapping.', 'The door was big enough for a giant.', 'Trumpets went toot-toot!'] },
  'snowy-mountain': { to: 'up a snowy mountain', bits: ['It was so cold that their noses wiggled.', 'Snowflakes fell on everything.', 'The snow went crunch, crunch, crunch.'] },
  'dino-valley': { to: 'to dinosaur valley', bits: ['The ground went stomp, stomp, stomp.', 'A volcano puffed little clouds.', 'The ferns were taller than a bus.'] },
};

const FRIEND_WORDS = {
  crab: ['It went click-clack with its claws.', 'It walked sideways to say hello.'],
  robot: ['It said, "Beep boop, hello!"', 'Its lights blinked on and off.'],
  gator: ['It frowned, but it was very kind inside.', 'It said, "Hmph. Hello."'],
  dragon: ['It sneezed tiny sparks.', 'It was little, but its wings were big.'],
  flamingo: ['It stood on one leg to say hi.', 'It was pink from beak to toes.'],
  octopus: ['It waved all eight arms at once.', 'It gave out eight high-fives.'],
  alien: ['It came from a planet far away.', 'It had the friendliest antennae.'],
  penguin: ['It waddled over to say hello.', 'It slid along on its tummy.'],
  monkey: ['It did a cartwheel to say hi.', 'It was eating a banana.'],
  manatee: ['It was round and gentle and slow.', 'It blew a happy bubble.'],
};

const THING_WORDS = {
  'treasure-chest': { the: 'treasure chest', bits: ['It was full of shiny buttons.', 'It creaked when they lifted the lid.'], use: 'opened the treasure chest' },
  'magic-wand': { the: 'magic wand', bits: ['It went zing when it moved.', 'Little stars came out of the end.'], use: 'waved the magic wand' },
  'giant-egg': { the: 'giant egg', bits: ['It wobbled a little.', 'Something inside went tap, tap.'], use: 'tapped the giant egg and a helper hatched out' },
  balloons: { the: 'balloons', bits: ['They tugged up, up, up.', 'They were every colour of the rainbow.'], use: 'held on to the balloons' },
  map: { the: 'treasure map', bits: ['A big red X marked a secret spot.', 'It was a little bit soggy.'], use: 'followed the treasure map' },
  'rubber-duck': { the: 'rubber duck', bits: ['It said squeak!', 'It was yellow and very proud.'], use: 'squeezed the rubber duck' },
  guitar: { the: 'guitar', bits: ['It went strum, strum!', 'It had shiny strings.'], use: 'played the guitar' },
  pizza: { the: 'pizza', bits: ['It was bigger than a trampoline.', 'It smelled super yummy.'], use: 'shared the enormous pizza' },
  kite: { the: 'kite', bits: ['It had a long, wiggly tail.', 'It wanted to fly.'], use: 'flew the kite' },
  'golden-key': { the: 'golden key', bits: ['It sparkled in the sun.', 'What could it open?'], use: 'turned the golden key' },
};

// ---------------------------------------------------------------------------------------------
// Sentence templates: each a function of the story's words (c). Many per beat, so the same
// picks read differently with a different seed.
// ---------------------------------------------------------------------------------------------

const OPENINGS = [
  (c) => `One sunny morning, ${c.name} went ${c.placeTo}.`,
  (c) => `Once upon a time, ${c.name} went ${c.placeTo}.`,
  (c) => `One fine day, ${c.name} set off ${c.placeTo}.`,
  (c) => `Bright and early, ${c.name} zoomed off ${c.placeTo}.`,
  (c) => `One silly Saturday, ${c.name} hopped ${c.placeTo}.`,
  (c) => `${c.name} packed a snack and went ${c.placeTo}.`,
];

const MEETS = [
  (c) => `Then ${c.name} met ${c.aFriend}.`,
  (c) => `Who was there? It was ${c.aFriend}!`,
  (c) => `Then ${c.name} bumped into ${c.aFriend}.`,
  (c) => `Out popped ${c.aFriend}! "Hello!" said ${c.name}.`,
  (c) => `${c.name} made a new friend: ${c.aFriend}.`,
  (c) => `Guess who ${c.name} found? ${cap(c.aFriend)}!`,
];

const FINDS = [
  (c) => `Together they found ${c.aThing}.`,
  (c) => `Look! ${c.name} spotted ${c.aThing}.`,
  (c) => `Behind a big rock was ${c.aThing}!`,
  (c) => `${c.name} and ${c.theFriend} found ${c.aThing}.`,
  (c) => `Bonk! ${c.name} tripped over ${c.aThing}.`,
  (c) => `What was that? It was ${c.aThing}!`,
];

const PROBLEM_LINES = {
  'taco-rain': [
    () => 'Uh-oh! It started raining tacos! Plop, plop, PLOP!',
    (c) => `Suddenly, tacos fell from the sky! One landed on ${possessive(c.name)} head.`,
    () => 'Oh no! A big grey cloud began to rain crunchy tacos!',
  ],
  'lost-hat': [
    (c) => `Oh no! ${cap(c.theFriend)} lost their fancy hat!`,
    (c) => `Whoosh! ${cap(possessive(c.theFriend))} hat flew away!`,
    (c) => `${cap(c.theFriend)} looked sad. "Where is my hat?"`,
  ],
  'giant-wave': [
    () => 'Uh-oh! A giant wave came rolling in!',
    () => 'Splash! A wave as big as a house came whooshing along!',
    (c) => `Oh no! A huge wave rushed right at ${c.name}!`,
  ],
  hiccups: [
    (c) => `Oh no! ${cap(c.theFriend)} got the hiccups! Hic! Hic! HIC!`,
    (c) => `${c.name} could not stop hiccuping. Hic! Hic!`,
    (c) => `Hic! ${cap(c.theFriend)} had hiccups so big they bounced!`,
  ],
  'big-wind': [
    () => 'Whoosh! A great big wind blew everything around!',
    (c) => `Oh no! A huge wind tried to blow ${c.theThing} away!`,
    (c) => `Whoosh! The wind blew ${c.name} upside down!`,
  ],
  stinky: [
    () => 'Pee-yew! Something smelled very, very stinky!',
    () => 'Pee-yew! A big stinky smell floated by. Was it a sock?',
    (c) => `${cap(c.theFriend)} sniffed. "Something smells stinky!"`,
  ],
  'sticky-mud': [
    (c) => `Oh no! ${c.name} got stuck in sticky, gooey mud!`,
    (c) => `Squelch! ${c.name} and ${c.theFriend} were stuck in the mud!`,
    () => 'Uh-oh! The ground turned into sticky, squelchy mud!',
  ],
  'lights-out': [
    () => 'Uh-oh! All the lights went out. It was very dark!',
    (c) => `Click! Everything went dark. "Where are you?" said ${c.name}.`,
    () => 'Oh no! It got so dark that nobody could see a thing!',
  ],
  bouncy: [
    () => 'Boing! The ground turned bouncy and nobody could stand still!',
    (c) => `Boing, boing! ${c.name} bounced up and down and could not stop!`,
    () => 'Uh-oh! Everything started to bounce like jelly!',
  ],
  runaway: [
    (c) => `Oh no! ${cap(c.theThing)} ran away! Come back!`,
    (c) => `Zoom! ${cap(c.theThing)} rolled off all by itself!`,
    (c) => `Uh-oh! ${cap(c.theThing)} grew legs and ran away!`,
  ],
};

const FIX_LINES = {
  'silly-song': [
    (c) => `${c.name} sang a silly song: la-la-SOCK!`,
    (c) => `${c.name} and ${c.theFriend} sang the silliest song ever.`,
  ],
  'wiggle-dance': [
    (c) => `${c.name} did a wiggly-woggly dance.`,
    (c) => `${c.name} and ${c.theFriend} danced the wiggle-jiggle.`,
  ],
  'use-thing': [
    (c) => `${c.name} had an idea and ${c.useThing}.`,
    (c) => `Quick! ${c.name} ${c.useThing}.`,
  ],
  'big-hug': [
    (c) => `${c.name} gave ${c.theFriend} a big, squishy hug.`,
    (c) => `Everyone had a big, warm sock hug.`,
  ],
  tickles: [
    (c) => `${c.name} tickled ${c.theFriend} until they giggled.`,
    (c) => `${c.name} did a super tickle attack. Hee hee!`,
  ],
  'magic-words': [
    (c) => `${c.name} shouted the magic words: "Socka-wocka-BOOM!"`,
    (c) => `${c.name} said, "Abra-ca-SOCK!" and wiggled.`,
  ],
  'whale-help': [
    (c) => `A friendly whale came along to help ${c.name}.`,
    () => 'Splash! A big kind whale came to help.',
  ],
  machine: [
    (c) => `${c.name} built a whirly-twirly machine.`,
    (c) => `${c.name} and ${c.theFriend} built a clanky, honky machine.`,
  ],
  'sock-fan': [
    (c) => `${c.name} flapped and flapped like a fan.`,
    (c) => `${c.name} opened wide and blew a giant puff.`,
  ],
  bubble: [
    (c) => `${c.name} blew a giant bubble.`,
    (c) => `${c.name} blew the biggest bubble in the world.`,
  ],
};

const FIXED = {
  'taco-rain': [() => 'The taco rain stopped. Crunch, munch!', () => 'The tacos stopped falling, and everyone had lunch.'],
  'lost-hat': [(c) => `${cap(c.theFriend)} got their hat back!`, () => 'The hat came back, right on top.'],
  'giant-wave': [() => 'The wave turned into a tiny splash.', () => 'The giant wave went back to sea.'],
  hiccups: [() => 'The hiccups went away. No more hic!', () => 'And the hiccups stopped!'],
  'big-wind': [() => 'The wind calmed down to a soft breeze.', () => 'The wind said sorry and went away.'],
  stinky: [() => 'The stinky smell floated away.', () => 'Now everything smelled like flowers.'],
  'sticky-mud': [() => 'Schloop! They popped out of the mud.', () => 'The mud let go with a big POP!'],
  'lights-out': [() => 'The lights came back on. Hooray!', () => 'Everything was bright again.'],
  bouncy: [() => 'The ground stopped bouncing.', () => 'Boing, boing, and then it stopped.'],
  runaway: [(c) => `${cap(c.theThing)} came right back.`, (c) => `${cap(c.theThing)} said sorry and came home.`],
};

const LINKS = ['', 'It worked! ', 'And guess what? ', 'Ta-da! '];

const ENDING_LINES = {
  party: [
    (c) => `Then they had a party with cake and balloons. Hooray for ${c.name}!`,
    (c) => `${c.name} threw a big party, and everyone came!`,
  ],
  nap: [
    (c) => `All that fun made ${c.name} sleepy. Time for a cosy nap. Zzz.`,
    (c) => `${c.name} and ${c.theFriend} curled up for a nap. Snore!`,
  ],
  'fly-away': [
    (c) => `${c.name} and ${c.theFriend} flew away in a hot-air balloon. Bye-bye!`,
    (c) => `Up, up and away! ${c.name} floated home in a balloon.`,
  ],
  'ice-cream': [
    (c) => `Then ${c.name} and ${c.theFriend} ate giant ice creams. Yum!`,
    (c) => `Everyone had ice cream. ${c.name} had five scoops!`,
  ],
  parade: [
    (c) => `They had a big parade with drums and flags, led by ${c.name}!`,
    (c) => `Boom, boom! Everyone marched in ${possessive(c.name)} parade.`,
  ],
  fireworks: [
    (c) => `That night, fireworks went BOOM and sparkle for ${c.name}!`,
    () => 'Then the sky lit up with fireworks. Ooooh! Aaaah!',
  ],
  campfire: [
    (c) => `They sat by a campfire and ${c.name} told funny jokes.`,
    (c) => `${c.name} and ${c.theFriend} toasted marshmallows by the fire.`,
  ],
  'sail-home': [
    (c) => `${c.name} and ${c.theFriend} sailed home in a little boat.`,
    (c) => `${c.name} waved goodbye and sailed away into the sunset.`,
  ],
  disco: [
    (c) => `Then ${c.name} and ${c.theFriend} danced all night at a sock disco!`,
    (c) => `The disco lights came on, and ${c.name} danced and danced.`,
  ],
  picnic: [
    (c) => `They had a picnic with sandwiches. ${c.name} ate the crusts!`,
    (c) => `${c.name} and ${c.theFriend} had a yummy picnic.`,
  ],
};

const TITLES = [
  (c) => `${c.name} and the ${titleCase(c.thingThe)}`,
  (c) => `${possessive(c.name)} Big Adventure`,
  (c) => `${c.name} Saves the Day`,
];

const titleCase = (s) => s.replace(/\b[a-z]/g, (m) => m.toUpperCase());

// How many different ways each beat can read (for tests and the spec).
export const VARIANTS = {
  title: TITLES.length,
  place: OPENINGS.length * 4,
  friend: MEETS.length * 2,
  thing: FINDS.length * 3,
  problem: 3,
  fix: 2 * 2 * LINKS.length,
  ending: 2,
};

// ---------------------------------------------------------------------------------------------
// Poses and pictures for each page
// ---------------------------------------------------------------------------------------------

const PROBLEM_POSE = {
  'taco-rain': ['surprised', 'laugh'], 'lost-hat': ['worried', 'worried'], 'giant-wave': ['surprised', 'surprised'],
  hiccups: ['laugh', 'surprised'], 'big-wind': ['surprised', 'worried'], stinky: ['worried', 'laugh'],
  'sticky-mud': ['worried', 'worried'], 'lights-out': ['worried', 'surprised'], bouncy: ['cheer', 'surprised'],
  runaway: ['surprised', 'worried'],
};
const FIX_POSE = {
  'silly-song': 'laugh', 'wiggle-dance': 'dance', 'use-thing': 'cheer', 'big-hug': 'laugh', tickles: 'laugh',
  'magic-words': 'cheer', 'whale-help': 'surprised', machine: 'think', 'sock-fan': 'laugh', bubble: 'think',
};
const ENDING_POSE = {
  party: 'cheer', nap: 'sleep', 'fly-away': 'wave', 'ice-cream': 'laugh', parade: 'cheer', fireworks: 'surprised',
  campfire: 'laugh', 'sail-home': 'wave', disco: 'dance', picnic: 'laugh',
};

// ---------------------------------------------------------------------------------------------
// Dealing cards
// ---------------------------------------------------------------------------------------------

// The cards offered for a beat: CARDS_PER_BEAT ids from that beat's pool. For the friend
// beat, up to two of the other puppets on the shelf (ids 'p:<uid>') are in the deal too.
export function dealCards(beat, seed, shelfFriends = []) {
  const rng = makeRng((seed * 7919 + BEATS.indexOf(beat) * 104729 + 13) >>> 0);
  const pool = POOLS[beat];
  if (!pool) return [];
  const ids = shuffled(rng, pool.map((x) => x.id));
  if (beat !== 'friend' || !shelfFriends.length) return ids.slice(0, CARDS_PER_BEAT);
  const pals = shuffled(rng, shelfFriends).slice(0, 2).map((u) => `p:${u}`);
  return shuffled(rng, [...pals, ...ids.slice(0, CARDS_PER_BEAT - pals.length)]);
}

export const isPuppetFriend = (id) => typeof id === 'string' && /^p:[a-z0-9]{1,16}$/i.test(id);

// True if an id is a card this version knows for the beat.
export function validPick(beat, id) {
  if (beat === 'friend' && isPuppetFriend(id)) return true;
  const pool = POOLS[beat];
  return !!pool && pool.some((x) => x.id === id);
}

// ---------------------------------------------------------------------------------------------
// The storybook
// ---------------------------------------------------------------------------------------------

// picks: { place, friend, thing, problem, fix, ending }; who: { name, friendName } where
// friendName names a puppet friend. Returns { title, pages } with pages[0] the title page and
// then one page per beat: { beat, text, scene, pose, friendPose, effect, showFriend, showThing,
// thing, friend }.
export function makeStory(picks, seed, who = {}) {
  const name = (who.name || 'Noodle').trim() || 'Noodle';
  const puppetPal = isPuppetFriend(picks.friend);
  let palName = (who.friendName || 'Sock Pal').trim() || 'Sock Pal';
  if (puppetPal && palName.toLowerCase() === name.toLowerCase()) palName = `${palName} Two`;
  const friend = puppetPal ? null : FRIEND.get(picks.friend) || FRIENDS[0];
  const place = PLACE.get(picks.place) || PLACES[0];
  const thing = THING.get(picks.thing) || THINGS[0];
  const problem = PROBLEM.get(picks.problem) || PROBLEMS[0];
  const fix = FIX.get(picks.fix) || FIXES[0];
  const ending = ENDING.get(picks.ending) || ENDINGS[0];
  const tw = THING_WORDS[thing.id];
  const c = {
    name,
    placeTo: PLACE_WORDS[place.id].to,
    aFriend: puppetPal ? palName : withA(friend.noun),
    theFriend: puppetPal ? palName : `the ${friend.noun}`,
    aThing: withA(thing.noun),
    theThing: `the ${tw.the}`,
    thingThe: tw.the,
    useThing: tw.use,
  };
  const rng = makeRng((seed >>> 0) * 2654435761 + 1);
  const v = (list) => list[Math.floor(rng() * list.length) % list.length];
  const say = (...parts) => tidy(parts.filter(Boolean).join(' '));
  const friendBit = puppetPal
    ? v([`${palName} is a sock puppet too!`, `${palName} wiggled hello.`])
    : v(FRIEND_WORDS[friend.id]);
  // the hero's name in every page: a sentence that leaves it out gets a short tag
  const named = (text, oops = false) => {
    if (text.includes(name)) return text;
    const tags = oops ? [`"Oh no!" said ${name}.`, `${name} gasped.`, `"Uh-oh!" said ${name}.`] : [`"Wow!" said ${name}.`, `${name} giggled.`, `"Cool!" said ${name}.`];
    return `${text} ${v(tags)}`;
  };
  const scene = place.id;
  const endScene = ending.scene === 'same' ? scene : ending.scene;
  const [pp, fp] = PROBLEM_POSE[problem.id];
  const page = (beat, text, extra) => ({
    beat, text, scene, pose: 'wave', friendPose: 'wave', effect: null, showFriend: true, showThing: false,
    thing: thing.id, friend: picks.friend, ...extra,
  });
  const title = tidy(v(TITLES)(c));
  const pages = [
    page('title', title, { showFriend: false, pose: 'wave' }),
    page('place', named(say(v(OPENINGS)(c), v(PLACE_WORDS[place.id].bits))), { showFriend: false, pose: 'wave' }),
    page('friend', named(say(v(MEETS)(c), friendBit)), { pose: 'laugh', friendPose: 'wave' }),
    page('thing', named(say(v(FINDS)(c), v(tw.bits))), { pose: 'surprised', friendPose: 'surprised', showThing: true }),
    page('problem', named(v(PROBLEM_LINES[problem.id])(c), true), { pose: pp, friendPose: fp, effect: problem.effect, showThing: problem.id === 'big-wind' }),
    page('fix', named(say(v(FIX_LINES[fix.id])(c), v(LINKS) + v(FIXED[problem.id])(c))), {
      pose: FIX_POSE[fix.id], friendPose: fix.id === 'wiggle-dance' ? 'dance' : 'cheer', effect: fix.effect, showThing: fix.id === 'use-thing',
    }),
    page('ending', named(v(ENDING_LINES[ending.id])(c)), {
      scene: endScene, pose: ENDING_POSE[ending.id], friendPose: ENDING_POSE[ending.id], effect: ending.effect, ending: true,
    }),
  ];
  return { title, pages };
}

// What a page says aloud (the last page adds "The end!").
export function spokenText(page) {
  return page.ending ? `${page.text} The end!` : page.text;
}

// ---------------------------------------------------------------------------------------------
// The bookshelf
// ---------------------------------------------------------------------------------------------
//
// A book: { id, u: hero puppet uid, f: friend puppet's name when the friend is a puppet,
//           k: [place, friend, thing, problem, fix, ending], s: seed, t: when made }

export function bookFromPicks(picks, seed, { id, uid, friendName = '', time = 0 }) {
  const b = { id, u: uid, k: BEATS.map((beat) => picks[beat]), s: seed >>> 0, t: time };
  if (isPuppetFriend(picks.friend)) b.f = String(friendName).slice(0, 16);
  return b;
}

export const picksOf = (book) => Object.fromEntries(BEATS.map((beat, i) => [beat, book.k[i]]));

// Adds a book, keeping at most `max` (the oldest go first). Returns the new list.
export function addBook(books, book, max = BOOKS_MAX) {
  const all = [...books.filter((b) => b.id !== book.id), book];
  all.sort((a, b) => a.t - b.t);
  return all.slice(Math.max(0, all.length - max));
}

// A book from saved data, or null if this version can't tell the story.
export function decodeBook(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.k) || raw.k.length !== BEATS.length) return null;
  if (typeof raw.id !== 'string' || raw.id.length > 24 || typeof raw.u !== 'string' || raw.u.length > 16) return null;
  if (!BEATS.every((beat, i) => validPick(beat, raw.k[i]))) return null;
  const b = { id: raw.id, u: raw.u, k: raw.k.slice(), s: Number.isFinite(raw.s) ? raw.s >>> 0 : 1, t: Number.isFinite(raw.t) ? raw.t : 0 };
  if (typeof raw.f === 'string') b.f = raw.f.slice(0, 16);
  return b;
}

export { POSES };
