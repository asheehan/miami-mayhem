# Coconut Shuffle — Design

A game in Riley's Miami Mayhem: the classic follow-the-ball-under-the-cup game, Miami beach style. A cheeky little hermit crab hides under one of a row of coconut-shell halves on a striped beach towel; the shells lift to show where it is, drop, then shuffle; Riley taps the shell he thinks it's under. Right: the shell lifts and the crab dances. Wrong: that shell lifts empty with a gentle "nope", then the right one lifts to show where it was. No timer, no harsh failure, no reading needed. Portrait, touch only.

## The shuffle

- **Honest:** every round is generated from a seed as a list of steps, and the critter is tracked by those same steps. Every shell's position at every moment is worked out from the steps (`shufflePoses`), so what is drawn is the truth: no teleporting, no switching.
- **Swaps:** two shells change places along an oval round their midpoint, always exactly opposite each other, so they can never meet: one passes in front (bigger, lower on screen, drawn last), the other behind. Neighbours bow out 1.6 shell-depths; longer swaps bow out 2.7 so they clear the shells they pass. Sine easing in and out. Which shell takes the front is random per swap.
- **Table:** a flat field seen at an angle: depth shows at 0.62 and a shell at depth z grows by 1 + 0.0024 z. Shell footprints are ellipses 72 × 48; slots are 120 / 100 / 84 apart for 3 / 4 / 5 shells. Tests check no two footprints ever touch at any moment of any level (the closest is 2.13 against a limit of 2.0, in footprint units).
- **Fair choice:** about two thirds of swaps involve a shell with something under it, like a real hustler's would. A swap never repeats the one just before it.
- **Taps** only count once the shells have stopped. While showing and shuffling a big eye under the table looks left and right; a tap then shakes it. When it's time to tap it turns into a yellow pill with a pointing finger and soft rings pulse round every shell. A tap anywhere on a shell's dome (with a margin) picks it.

## Rounds, levels and stars

A round: shells lift (0.4 s), the critter waves for the level's show time (1–2 s), shells drop (0.4 s), a 0.45 s breath, the steps (with a gap of a third of a swap between), 0.3 s, then taps. A tap jiggles that shell with a drum roll (0.5 s), then it lifts. Right: the critter dances 1.7 s with "Yes!" and sparkles. Wrong: the empty shell lifts with a soft crossed circle; 1 s later the right one lifts too; both stay up 1.9 s. Then everything drops and the next round starts.

A level is 5 rounds. Stars: 5 right → 3, 4 → 2, 3 → 1 (passes); fewer → "So close!" with Again and Levels. A level opens once the one before has a star.

| # | Name | Shells | Swaps | s / swap | New |
|---|---|---|---|---|---|
| 1 | Slow and easy | 3 | 3 | 1.25 | neighbours only, 2 s look |
| 2 | One more | 3 | 4 | 1.15 | |
| 3 | Long way round | 3 | 5 | 1.05 | end shells can swap |
| 4 | Busy beach | 3 | 6 | 0.9 | |
| 5 | Quick hands | 3 | 7 | 0.75 | |
| 6 | Four shells | 4 | 6 | 0.8 | |
| 7 | Four and quick | 4 | 8 | 0.68 | |
| 8 | Five shells | 5 | 8 | 0.68 | |
| 9 | Double trouble | 5 | 8 | 0.66 | 3 double swaps (two pairs at once, never interleaved) |
| 10 | Sneaky crab | 4 | 8 | 0.62 | blue decoy crab |
| 11 | Fake out | 4 | 9 | 0.58 | 3 fake-outs |
| 12 | Round and round | 5 | 9 | 0.58 | shells in a ring; 4 spins |
| 13 | Palm leaf | 5 | 10 | 0.54 | the leaf; 2 doubles |
| 14 | Find the pink one | 5 | 10 | 0.52 | two critters |
| 15 | Shuffle master | 5 | 14 | 0.42 | doubles, fakes, decoy and leaf together |

`difficulty()` (steps per second × a factor for shells and twists) never drops more than 20% from one level to the next, and the last level is over 20 times the first.

## Twists

- **Decoy:** a blue crab runs in from the side (round the front of the shells) and dives under an empty shell, then later hops to another empty one; the two shells tip up to let it out and in. It is never under the real crab's shell. Tapping its shell is wrong and shows the blue crab.
- **Fake-out:** two shells start to swap (36% of the way round) and go back.
- **Ring:** the shells sit on an oval (150 × 72) with a dashed track; a spin turns the whole ring one place; swaps are between ring neighbours.
- **Palm leaf:** a big frond swings in over the middle of the table 0.45 s before one swap of the middle shell and away 0.45 s after; the outer shells stay in view. The shells under it still move truly.
- **Two critters:** both show at the start (the second is pink); once the shells stop, a bubble over the table shows which one to find, by picture. Tapping the other one is wrong.

## Extras

- **Peek:** once a level, while choosing, the magnifying-glass button makes the right shell wobble for 1.6 s.
- **Streak** ("how long can you go?", the flame button): opens once level 3 is passed. Endless rounds; each right answer turns it up a notch (swap time × 0.93 down to 0.34 s, more swaps up to 12, a fourth shell at 4, a fifth at 9, double swaps from 10, fake-outs from 14). A wrong answer still shows where it was, then ends the run kindly with the run and the best ever (a trophy, "NEW!" for a new best).
- **Closet:** shell skins (coconut, sand bucket at 6 stars, sun hat at 15, conch at 27) and critters (crab, turtle hatchling at 10, starfish at 20). Locked ones show the stars needed; a new unlock pops up on the level-complete screen.
- **Juice:** sand puffs under sliding shells, the critter crouching so its eyes peek out under a rising shell, sparkles on a right answer, confetti on a perfect level. Synthesised sounds (Web Audio, started by the first touch): a swish per slide, a thud as the shells drop, a drum roll, a ta-da, a soft two-note nope, a pop, a finish jingle.

## Saved

`localStorage` under `coconut-shuffle-progress` as `{ stars: [15 numbers], best, skin, critter }`; anything malformed reads as 0, and a skin or critter not yet earned reads as the coconut and the crab.

## Code

Under `src/games/coconut-shuffle/`:

| File | Purpose |
|---|---|
| `sim.js` | Pure. Tuning constants, seeded random, slot layout, the swap oval (`pairPos`), the shuffle generator, step timing, `shufflePoses` and `poses` (every shell, lift, wobble and critter now), rounds, taps, peek, stars, streak, projection and hit testing, progress. |
| `levels.js` | The level table, `difficulty()` and the easy limits for the first levels. |
| `draw.js` | Shell skins, critters, beach, towel, leaf, icons, buttons, the menu demo and the launcher tile (two coconuts swap, then the crab peeks out of the one it rode under). |
| `sound.js` | The synthesised sounds. |
| `index.js` | Menu, levels, closet, play, done screens, input, effects. |

`?level=N` starts level N. `?debug` exposes `window.__shuffle` (`state()`, `screen()`, `phase()`, `buttons()`, `view()`, `progress()`, `poses()`, `answer()`, `shellPoint(id)`, `rightPoint()`, `wrongPoint()`, `level(n, seed)`, `streak(seed)`, `goto(screen)`, `advance(sec)`, `toPhase(phase)`, `setProgress(p)`).

`test/coconut-shuffle.test.js` covers the generator (deterministic, the right number of each kind of step, valid swaps, the end matches tracking by hand), motion (arcs front and back, continuity at 240 fps, no touching ever, exact slots at rest), every twist, taps ignored while showing and shuffling, right and wrong reveals, hit testing, scoring and stars, peek, streak mode, the level table and saved progress.

## Not built yet

Tuning by feel on a real iPad with Riley (speeds, show times, whether level 4 is too big a step). Sounds were only checked for errors, not listened to.
