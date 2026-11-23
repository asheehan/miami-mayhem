// Every postcard, in album order. A scene is { id, place, draw(ctx, w, h) } and draws only
// through the ctx it is given, so it can be rendered at any size (and tested without a DOM).
import lifeguard from './lifeguard.js';
import oceanDrive from './ocean-drive.js';
import flamingos from './flamingos.js';
import lighthouse from './lighthouse.js';
import reef from './reef.js';
import cruise from './cruise.js';
import skyline from './skyline.js';
import everglades from './everglades.js';
import littleHavana from './little-havana.js';
import mural from './mural.js';
import fireworks from './fireworks.js';
import fruitStand from './fruit-stand.js';

export const SCENES = [
  lifeguard, oceanDrive, flamingos, lighthouse, reef, cruise,
  skyline, everglades, littleHavana, mural, fireworks, fruitStand,
];
