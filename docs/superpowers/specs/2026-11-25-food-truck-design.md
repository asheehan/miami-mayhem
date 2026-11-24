# Food Truck Chef — Design

A cooking game in Riley's Miami Mayhem. Riley runs a food truck parked on the beach: funny customers walk up to the window one at a time with a picture bubble of what they want, Riley cooks it with hands-on one-finger steps at a close-up station, drags it across the counter, and the customer munches, grins and pays. Orders are pictures only (no reading). Nothing can be failed: wrong things bounce back, over-cooking makes a comic burnt version that still serves, and a customer who runs out of patience just shrugs off. Portrait, touch only, single finger.

## The window

- The play area is seen from inside the truck: the awning edge along the top, the beach outside (sun, sea, a pastel lifeguard tower, a palm), the steel counter, and the kitchen below with six dish tiles (dishes not met yet are locked).
- **Customers** (busts behind the counter): a pelican in a bucket hat and life vest, a gator in a flowery shirt, a surfer, an abuela with round glasses and a bun, a flamingo with a lei, and a kid in a backwards cap. Moods: waiting (blinking), munching (chewing, crumbs), love (heart eyes, floating hearts), yum (closed eyes, licking, "mmm" squiggles), no (head shake, frown), shrug (sad brows, hands up, a sweat drop).
- **Bubbles** show each dish wanted as its finished picture with a strip of ingredient pictures below (in order where order matters; repeats shown as repeats, so "3 pepperoni" is three pepperonis); a "no" request is a crossed-out picture. A badge shows cooking / ready / done per dish.
- Tap a picture (or the glowing kitchen tile) to open that dish's station. Backing out keeps the dish in progress for that order; opening another dish replaces it.
- A finished dish shows off for 1.1 s, then sits on the counter; drag it onto the customer. The wrong customer shakes their head (the dish slides back and takes a slip). A bin at the end of the counter takes unwanted dishes.
- **Hints:** after 5 s idle (2.5 s on day 1) a finger shows the next step: the bubble to tap, the dish to drag, the bin that glows at a station, the button to hold, or where to carry the food.

## Stations

Each is a full-screen close-up with the order card pinned in the top-left corner, ingredient bowls along the bottom (about 67 px across on a 390 px phone, up to 84 units on the iPad), a bin top-right to start the dish again, and drops that snap within 46 units. Carried things are drawn above the finger.

| Dish | Steps |
|---|---|
| Smoothie | Drag the pictured fruit (mango, strawberry, banana, pineapple, by count) into the blender. Hold the big button: the fruit whirls and the colour mixes, a bar fills (3.2 s); let go in the green (0.50–0.86). Over-blending pops the lid and splats it. Drag the jar to the cup to pour, then add the straw (and the umbrella if pictured). |
| Ice cream | Tap the tubs in the pictured order to stack scoops on the cone; then the cherry (drag) and sprinkles (rub the shaker over the scoops) if pictured. |
| Taco | Drag the tortilla, then the pictured filling and toppings (beef/chicken, lettuce, tomato, cheese, avocado, hot sauce) in any order. |
| Cuban sandwich | Drag bread, ham, pork, cheese, pickles onto the board strictly in order (minus any "no"), drag it into the press, then hold the press handle until the bar is green (3.6 s bar). Too long: dark grill marks and a smoke puff, still served. |
| Fried | Drop the pictured number of empanadas, tostones or churros into the oil. Each colours from pale to golden (ding and a sparkle at 3.5 s) to dark (10 s, smoking). Drag a piece out: a pale one plops back in. Then rub on cinnamon sugar (churros) or salt (tostones); empanadas need nothing. |
| Pizza | Rub sauce over the dough, rub cheese, drag toppings by count, drag the pizza into the oven, and pull it out once golden (4.5 s, ding) before it burns (12 s). A "no cheese" pizza skips the cheese. |

With an order, a wrong ingredient (or one too many, or the wrong tool) bounces back with a boing, shakes its bowl and the order card, and counts as a slip.

## Days

| Day | Customers | New |
|---|---|---|
| 1 | 4 | Smoothies of one or two different fruits, straw only |
| 2 | 4 | Ice cream |
| 3 | 5 | Tacos |
| 4 | 5 | Cuban sandwich |
| 5 | 5 | Fried things |
| 6 | 6 | Bigger orders (more fruit, scoops, toppings, pieces) |
| 7 | 6 | "No …" requests (crossed-out pictures) |
| 8 | 6 | Patience hearts (120 s per dish) |
| 9 | 7 | Pizza |
| 10 | 7 | Two-dish orders |
| 11 | 7 | Rush: two customers at the window |
| 12 | 8 | Party: everything, biggest orders |

Orders come from a seeded generator, only from dishes met so far, and the first customer of a day always shows that day's new thing. Patience drains only while nobody is cooking for that customer (or holding their dish on the counter); at zero they shrug and walk off.

## Scoring, coins and the shop

- **Dish points:** 3, minus 1 if over-done, minus 1 for 2+ slips (never below 1). A customer scores the mean of their dishes, or 0 if they left.
- **Stars per day** from the mean over customers: ≥ 2.5 → 3, ≥ 1.5 → 2, else 1. Finishing a day always earns a star.
- **Coins:** 2 per dish served plus a 1 coin tip per perfect dish. Coins fly up to the counter in the top bar.
- **Shop** (cosmetic, prices as coin pictures): awnings in teal 6, lime 8, sunset 10, purple 12 (pink is free; tap an owned awning to put it up), flower boxes 10, a neon sign with a smoothie and a taco 15, string lights 20, a surfboard on the roof 25, a disco ball 35, a parrot mascot 45. Bought things show on the truck outside (menu, shop, day-complete) and from inside the window (lights, disco ball and its coloured spots, parrot, flowers).

## Free kitchen

Open from the start. No customers: a hungry gator in a chef's hat waits at the window. Tap any dish tile, make anything (each station adds silly extras: pickles, hot sauce and chocolate in the blender, banana on ice cream, and so on; piles up to 12), and drag the food onto the gator's picture in the corner at any stage. He reacts for 3.2 s:

| Reaction | When |
|---|---|
| Yuck (green face, tongue out, shudder) | pickles in anything sweet, or raw dough |
| Fire breath (bigger with more squirts) | hot sauce |
| Brain freeze (blue, icicles, ice cube, shivers) | four or more scoops, or ice cream in a smoothie |
| Sooty cough (smoke rings) | anything burnt |
| Huge burp (shock rings) | eight or more things |
| Rainbow | every fruit, or every flavour |
| Love (hearts) | a proper dish, cooked right |
| Yum | anything else |

## Screens

Menu (title over the beach and the decorated truck, Day N, Kitchen, 1 2 3, Shop, coins and stars, home to the launcher); day picker (3 × 4 cards with the day's new thing, stars, locks; a day opens once the day before has a star); play; day complete (confetti, "Hooray!" or "WOW!", stars popping in, the truck, coins counting up, then Next and Again); shop.

## Code

Under `src/games/food-truck/`:

| File | Purpose |
|---|---|
| `recipes.js` | Pure. Ingredients, dishes, bins and free-kitchen extras, the order generator per dish, dish matching. |
| `days.js` | Pure. The day table and the seeded day generator. |
| `stations.js` | Pure. Tuning and the six station state machines: `add`, `grabTool`, `rub`, `setHold`, `moveTo`, `pullOut`, `restart`, `stepStation`, `takeDish`, `stationHint`. |
| `sim.js` | Pure. A day at the window (customers, patience, serving, scoring, coins), progress and the shop, the free kitchen and the gator's reactions. |
| `bot.js` | Pure. A tidy chef and a sloppy chef that cook through the station actions. |
| `layout.js` | Pure. Where everything sits, shared by drawing and touch. |
| `draw-food.js`, `draw-folks.js`, `draw-stations.js`, `draw.js` | Drawing: food and ingredients; customers and the gator chef; the station close-ups; buttons, beach, truck, window, bubbles and the launcher tile. |
| `sound.js` | Small WebAudio sounds (pop, boing, blender whirr, sizzle, ding, coin, "mmm", fire, brr, burp), started after a touch. |
| `index.js` | Screens, touch input, juice and saved progress. |

Saved under `food-truck-progress` as `{ stars: [12], coins, owned, awning }`; anything malformed reads as a fresh start. `?level=N` starts day N. `?debug` exposes `window.__chef` (`state()`, `screen()`, `progress()`, `day(n)`, `free()`, `goto(name)`, `coins(n)`, `autoplay(on)`, `hint()`, `advance(s)`, `where(name)` for screen positions) and `?debug&gallery` shows every ingredient and dish.

`test/food-truck.test.js` covers every station's rules and timing windows (under, green, over), counts, order generation per day, matching and scoring, stars, patience, coins, the shop, progress parsing, the gator's reactions, the day table, and a tidy bot getting 3 stars and a sloppy bot at least 1 on every day.

## Not built yet

Tuning by feel on a real iPad: the bar timings, fry and bake windows, rub distances and patience at the top of `stations.js` and in `days.js`.
