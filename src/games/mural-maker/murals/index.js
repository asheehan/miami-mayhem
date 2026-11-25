// Every wall on the street, in order: the murals to colour (twelve to a page), then the
// free walls.
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
import shark from './shark.js';
import seaTurtle from './sea-turtle.js';
import pirateShip from './pirate-ship.js';
import mermaid from './mermaid.js';
import crab from './crab.js';
import sandcastle from './sandcastle.js';
import monsterTruck from './monster-truck.js';
import raceCar from './race-car.js';
import unicorn from './unicorn.js';
import dragon from './dragon.js';
import astronaut from './astronaut.js';
import pizza from './pizza.js';
import manatee from './manatee.js';
import toucan from './toucan.js';
import lifeguardTower from './lifeguard-tower.js';
import hotAirBalloon from './hot-air-balloon.js';
import fireTruck from './fire-truck.js';
import digger from './digger.js';
import butterfly from './butterfly.js';
import puppy from './puppy.js';
import kitty from './kitty.js';
import cupcake from './cupcake.js';
import castle from './castle.js';
import submarine from './submarine.js';
import narwhal from './narwhal.js';
import whale from './whale.js';
import penguin from './penguin.js';
import lion from './lion.js';
import sloth from './sloth.js';
import owl from './owl.js';
import train from './train.js';
import airplane from './airplane.js';
import helicopter from './helicopter.js';
import garbageTruck from './garbage-truck.js';
import tractor from './tractor.js';
import donut from './donut.js';

export const MURAL_DEFS = [
  flamingo, gator, parrot, palmSunset, rocket, octopus, iceCream, dolphin, robot, dino, lighthouse, riley,
  shark, seaTurtle, pirateShip, mermaid, crab, sandcastle, monsterTruck, raceCar, unicorn, dragon, astronaut, pizza,
  manatee, toucan, lifeguardTower, hotAirBalloon, fireTruck, digger, butterfly, puppy, kitty, cupcake, castle, submarine,
  narwhal, whale, penguin, lion, sloth, owl, train, airplane, helicopter, garbageTruck, tractor, donut,
];

// A free wall is one big region (the wall itself, so the bucket paints the background).
export const FREE_DEFS = [1, 2, 3, 4].map((n) => ({ id: `free${n}`, free: true, items: [R(rect(0, 0, 600, 800))] }));

export const WALL_DEFS = [...MURAL_DEFS, ...FREE_DEFS];
