import { pixelAnts } from './pixel-ants/index.js';

// Every game the launcher offers, in tile order. To add a game, give it its own folder
// here exporting { id, title, drawTile(ctx, x, y, w, h, time), create(host) }, where
// create returns { resize(w, h), update(dt), draw(ctx), onPickUp, onDrag, onDrop, onTap }
// and host.exit() goes back to the launcher.
export const games = [pixelAnts];
