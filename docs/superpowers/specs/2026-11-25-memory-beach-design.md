# Memory Beach — Design

A game in Riley's Miami Mayhem: a pairs memory game. The cards are beach towels lying face down on the sand; tap one and it swings over (a real 3D turn) to show a postcard with a bold Miami picture. Find the two that match. Kind rules: no timer, no lives, no reading needed. Portrait, touch only, one finger. Also a two-player mode for Riley and Dad on one iPad.

## Cards and pictures

- **Back:** every card has the same striped towel (pink, orange, yellow, teal, white) with fringes and a sun badge.
- **Face:** a cream postcard with a dashed teal border and one picture filling most of it.
- **Pictures:** 66 code-drawn pictures, chunky shapes with thick ink outlines, each drawn in a 100 × 100 box so they scale to any card. The library (plain pairs and triples) has 43: flamingo, gator, pelican, manatee, dolphin, iguana, crab, sea turtle, parrot, toucan, octopus, jellyfish, starfish, clownfish, seahorse, pineapple, coconut, mango, ice cream, snow cone, Cuban sandwich, taco, watermelon, surfboard, beach ball, sunglasses, flip-flops, sandcastle, lighthouse, sailboat, speedboat, rocket, palm tree, hibiscus, conch, lifeguard tower, roller skate, convertible, conga drum, maracas, kite, beach umbrella and sun. The buddies add 23 more.
- **Lookalikes kept apart:** pictures that could be mixed up share a family (gator and iguana, dolphin and manatee, sailboat and speedboat, ice cream and snow cone, sandwich and taco, octopus and jellyfish, starfish and sun, lighthouse and rocket, sandcastle and lifeguard tower, conga and maracas, surfboard and kite, mango and watermelon). A game never deals two pictures from one family.

## Rules

- **A turn:** tap a face-down card and it turns over at once (on touch down). Tap a second one. If they match they stay face up, wiggle and get a gold glow and a star badge, sand sparkles burst out and a chime plays. If they don't, both stay up for 1 s, shake a little and turn back.
- **Tapping early:** tapping a new card while a miss is showing turns the two back straight away and turns the new card. Tapping one of the showing two just turns them back. Tapping a found card does nothing.
- **Groups:** every card belongs to a group and a turn matches when every card turned belongs to one group. What makes a group is the mode:
  - **Pairs:** two of the same picture.
  - **Buddies:** two different pictures that go together: pail and spade, mama turtle and a baby hatching from its egg, cone and scoop, key and treasure chest, dog and bone, monkey and banana, bat and baseball, fishing rod and fish, bee and honey pot, rain cloud and umbrella, rabbit and carrot, mouse and cheese, spider and web. Dog/monkey and bat/rod are kept out of the same game.
  - **Colour twins:** the same picture in the same colour. Eight pictures can be recoloured (crab, fish, flip-flops, car, kite, octopus, surfboard, roller skate) in red, blue, green, yellow or purple; each picture in a game comes in 2–3 of them, so a red crab is no twin for a blue crab.
  - **Triples:** three of the same picture. A wrong second card is a miss straight away.
- **Preview:** on early levels every card shows face up for a few seconds after the deal (4 s on levels 1–5, getting shorter, none from level 15), with a sand-timer bar and an eye above the board. Taps wait until it is over.
- **The seagull:** on gull levels, once, after a set number of turns and between turns, a cheeky gull flies in, picks up a face-down card, carries it over to another and drops it while that one slides across to take its place. It prefers cards that have been seen and always swaps two from different groups, so watching pays off. Hands off while it is busy (3.4 s).
- **The wave:** on wave levels a wave washes up the board to the row with the most face-down cards; they turn up for 2 s as a bonus look and turn back as it drains. It never matches anything for you.
- **Stars:** from misses (turns minus groups found). 3 stars for up to `groups + 1` misses (`groups × 2.5 + 1` for triples), 2 for up to `groups × 2.5 + 3` (`groups × 6.25 + 3` for triples); buddies and colour levels allow one more each; finishing always earns 1. Tuned with bots: one with perfect memory always gets 3, and one that holds only the last 8 cards it saw (about a careful six-year-old) gets 3 on at least 7 games in 10 on every level.
- **Finish:** 0.9 s after the last match the beach dims, confetti falls, "Hooray!" (or "WOW!" for 3 stars) and the stars pop in, then the stickers this game added spin in with NEW! tags (or a dancing crab if none). After 2 s: Next and Again.
- **Album:** the first time any picture is matched it becomes a sticker (both pictures of a buddy pair). A NEW! tag pops off the cards in play; the album shows the newest ones with NEW! tags until it is next closed, and the menu's album button has a NEW! tag while there are any. Stickers not yet found show as silhouettes.

## Levels

| # | Grid | Mode | Preview | Extra |
|---|---|---|---|---|
| 1 | 2×2 | pairs | 4 s | taught |
| 2 | 2×3 | pairs | 4 s | |
| 3 | 2×4 | pairs | 4 s | |
| 4 | 3×4 | pairs | 4 s | |
| 5 | 2×4 | buddies | 4 s | taught |
| 6 | 3×4 | pairs | 3.5 s | wave after 3 turns (taught) |
| 7 | 3×4 | colour (2 pictures × 3 colours) | 3.5 s | taught |
| 8 | 4×4 | pairs | 3 s | |
| 9 | 3×4 | buddies | 3 s | |
| 10 | 3×4 | pairs | 2.5 s | gull after 3 turns (taught) |
| 11 | 4×4 | colour (4 × 2) | 2 s | |
| 12 | 3×4 | triples | 2 s | taught |
| 13 | 4×5 | pairs | 1.5 s | wave every 4 turns, twice |
| 14 | 4×5 | buddies | 1 s | |
| 15 | 4×4 | pairs | — | gull after 4 turns |
| 16 | 4×5 | colour (5 × 2) | — | |
| 17 | 4×6 | triples | — | wave every 5 turns, twice |
| 18 | 5×6 | pairs | — | wave every 5 turns twice, gull after 6 |

Every play deals a fresh random set (a seed per play). Grids are never more than 5 across, so on a 390 × 844 phone every card stays at least 60 px wide (the 5×6 board is about 67 px); on the 820 × 1180 iPad the same board is about 135 px. The first level of each new idea opens with a looping picture demo before the deal (two crabs turning and matching; pail and spade with a heart; red + red crab ✓ and red + blue ✗; three suns; the gull carrying a card over another; a wave turning up a row) and a big play button. It shows until the level has been finished once.

## Two players

A second menu button (a turtle and a flamingo) opens a chooser with three boards shown as little grids: small 3×4, medium 4×5, big 5×6. Plain pairs, no preview. The bottom player is the teal turtle, the top player the pink flamingo (drawn upside down, for whoever sits across the iPad). Each player has a band along their edge with their mascot, their score and their pile: matched pairs fly into the pile of whoever found them. A match gives another go; a miss passes the turn when the cards turn back (or at once with an early tap). Whose turn is shown without words: their band lights up in their colour (the other dims), their mascot grows and bounces, the board gets a glowing border in their colour, and a big arrow in their colour points at them across the middle for a moment after every change. At the end the winner's mascot dances in a crown under confetti (both, for a tie), with a big Again button. Two-player games add to the album but not to the stars.

## Screens

- **Menu:** "MEMORY BEACH" over the sand and the sea, a little game of six cards playing itself, total stars, Play (the first open level without stars), Levels, the album (with a NEW! tag when there are fresh stickers), two players, and the home button back to the launcher.
- **Levels:** 18 cards with the number, the idea's picture (two starfish, pail and spade, red and blue crabs, three suns, a gull, a wave), a little grid for the board size and the best stars. A level opens once the one before has a star.
- **Stickers:** the album, 6 across, found stickers in colour (tap to wiggle) and the rest as silhouettes, with a count.
- **Play:** a strip of sea along the top with home, the level number, one shell per group (a star in each found one) and restart.

## Sound

Tiny synthesised sounds (Web Audio, unlocked by the first touch, silent without it): a flip tick, a three-note match chime, a soft miss, a two-note "new sticker", a gull squawk, a wave whoosh and a win jingle.

## Saved

`localStorage` under `memory-beach-progress` as `{ stars: [0–3 per level], album: [picture ids], fresh: [ids not yet seen in the album] }`. Bad data is ignored and storage errors are swallowed.

## Code

Under `src/games/memory-beach/`:

| File | Purpose |
|---|---|
| `catalog.js` | Pure data: the library with families, the colours, the recolourable pictures, the buddy pairs, the album order. |
| `levels.js` | The level table and the two-player boards. |
| `logic.js` | Pure, no DOM. Seeded dealing (family-aware), the turn state machine (flip, match, miss, look time, early taps, triples), preview, gull and wave, stars, two-player turns and scores, layout (play area, grid, card rects, slot under a finger), saved progress and album. |
| `bot.js` | Bots that play through `tapCard`/`tick`: perfect memory, limited memory (`span`), no memory, and early tapping. Used by the tests, the star tuning and `?debug` autoplay. |
| `pictures.js` | The 66 pictures, drawn through the ctx only, and `drawPicture`. |
| `draw.js` | Cached card faces and backs, the 3D turn (thin strips scaled for depth into a scratch canvas, shaded as they turn away, with a lift and a moving shadow), the board (deal-in, wiggles, glows, badges, two-player flights), the gull and wave, buttons, stickers, mode icons, teaching demos, confetti and the launcher tile (four cards playing a round). |
| `sound.js` | The synthesised sounds. |
| `index.js` | Menu, levels, album, two-player chooser, play, teaching panel, win screens, input, effects and saving. |

`?level=N` opens level N; `&seed=S` fixes the deal; `?two=small|medium|big` opens a two-player game. `?debug` exposes `window.__memory` (`state()`, `screen()`, `buttons()`, `progress()`, `layout()`, `card(i)` (a card's centre on screen), `level(n, seed)`, `two(size, seed)`, `goto(screen)`, `teaching()`, `skipTeach()`, `gull()`, `wave()`, `fastForward(sec)`, `autoplay(on, opts)`, `setProgress(p)`, `pictures()`, `sheet(px, ids, cols, card, colour)` for a contact sheet of pictures as a PNG).

`test/memory-beach.test.js` covers the catalogue (enough pictures, every one drawable with a stub ctx in every colour), dealing (grid filled, every picture the right number of times, seeded, families kept apart), the turn state machine (match, miss and look time, early third tap, tapping a showing card, taps during the deal and preview, winning), buddies, colour twins and triples, the gull (swaps different groups once, prefers seen cards, deal stays whole, hands off meanwhile) and the wave (fullest row, peeks and turns back, timing and count), stars, the bots (perfect memory finishes every level with 3 stars, no memory and early tapping still finish, an 8-card memory usually gets 3), two players (another go on a match, turn passing, early taps, winner), the album and saved progress including bad data, and the level table (grids fit both screens at 60 px or more, previews shrink, boards grow, every idea taught once where it first appears).

## Not built yet

Tuning by feel with Riley on a real iPad (preview lengths, look time, star limits, whether buddies need a hint). Real sound testing on iOS. A way to see which buddy goes with which in the album.
