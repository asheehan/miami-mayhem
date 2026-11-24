// The buggies in the garage. The differences are kept mild so every one is fun on every level.
//   engine    m/s^2 of push at a standstill (fades to nothing at top speed)
//   topSpeed  m/s on flat ground
//   wheelR    wheel radius (m)
//   restLen   strut length with no load (m); minExt/maxExt are the ends of its travel
//   springK / springC   strut spring and damping, per wheel
//   air       how strongly the pedals tilt it in the air (1 = normal)
//   wade      how much mud and water slow it (1 = normal, less is better)
//   price     coins to buy it, or stars: stars needed to earn it
//   look      colours for drawing
export const BUGGIES = [
  {
    id: 'hopper', name: 'Swamp Hopper', price: 0,
    engine: 11, topSpeed: 14, wheelR: 0.58, restLen: 0.75, minExt: 0.22, maxExt: 0.88, springK: 300, springC: 18,
    air: 1, wade: 1,
    look: { body: '#47c25a', dark: '#2a8a3e', trim: '#ffd23f', hub: '#ff7a2f', cage: '#3a3550', helmet: '#ff5a3c' },
  },
  {
    id: 'taxi', name: 'Taxi Zoomer', price: 60,
    engine: 11.5, topSpeed: 15, wheelR: 0.58, restLen: 0.75, minExt: 0.22, maxExt: 0.86, springK: 330, springC: 20,
    air: 1, wade: 1,
    look: { body: '#ffcc1f', dark: '#d99a00', trim: '#2b2633', hub: '#e8e8f4', cage: '#2b2633', helmet: '#3a7bff', checks: true },
  },
  {
    id: 'fanboat', name: 'Fan Boat', price: 150,
    engine: 11, topSpeed: 14, wheelR: 0.6, restLen: 0.75, minExt: 0.22, maxExt: 0.9, springK: 300, springC: 18,
    air: 1.2, wade: 0.5,
    look: { body: '#2fb5e8', dark: '#1a7fae', trim: '#ffffff', hub: '#ff3d9a', cage: '#3a3550', helmet: '#ffd23f', fan: true },
  },
  {
    id: 'bouncer', name: 'Big Bouncer', price: 250,
    engine: 11, topSpeed: 13.5, wheelR: 0.78, restLen: 0.85, minExt: 0.22, maxExt: 1.02, springK: 270, springC: 15,
    air: 1, wade: 0.8,
    look: { body: '#a05cf0', dark: '#6e35b8', trim: '#3fe07a', hub: '#ffd23f', cage: '#2b2633', helmet: '#3fe07a', flames: true },
  },
  {
    id: 'golden', name: 'Golden Gator', stars: 30,
    engine: 12, topSpeed: 15, wheelR: 0.6, restLen: 0.75, minExt: 0.22, maxExt: 0.88, springK: 310, springC: 18,
    air: 1.15, wade: 0.8,
    look: { body: '#ffc93c', dark: '#c98a12', trim: '#2a8a3e', hub: '#47c25a', cage: '#6b4a1a', helmet: '#47c25a', gold: true },
  },
];
