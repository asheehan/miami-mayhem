// A striped lighthouse on the rocks at night. Comes alive: the beams sweep and the lamp
// glows.
import { R, D, rect, circle, cloud, blob, poly, spline, hills, svg, clip, star, line, inWall, all, crescent } from './kit.js';

const tower = poly([228, 664, 372, 664, 346, 268, 254, 268]);

export default {
  id: 'lighthouse',
  items: [
    R(rect(0, 0, 600, 800)),
    D([star(70, 300, 11, 4, 4), star(540, 60, 12, 5, 4), star(450, 380, 9, 4, 4), star(200, 60, 8, 3, 4), star(560, 330, 8, 3, 4)], { fill: '#ffffff', w: 3 }),
    R(crescent(110, 124, 54, 30, -18, 48)),
    R(all(poly([300, 205, 0, 128, 0, 300]), poly([300, 205, 600, 110, 600, 290])), { part: 'beams' }),
    R(cloud(470, 430, 170, 64)),
    R(hills(640, 12, 5)),
    D([spline([40, 700, 70, 692, 100, 700]), spline([500, 720, 530, 712, 560, 720])], { w: 4 }),
    R(all(inWall(blob([110, 830, 130, 700, 210, 648, 300, 634, 400, 648, 476, 702, 494, 830])), inWall(blob([440, 830, 470, 740, 540, 724, 590, 760, 600, 830])))),
    D([spline([170, 730, 200, 750]), spline([380, 700, 410, 730]), spline([520, 760, 540, 780])], { w: 4 }),
    R(tower),
    R(clip(tower, rect(0, 336, 600, 66))),
    R(clip(tower, rect(0, 470, 600, 66))),
    D([svg('M290 432 L290 414 Q300 402 310 414 L310 432 Z'), svg('M292 572 L292 554 Q300 544 308 554 L308 572 Z')], { fill: '#fff3a8', w: 4 }),
    R(svg('M274 664 L274 610 C274 580 326 580 326 610 L326 664 Z')),
    D(circle(316, 628, 4), { fill: 'ink', w: 0 }),
    R(svg('M260 246 L340 246 L340 168 L260 168 Z')),
    D([line([287, 168, 287, 246]), line([313, 168, 313, 246])], { w: 4 }),
    R(rect(228, 240, 144, 30, 6)),
    D([line([240, 240, 240, 220]), line([264, 240, 264, 220]), line([336, 240, 336, 220]), line([360, 240, 360, 220]), line([232, 220, 368, 220])], { w: 4 }),
    R(svg('M246 172 Q300 96 354 172 Z')),
    D(circle(300, 112, 9), { fill: 'ink', w: 0 }),
    D([spline([150, 230, 162, 220, 174, 230]), spline([174, 230, 186, 220, 198, 230]), spline([420, 300, 430, 292, 440, 300]), spline([440, 300, 450, 292, 460, 300])], { w: 4 }),
  ],
  alive: {
    parts: {
      beams: (t) => ({ r: Math.sin(t * 1.8) * 16, ox: 300, oy: 205 }),
    },
    fx: [{ type: 'glow', x: 300, y: 205, from: 0, to: 4.2 }],
  },
};
