// Every wall on the street, in order: the twelve murals to colour, then the free walls.
import { R, rect } from './kit.js';
import flamingo from './flamingo.js';
import gator from './gator.js';
import parrot from './parrot.js';
import palmSunset from './palm-sunset.js';
import rocket from './rocket.js';
import octopus from './octopus.js';
import iceCream from './ice-cream.js';
import dolphin from './dolphin.js';
import robot from './robot.js';
import dino from './dino.js';
import lighthouse from './lighthouse.js';
import riley from './riley.js';

export const MURAL_DEFS = [flamingo, gator, parrot, palmSunset, rocket, octopus, iceCream, dolphin, robot, dino, lighthouse, riley];

// A free wall is one big region (the wall itself, so the bucket paints the background).
export const FREE_DEFS = [1, 2, 3, 4].map((n) => ({ id: `free${n}`, free: true, items: [R(rect(0, 0, 600, 800))] }));

export const WALL_DEFS = [...MURAL_DEFS, ...FREE_DEFS];
