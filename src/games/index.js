import { pixelAnts } from './pixel-ants/index.js';
import { stampede } from './stampede/index.js';
import { pelicanDash } from './pelican-dash/index.js';
import { flamingoGolf } from './flamingo-golf/index.js';
import { laterGator } from './later-gator/index.js';
import { hurricaneRiley } from './hurricane-riley/index.js';
import { bridgeBoss } from './bridge-boss/index.js';
import { turtleTide } from './turtle-tide/index.js';
import { bigCatch } from './big-catch/index.js';

// Every game the launcher offers, in tile order. To add a game, give it its own folder
// here exporting { id, title, drawTile(ctx, x, y, w, h, time), create(host) }, where
// create returns { resize(w, h), update(dt), draw(ctx), onPickUp, onDrag, onDrop, onTap }
// host.exit() goes back to the launcher, and host.canvas is the shared 2D canvas (a game
// may put its own canvas behind it and draw only its buttons and text on top).
export const games = [pixelAnts, stampede, pelicanDash, flamingoGolf, laterGator,
  hurricaneRiley, bridgeBoss,
  turtleTide, bigCatch,
];
