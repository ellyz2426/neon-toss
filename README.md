# Neon Toss VR

Holodeck VR ring toss carnival game built with [IWSDK](https://iwsdk.dev) 0.4.1.

**[Play Live](https://ellyz2426.github.io/neon-toss/)**

## About

Throw glowing neon energy rings at an array of pegs in a holodeck arena. Rings must encircle pegs to score — miss and they bounce off or fall to the ground. Closer pegs are easier but worth less; the golden peg at the back is worth 100 points but fiendishly hard to ring.

First ring toss / carnival genre in the IWSDK portfolio.

## Features

- **9 scoring pegs** across 4 distance rows (10 / 25 / 50 / 100 points)
- **Ring physics**: torus flight with gravity, spin, peg bounce, and encirclement detection
- **8 game modes**: Classic, Speed, Target, Distance, Trick Shot, Daily Challenge, Survival, Practice
- **Combo scoring**: consecutive ringers build multiplier up to x10
- **40 achievements** with paginated viewer and localStorage persistence
- **8 ring skins** with gameplay-gated unlocks
- **5 holodeck arena themes**
- **XP/Level progression**: 50 levels, 20 player titles
- **15 PanelUI spatial panels** — zero HTML DOM overlays (all UI visible in XR)
- **Dual runtime**: VR (controller trigger/thumbstick) + browser (WASD + Space)
- **Procedural audio**: 12+ SFX types + arpeggiator + ambient drone
- **Particle effects**, aim guide trajectory, peg glow pulses
- **Daily Challenge** with date-seeded RNG
- **Career stats** dashboard, top-20 leaderboard, toast notifications

## Controls

### Browser
| Key | Action |
|-----|--------|
| A/D or Arrow keys | Aim left/right |
| Space (hold) | Charge throw power |
| Space (release) | Throw ring |
| ESC / P | Pause |
| R | Rematch (game over) |

### VR
| Input | Action |
|-------|--------|
| Right thumbstick | Aim |
| Right trigger (hold) | Charge throw |
| Right trigger (release) | Throw ring |
| B button | Pause |
| Laser pointer | Menu interaction |

## Scoring

| Row | Distance | Points |
|-----|----------|--------|
| Row 1 | Close (2m) | 10 pts |
| Row 2 | Medium (3m) | 25 pts |
| Row 3 | Far (4m) | 50 pts |
| Golden | Very Far (5m) | 100 pts |

Consecutive ringers build a combo multiplier: x1, x2, x3... up to x10.

## Game Modes

- **Classic**: Fixed ring count, highest score wins
- **Speed**: Timed mode, throw as many rings as possible
- **Target**: Ring highlighted pegs for 2x bonus
- **Distance**: Focus on far pegs for big scores
- **Trick Shot**: Land special trick throws for achievements
- **Daily Challenge**: Same seeded layout for everyone each day
- **Survival**: 3 misses and you're out
- **Practice**: Unlimited rings, no pressure

## Tech Stack

- IWSDK 0.4.1 + Vite
- All UI via PanelUI (.uikitml templates)
- Web Audio API (procedural)
- localStorage persistence
- GitHub Pages deployment

## Development

```bash
npm install
npm run dev    # Start dev server
npm run build  # Production build
```
