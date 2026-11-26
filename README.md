# AMR queue simulator · จำลองการจัดคิวหุ่นยนต์ AMR

Interactive single-page simulator comparing four dispatching methods for a fleet of Autonomous Mobile Robots (AMR):

1. **FIFO + nearest robot**
2. **Tiered tie-breaking rules**: ETA (±5 s) → battery → idle time → robot ID
3. **Weighted cost function**: adjustable weights for ETA, battery and idle time
4. **Hungarian-style batch assignment** (brute force, ≤ 6 robots)

## Features
- 4 hand-built test scenarios (single task, two tasks at once, low battery, urgent task)
- 6 maps: open floor, retail store, shopping mall, hotel floor, warehouse, factory. Each has walls or shelving, grid pathfinding (BFS) and pickup → drop-off tasks
- Monte Carlo mode: random task streams with common random numbers, 95% confidence intervals, robot count 2–6, 1–6 shared chargers with a nearest-charger queue
- Resource sweep: 3/4/5 robots × 1, 2 or N chargers

## Run
Open `index.html` in a browser. No build step or backend is required. `engine.js` is the same simulation engine as a Node module, for scripted experiments:

```bash
node -e "const E=require('./engine.js');console.log(E.metrics(E.runAll(E.SCEN[1],'hung')))"
```

## Assumptions
All numbers are illustrative: speed 1 m/s, 10 s service per stop, charging 1 %/s to 95 %, charge below 40 %. Robot-to-robot collisions, traffic and lifts are **not** modelled. Layouts are invented for experimentation and are not taken from any real site.
