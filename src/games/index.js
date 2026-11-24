import { pixelAnts } from './pixel-ants/index.js';
import { stampede } from './stampede/index.js';
import { pelicanDash } from './pelican-dash/index.js';
import { flamingoGolf } from './flamingo-golf/index.js';
import { laterGator } from './later-gator/index.js';
import { hurricaneRiley } from './hurricane-riley/index.js';
import { bridgeBoss } from './bridge-boss/index.js';
import { turtleTide } from './turtle-tide/index.js';
import { bigCatch } from './big-catch/index.js';
import { postcardPuzzles } from './postcard-puzzles/index.js';
import { cargoCaptain } from './cargo-captain/index.js';
import { sunsetDrive } from './sunset-drive/index.js';
import { rooftopRunaway } from './rooftop-runaway/index.js';
import { sandcastleSmash } from './sandcastle-smash/index.js';
import { muralMaker } from './mural-maker/index.js';
import { swampBuggy } from './swamp-buggy/index.js';
import { dominoDash } from './domino-dash/index.js';
import { iggyHides } from './iggy-hides/index.js';
import { coconutShuffle } from './coconut-shuffle/index.js';
import { memoryBeach } from './memory-beach/index.js';
import { sockPuppet } from './sock-puppet/index.js';

// Every game the launcher offers, in tile order. To add a game, give it its own folder
// here exporting { id, title, drawTile(ctx, x, y, w, h, time), create(host) }, where
// create returns { resize(w, h), update(dt), draw(ctx), onPickUp, onDrag, onDrop, onTap }
// host.exit() goes back to the launcher, and host.canvas is the shared 2D canvas (a game
// may put its own canvas behind it and draw only its buttons and text on top).
export const games = [pixelAnts, stampede, pelicanDash, flamingoGolf, laterGator,
  hurricaneRiley, bridgeBoss,
  turtleTide, bigCatch,
  postcardPuzzles, cargoCaptain, sunsetDrive,
  rooftopRunaway,
  sandcastleSmash, muralMaker, swampBuggy,
  dominoDash, iggyHides,
  coconutShuffle, memoryBeach,
  sockPuppet,
];
