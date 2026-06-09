import {
  World, PanelUI, Follower, FollowBehavior, ScreenSpace, PanelDocument, UIKitDocument,
  Mesh, Group, BoxGeometry, SphereGeometry, CylinderGeometry, TorusGeometry,
  ConeGeometry, PlaneGeometry, RingGeometry, OctahedronGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Quaternion, Euler, Matrix4,
  Fog, AmbientLight, PointLight, DirectionalLight, SpotLight,
  BufferGeometry, Float32BufferAttribute,
  EdgesGeometry, LineSegments, Line,
  AdditiveBlending, DoubleSide, FrontSide,
  Object3D,
} from '@iwsdk/core';

// ============================================================
// TYPES & CONSTANTS
// ============================================================

type GameState = 'title' | 'modeSelect' | 'difficulty' | 'playing' | 'paused' |
  'gameOver' | 'leaderboard' | 'achievements' | 'settings' | 'stats' |
  'skins' | 'help' | 'countdown';

type GameMode = 'classic' | 'speed' | 'target' | 'distance' | 'trick' | 'daily' | 'survival' | 'practice';
type Difficulty = 'easy' | 'medium' | 'hard';

interface PegDef {
  x: number; z: number; height: number; points: number; radius: number;
}

interface RingSkin {
  name: string; color: string; emissive: string; glow: string;
  unlock: string; condition: (s: SaveData) => boolean;
}

interface Theme {
  name: string; grid: string; accent: string; bg: string;
  fog: string; wall: string; peg: string; ring: string; glow: string;
}

interface Achievement {
  id: string; name: string; desc: string;
}

interface LeaderEntry {
  score: number; mode: string; difficulty: string; rings: number;
  accuracy: number; date: string;
}

interface SaveData {
  highScores: LeaderEntry[];
  achievements: string[];
  stats: {
    gamesPlayed: number; totalScore: number; bestScore: number;
    totalRings: number; totalHits: number; totalMisses: number;
    bestCombo: number; trickShotsLanded: number;
    ringerCount: number; doubleRingerCount: number;
    perfectGames: number; modesPlayed: string[];
    skinsUsed: string[]; themesUsed: string[];
    totalPlayTime: number;
  };
  settings: {
    masterVol: number; sfxVol: number; musicVol: number;
    theme: number; difficulty: Difficulty;
  };
  skin: number;
  xp: number; level: number;
  dailyStreak: number; lastDaily: string;
}

// Peg layouts - distance from player increases with row
const PEG_LAYOUTS: PegDef[][] = [
  // Row 1 - close (3 pegs)
  [
    { x: -0.4, z: -2.0, height: 0.35, points: 10, radius: 0.04 },
    { x: 0.0, z: -2.0, height: 0.35, points: 10, radius: 0.04 },
    { x: 0.4, z: -2.0, height: 0.35, points: 10, radius: 0.04 },
  ],
  // Row 2 - medium (3 pegs)
  [
    { x: -0.3, z: -3.0, height: 0.4, points: 25, radius: 0.035 },
    { x: 0.15, z: -3.0, height: 0.4, points: 25, radius: 0.035 },
    { x: 0.5, z: -3.0, height: 0.4, points: 25, radius: 0.035 },
  ],
  // Row 3 - far (2 pegs)
  [
    { x: -0.2, z: -4.0, height: 0.45, points: 50, radius: 0.03 },
    { x: 0.3, z: -4.0, height: 0.45, points: 50, radius: 0.03 },
  ],
  // Row 4 - very far (1 golden peg)
  [
    { x: 0.0, z: -5.0, height: 0.5, points: 100, radius: 0.025 },
  ],
];

const ALL_PEGS = PEG_LAYOUTS.flat();

const THEMES: Theme[] = [
  { name: 'Neon Holodeck', grid: '#00ffff', accent: '#00ffff', bg: '#050510', fog: '#050510', wall: '#001a1a', peg: '#00cccc', ring: '#00ffff', glow: '#00ffff' },
  { name: 'Crimson Arena', grid: '#ff3344', accent: '#ff3344', bg: '#100505', fog: '#100505', wall: '#1a0000', peg: '#cc2233', ring: '#ff3344', glow: '#ff3344' },
  { name: 'Toxic Neon', grid: '#33ff33', accent: '#33ff33', bg: '#051005', fog: '#051005', wall: '#001a00', peg: '#22cc22', ring: '#33ff33', glow: '#33ff33' },
  { name: 'Ultra Violet', grid: '#aa33ff', accent: '#aa33ff', bg: '#0a0510', fog: '#0a0510', wall: '#0a001a', peg: '#8822cc', ring: '#aa33ff', glow: '#aa33ff' },
  { name: 'Solar Blaze', grid: '#ff8800', accent: '#ff8800', bg: '#100805', fog: '#100805', wall: '#1a0a00', peg: '#cc6600', ring: '#ff8800', glow: '#ff8800' },
];

const RING_SKINS: RingSkin[] = [
  { name: 'Neon Cyan', color: '#00ffff', emissive: '#00aaaa', glow: '#00ffff', unlock: 'Default', condition: () => true },
  { name: 'Solar Flare', color: '#ff8800', emissive: '#aa5500', glow: '#ff8800', unlock: '50 ringers', condition: s => s.stats.ringerCount >= 50 },
  { name: 'Plasma Pink', color: '#ff33aa', emissive: '#aa2277', glow: '#ff33aa', unlock: '5K score', condition: s => s.stats.bestScore >= 5000 },
  { name: 'Frost Ring', color: '#88ccff', emissive: '#5588aa', glow: '#88ccff', unlock: '10 games', condition: s => s.stats.gamesPlayed >= 10 },
  { name: 'Toxic Green', color: '#33ff33', emissive: '#22aa22', glow: '#33ff33', unlock: 'x5 combo', condition: s => s.stats.bestCombo >= 5 },
  { name: 'Royal Gold', color: '#ffcc00', emissive: '#aa8800', glow: '#ffcc00', unlock: 'Perfect game', condition: s => s.stats.perfectGames >= 1 },
  { name: 'Void Purple', color: '#8833ff', emissive: '#5522aa', glow: '#8833ff', unlock: '80% accuracy', condition: s => s.stats.totalRings > 0 && (s.stats.totalHits / s.stats.totalRings) >= 0.8 },
  { name: 'Inferno', color: '#ff2200', emissive: '#aa1100', glow: '#ff2200', unlock: 'All modes', condition: s => s.stats.modesPlayed.length >= 7 },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_ringer', name: 'First Ringer!', desc: 'Land your first ring on a peg' },
  { id: 'ten_ringers', name: 'Getting Good', desc: 'Land 10 total ringers' },
  { id: 'fifty_ringers', name: 'Ring Master', desc: 'Land 50 total ringers' },
  { id: 'hundred_ringers', name: 'Toss Legend', desc: 'Land 100 total ringers' },
  { id: 'five_hundred', name: 'Ring Lord', desc: 'Land 500 total ringers' },
  { id: 'score_500', name: 'Half Grand', desc: 'Score 500+ in a single game' },
  { id: 'score_1k', name: 'Grand Master', desc: 'Score 1,000+ in a single game' },
  { id: 'score_5k', name: 'Score Emperor', desc: 'Score 5,000+ in a single game' },
  { id: 'score_10k', name: 'Score God', desc: 'Score 10,000+ in a single game' },
  { id: 'combo_3', name: 'Triple Streak', desc: 'Get a 3x combo' },
  { id: 'combo_5', name: 'Hot Streak', desc: 'Get a 5x combo' },
  { id: 'combo_8', name: 'On Fire', desc: 'Get an 8x combo' },
  { id: 'combo_10', name: 'Unstoppable', desc: 'Get a 10x combo' },
  { id: 'golden_ringer', name: 'Golden Shot', desc: 'Ring the 100-point golden peg' },
  { id: 'double_ringer', name: 'Double Ringer', desc: 'Ring 2 pegs with one throw' },
  { id: 'accuracy_80', name: 'Sharpshooter', desc: '80%+ accuracy in a game' },
  { id: 'accuracy_100', name: 'Perfect Aim', desc: '100% accuracy in a game (5+ rings)' },
  { id: 'perfect_game', name: 'Flawless', desc: 'Ring every throw in Classic mode' },
  { id: 'speed_10', name: 'Speed Tosser', desc: 'Ring 10 pegs in Speed mode' },
  { id: 'distance_50', name: 'Long Distance', desc: 'Score 50-pointer from far row' },
  { id: 'distance_100', name: 'Sniper', desc: 'Ring the 100-point golden peg' },
  { id: 'daily_done', name: 'Daily Player', desc: 'Complete a Daily Challenge' },
  { id: 'daily_3', name: 'Dedicated', desc: '3-day daily streak' },
  { id: 'daily_7', name: 'Weekly Warrior', desc: '7-day daily streak' },
  { id: 'survival_30', name: 'Survivor', desc: 'Last 30 seconds in Survival' },
  { id: 'survival_60', name: 'Endurance', desc: 'Last 60 seconds in Survival' },
  { id: 'trick_3', name: 'Show Off', desc: 'Land 3 trick shots' },
  { id: 'trick_all', name: 'Trickster', desc: 'Land all 6 trick shots' },
  { id: 'games_10', name: 'Regular', desc: 'Play 10 games' },
  { id: 'games_50', name: 'Veteran', desc: 'Play 50 games' },
  { id: 'games_100', name: 'Obsessed', desc: 'Play 100 games' },
  { id: 'all_modes', name: 'Explorer', desc: 'Play every game mode' },
  { id: 'fashionista', name: 'Fashionista', desc: 'Use 3 different ring skins' },
  { id: 'theme_all', name: 'Theme Tourist', desc: 'Use all 5 arena themes' },
  { id: 'lv_10', name: 'Rising Star', desc: 'Reach level 10' },
  { id: 'lv_25', name: 'Expert', desc: 'Reach level 25' },
  { id: 'lv_50', name: 'Grandmaster', desc: 'Reach level 50' },
  { id: 'total_10k', name: 'Career 10K', desc: 'Accumulate 10,000 total score' },
  { id: 'total_50k', name: 'Career 50K', desc: 'Accumulate 50,000 total score' },
  { id: 'bounce_ringer', name: 'Lucky Bounce', desc: 'Ring a peg after bouncing off another' },
];

const XP_TITLES = [
  'Novice', 'Rookie', 'Apprentice', 'Tosser', 'Thrower',
  'Pitcher', 'Hurler', 'Lobber', 'Slinger', 'Ringer',
  'Sharpshooter', 'Marksman', 'Sniper', 'Expert', 'Ace',
  'Master', 'Champion', 'Legend', 'Titan', 'Omega',
];

const TRICK_SHOTS = [
  { id: 'eyes_closed', name: 'Blind Toss', desc: 'Ring without aim guide' },
  { id: 'max_power', name: 'Power Pitch', desc: 'Ring at max power' },
  { id: 'min_power', name: 'Soft Touch', desc: 'Ring at minimum power' },
  { id: 'far_golden', name: 'Golden Snipe', desc: 'Ring the golden peg from back' },
  { id: 'double', name: 'Double Ring', desc: 'Ring 2 pegs in one toss' },
  { id: 'triple_row', name: 'Row Clear', desc: 'Ring all pegs in one row during a game' },
];

// ============================================================
// SAVE DATA MANAGEMENT
// ============================================================

function defaultSave(): SaveData {
  return {
    highScores: [],
    achievements: [],
    stats: {
      gamesPlayed: 0, totalScore: 0, bestScore: 0,
      totalRings: 0, totalHits: 0, totalMisses: 0,
      bestCombo: 0, trickShotsLanded: 0,
      ringerCount: 0, doubleRingerCount: 0,
      perfectGames: 0, modesPlayed: [],
      skinsUsed: [], themesUsed: [],
      totalPlayTime: 0,
    },
    settings: { masterVol: 0.8, sfxVol: 0.8, musicVol: 0.5, theme: 0, difficulty: 'medium' },
    skin: 0, xp: 0, level: 1,
    dailyStreak: 0, lastDaily: '',
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem('neon-toss-save');
    if (raw) {
      const s = JSON.parse(raw);
      const d = defaultSave();
      return { ...d, ...s, stats: { ...d.stats, ...s.stats }, settings: { ...d.settings, ...s.settings } };
    }
  } catch {}
  return defaultSave();
}

function saveSave(s: SaveData) {
  try { localStorage.setItem('neon-toss-save', JSON.stringify(s)); } catch {}
}

// ============================================================
// SEEDED RNG
// ============================================================

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ============================================================
// AUDIO ENGINE
// ============================================================

class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  droneOscs: OscillatorNode[] = [];
  arpOsc: OscillatorNode | null = null;
  arpGain: GainNode | null = null;
  arpIdx = 0;
  arpInterval: any = null;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
  }

  setVolumes(master: number, sfx: number, music: number) {
    if (!this.ctx) return;
    this.masterGain!.gain.value = master;
    this.sfxGain!.gain.value = sfx;
    this.musicGain!.gain.value = music;
  }

  playTone(freq: number, type: OscillatorType, dur: number, vol = 0.3, detune = 0) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.sfxGain!);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  playSfx(name: string, pitch = 1.0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const p = pitch * (0.95 + Math.random() * 0.1);
    switch (name) {
      case 'throw': {
        this.playTone(220 * p, 'triangle', 0.3, 0.2);
        this.playTone(330 * p, 'sine', 0.2, 0.1);
        break;
      }
      case 'ringer': {
        // Satisfying ascending arpeggio
        this.playTone(440 * p, 'sine', 0.4, 0.3);
        setTimeout(() => this.playTone(554 * p, 'sine', 0.3, 0.25), 80);
        setTimeout(() => this.playTone(659 * p, 'sine', 0.3, 0.25), 160);
        setTimeout(() => this.playTone(880 * p, 'triangle', 0.4, 0.2), 240);
        break;
      }
      case 'miss': {
        this.playTone(200 * p, 'sawtooth', 0.3, 0.15);
        this.playTone(150 * p, 'sawtooth', 0.4, 0.1);
        break;
      }
      case 'bounce': {
        this.playTone(600 * p, 'square', 0.08, 0.15);
        this.playTone(400 * p, 'triangle', 0.1, 0.1);
        break;
      }
      case 'golden': {
        this.playTone(880 * p, 'sine', 0.5, 0.3);
        setTimeout(() => this.playTone(1108 * p, 'sine', 0.4, 0.25), 100);
        setTimeout(() => this.playTone(1318 * p, 'sine', 0.4, 0.25), 200);
        setTimeout(() => this.playTone(1760 * p, 'triangle', 0.5, 0.2), 300);
        setTimeout(() => this.playTone(2200 * p, 'sine', 0.3, 0.15), 400);
        break;
      }
      case 'combo': {
        const base = 440 + save.stats.bestCombo * 30;
        this.playTone(base * p, 'triangle', 0.2, 0.2);
        setTimeout(() => this.playTone(base * 1.25 * p, 'triangle', 0.2, 0.15), 60);
        break;
      }
      case 'countdown': {
        this.playTone(440 * p, 'sine', 0.15, 0.2);
        break;
      }
      case 'go': {
        this.playTone(880 * p, 'sine', 0.3, 0.3);
        this.playTone(1100 * p, 'triangle', 0.2, 0.2);
        break;
      }
      case 'click': {
        this.playTone(660 * p, 'sine', 0.05, 0.15);
        this.playTone(880 * p, 'sine', 0.05, 0.1);
        break;
      }
      case 'achievement': {
        [660, 770, 880, 990, 1100].forEach((f, i) => {
          setTimeout(() => this.playTone(f * p, 'sine', 0.3, 0.2), i * 80);
        });
        break;
      }
      case 'levelup': {
        [440, 554, 659, 880, 1100, 1318].forEach((f, i) => {
          setTimeout(() => this.playTone(f * p, 'triangle', 0.25, 0.2), i * 60);
        });
        break;
      }
      case 'land': {
        this.playTone(120 * p, 'sine', 0.15, 0.1);
        // Noise burst
        if (this.ctx) {
          const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
          const src = this.ctx.createBufferSource();
          const g = this.ctx.createGain();
          src.buffer = buf;
          g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          src.connect(g); g.connect(this.sfxGain!);
          src.start(t);
        }
        break;
      }
      case 'charge': {
        this.playTone(110 * p, 'sine', 0.8, 0.05);
        break;
      }
      case 'gameStart': {
        [440, 554, 659, 880].forEach((f, i) => {
          setTimeout(() => this.playTone(f * p, 'triangle', 0.25, 0.2), i * 100);
        });
        break;
      }
      case 'gameOver': {
        [659, 554, 440, 330].forEach((f, i) => {
          setTimeout(() => this.playTone(f * p, 'triangle', 0.3, 0.2), i * 120);
        });
        break;
      }
    }
  }

  startMusic() {
    if (!this.ctx) return;
    this.stopMusic();
    // Ambient drone
    const bass = this.ctx.createOscillator();
    const bassG = this.ctx.createGain();
    bass.type = 'sine'; bass.frequency.value = 55;
    bassG.gain.value = 0.08;
    bass.connect(bassG); bassG.connect(this.musicGain!);
    bass.start();

    const pad = this.ctx.createOscillator();
    const padG = this.ctx.createGain();
    pad.type = 'triangle'; pad.frequency.value = 82.5;
    padG.gain.value = 0.05;
    pad.connect(padG); padG.connect(this.musicGain!);
    pad.start();

    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine'; sub.frequency.value = 110;
    subG.gain.value = 0.04;
    sub.connect(subG); subG.connect(this.musicGain!);
    sub.start();

    // LFO for pad
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.15;
    lfoG.gain.value = 0.02;
    lfo.connect(lfoG); lfoG.connect(padG.gain);
    lfo.start();

    this.droneOscs = [bass, pad, sub, lfo];

    // Arpeggiator
    const arp = this.ctx.createOscillator();
    const aG = this.ctx.createGain();
    arp.type = 'sine'; arp.frequency.value = 220;
    aG.gain.value = 0.02;
    arp.connect(aG); aG.connect(this.musicGain!);
    arp.start();
    this.arpOsc = arp; this.arpGain = aG;
    const notes = [220, 261, 293, 329, 349, 392, 440];
    this.arpIdx = 0;
    this.arpInterval = setInterval(() => {
      if (this.arpOsc) {
        this.arpOsc.frequency.value = notes[this.arpIdx % notes.length];
        this.arpIdx++;
        if (this.arpGain) {
          this.arpGain.gain.setValueAtTime(0.025, this.ctx!.currentTime);
          this.arpGain.gain.exponentialRampToValueAtTime(0.005, this.ctx!.currentTime + 0.4);
        }
      }
    }, 500);
  }

  stopMusic() {
    this.droneOscs.forEach(o => { try { o.stop(); } catch {} });
    this.droneOscs = [];
    if (this.arpOsc) { try { this.arpOsc.stop(); } catch {} this.arpOsc = null; }
    if (this.arpInterval) { clearInterval(this.arpInterval); this.arpInterval = null; }
  }
}

// ============================================================
// PARTICLE POOL
// ============================================================

interface Particle {
  mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; active: boolean;
}

class ParticlePool {
  particles: Particle[] = [];
  parent: Object3D;
  constructor(parent: Object3D, count: number) {
    this.parent = parent;
    const geo = new SphereGeometry(0.008, 4, 4);
    for (let i = 0; i < count; i++) {
      const mat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, blending: AdditiveBlending });
      const m = new Mesh(geo, mat);
      m.visible = false;
      parent.add(m);
      this.particles.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, active: false });
    }
  }

  emit(x: number, y: number, z: number, count: number, color: string, speed = 2, life = 0.6) {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      if (spawned >= count) break;
      p.mesh.position.set(x, y, z);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const s = speed * (0.5 + Math.random() * 0.5);
      p.vx = Math.sin(phi) * Math.cos(theta) * s;
      p.vy = Math.sin(phi) * Math.sin(theta) * s * 0.5 + 1.0;
      p.vz = Math.cos(phi) * s;
      p.life = life * (0.8 + Math.random() * 0.4);
      p.maxLife = p.life;
      p.active = true;
      p.mesh.visible = true;
      (p.mesh.material as MeshBasicMaterial).color.set(color);
      (p.mesh.material as MeshBasicMaterial).opacity = 1;
      spawned++;
    }
  }

  update(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 3 * dt; // gravity
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const alpha = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = alpha;
    }
  }
}

// ============================================================
// MAIN GAME
// ============================================================

let save = loadSave();
const audio = new AudioManager();

async function main() {
  const container = document.getElementById('app') as HTMLDivElement;

  const world = await World.create(container, {
    xr: { offer: 'once' as any },
    input: { canvasPointerEvents: true },
    features: {
      grabbing: true,
      locomotion: false,
      physics: false,
      spatialUI: true,
    },
  });

  audio.init();
  audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol);
  audio.startMusic();

  const theme = () => THEMES[save.settings.theme];
  const skinDef = () => RING_SKINS[save.skin];

  // ============================================================
  // ENVIRONMENT
  // ============================================================

  // Fog
  world.scene.fog = new Fog(theme().bg, 5, 20);
  world.scene.background = new Color(theme().bg);

  // Lighting
  const ambient = new AmbientLight(0x222233, 0.4);
  world.scene.add(ambient);
  const dirLight = new DirectionalLight(0xffffff, 0.3);
  dirLight.position.set(2, 5, 1);
  world.scene.add(dirLight);

  const accentLight1 = new PointLight(theme().accent, 0.6, 10);
  accentLight1.position.set(-2, 3, -3);
  world.scene.add(accentLight1);
  const accentLight2 = new PointLight(theme().accent, 0.4, 10);
  accentLight2.position.set(2, 3, -4);
  world.scene.add(accentLight2);

  // Neon grid floor
  const gridGroup = new Group();
  const gridMat = new LineBasicMaterial({ color: theme().grid, transparent: true, opacity: 0.2 });
  for (let i = -10; i <= 10; i++) {
    const pts1 = [new Vector3(i, 0, -10), new Vector3(i, 0, 10)];
    const pts2 = [new Vector3(-10, 0, i), new Vector3(10, 0, i)];
    const g1 = new BufferGeometry().setFromPoints(pts1);
    const g2 = new BufferGeometry().setFromPoints(pts2);
    gridGroup.add(new Line(g1, gridMat));
    gridGroup.add(new Line(g2, gridMat));
  }
  world.scene.add(gridGroup);

  // Grid ceiling
  const ceilGroup = new Group();
  ceilGroup.position.y = 4;
  for (let i = -10; i <= 10; i++) {
    const pts1 = [new Vector3(i, 0, -10), new Vector3(i, 0, 10)];
    const pts2 = [new Vector3(-10, 0, i), new Vector3(10, 0, i)];
    const g1 = new BufferGeometry().setFromPoints(pts1);
    const g2 = new BufferGeometry().setFromPoints(pts2);
    ceilGroup.add(new Line(g1, gridMat.clone()));
    ceilGroup.add(new Line(g2, gridMat.clone()));
  }
  world.scene.add(ceilGroup);

  // Floating decorations
  const decoGroup = new Group();
  const decoGeo = [
    new TorusGeometry(0.3, 0.05, 8, 16),
    new BoxGeometry(0.3, 0.3, 0.3),
    new SphereGeometry(0.2, 8, 8),
    new ConeGeometry(0.15, 0.4, 6),
  ];
  for (let i = 0; i < 14; i++) {
    const geo = decoGeo[i % 4];
    const mat = new MeshBasicMaterial({
      color: theme().accent, wireframe: true, transparent: true, opacity: 0.15,
    });
    const m = new Mesh(geo, mat);
    m.position.set(
      (Math.random() - 0.5) * 12,
      1 + Math.random() * 2.5,
      -3 + (Math.random() - 0.5) * 10,
    );
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    (m as any)._rotSpeed = 0.2 + Math.random() * 0.3;
    (m as any)._bobOffset = Math.random() * Math.PI * 2;
    (m as any)._bobSpeed = 0.3 + Math.random() * 0.3;
    (m as any)._baseY = m.position.y;
    decoGroup.add(m);
  }
  world.scene.add(decoGroup);

  // Ambient floating particles
  const ambientParticles: Mesh[] = [];
  const apGeo = new SphereGeometry(0.01, 4, 4);
  for (let i = 0; i < 40; i++) {
    const mat = new MeshBasicMaterial({ color: theme().accent, transparent: true, opacity: 0.3, blending: AdditiveBlending });
    const m = new Mesh(apGeo, mat);
    m.position.set(
      (Math.random() - 0.5) * 14,
      0.5 + Math.random() * 3,
      (Math.random() - 0.5) * 14,
    );
    (m as any)._vx = (Math.random() - 0.5) * 0.1;
    (m as any)._vy = (Math.random() - 0.5) * 0.05;
    (m as any)._phase = Math.random() * Math.PI * 2;
    world.scene.add(m);
    ambientParticles.push(m);
  }

  // Particle pool
  const particles = new ParticlePool(world.scene, 150);

  // ============================================================
  // PEG FIELD
  // ============================================================

  const pegMeshes: { mesh: Group; def: PegDef; glowMesh: Mesh }[] = [];

  function buildPegs() {
    // Clear old
    pegMeshes.forEach(p => world.scene.remove(p.mesh));
    pegMeshes.length = 0;

    for (const def of ALL_PEGS) {
      const g = new Group();

      // Base disc
      const baseMat = new MeshStandardMaterial({
        color: def.points >= 100 ? '#ffcc00' : theme().peg,
        emissive: def.points >= 100 ? '#aa8800' : theme().peg,
        emissiveIntensity: 0.5,
        metalness: 0.7, roughness: 0.3,
      });
      const base = new Mesh(new CylinderGeometry(def.radius * 3, def.radius * 3, 0.02, 16), baseMat);
      g.add(base);

      // Peg cylinder
      const pegMat = new MeshStandardMaterial({
        color: def.points >= 100 ? '#ffcc00' : theme().peg,
        emissive: def.points >= 100 ? '#ffaa00' : theme().peg,
        emissiveIntensity: 0.8,
        metalness: 0.8, roughness: 0.2,
      });
      const peg = new Mesh(new CylinderGeometry(def.radius, def.radius, def.height, 12), pegMat);
      peg.position.y = def.height / 2;
      g.add(peg);

      // Wireframe edges
      const edges = new LineSegments(
        new EdgesGeometry(peg.geometry),
        new LineBasicMaterial({ color: def.points >= 100 ? '#ffee88' : theme().glow, transparent: true, opacity: 0.4 })
      );
      edges.position.copy(peg.position);
      g.add(edges);

      // Tip sphere
      const tip = new Mesh(
        new SphereGeometry(def.radius * 1.5, 8, 8),
        new MeshStandardMaterial({
          color: def.points >= 100 ? '#ffcc00' : theme().peg,
          emissive: def.points >= 100 ? '#ffaa00' : theme().peg,
          emissiveIntensity: 1.0,
          metalness: 0.5, roughness: 0.3,
        })
      );
      tip.position.y = def.height;
      g.add(tip);

      // Glow sphere
      const glowMat = new MeshBasicMaterial({
        color: def.points >= 100 ? '#ffcc00' : theme().glow,
        transparent: true, opacity: 0.15, blending: AdditiveBlending,
      });
      const glow = new Mesh(new SphereGeometry(def.radius * 4, 8, 8), glowMat);
      glow.position.y = def.height / 2;
      g.add(glow);

      // Score label (point light to hint value)
      if (def.points >= 50) {
        const pl = new PointLight(def.points >= 100 ? '#ffcc00' : theme().accent, 0.3, 1.5);
        pl.position.y = def.height + 0.1;
        g.add(pl);
      }

      g.position.set(def.x, 0, def.z);
      world.scene.add(g);
      pegMeshes.push({ mesh: g, def, glowMesh: glow });
    }
  }
  buildPegs();

  // ============================================================
  // THROWING PLATFORM
  // ============================================================

  // Throw line marker
  const throwLine = new Mesh(
    new BoxGeometry(1.5, 0.005, 0.02),
    new MeshBasicMaterial({ color: theme().accent, transparent: true, opacity: 0.6 })
  );
  throwLine.position.set(0, 0.005, -0.5);
  world.scene.add(throwLine);

  // ============================================================
  // RING CREATION & PHYSICS
  // ============================================================

  interface FlyingRing {
    group: Group;
    vx: number; vy: number; vz: number;
    rx: number; rz: number; // angular velocity for tumble
    active: boolean;
    landed: boolean;
    landedOnPeg: PegDef | null;
    bounced: boolean; // track if it bounced off a peg before landing
    age: number;
    trail: Vector3[];
  }

  const flyingRings: FlyingRing[] = [];
  const landedRings: Group[] = [];

  function createRingMesh(): Group {
    const g = new Group();
    const skin = skinDef();

    // Main ring torus
    const ringMat = new MeshStandardMaterial({
      color: skin.color, emissive: skin.emissive,
      emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.3,
    });
    const ring = new Mesh(new TorusGeometry(0.08, 0.015, 8, 24), ringMat);
    ring.rotation.x = Math.PI / 2; // flat orientation
    g.add(ring);

    // Wireframe
    const edges = new LineSegments(
      new EdgesGeometry(ring.geometry),
      new LineBasicMaterial({ color: skin.glow, transparent: true, opacity: 0.5 })
    );
    edges.rotation.x = Math.PI / 2;
    g.add(edges);

    // Glow
    const glowMat = new MeshBasicMaterial({
      color: skin.glow, transparent: true, opacity: 0.2, blending: AdditiveBlending,
    });
    const glow = new Mesh(new TorusGeometry(0.08, 0.03, 8, 24), glowMat);
    glow.rotation.x = Math.PI / 2;
    g.add(glow);

    return g;
  }

  function throwRing(power: number, aimX: number, aimY: number) {
    const ring = createRingMesh();
    // Start from player position
    ring.position.set(aimX * 0.3, 1.2, -0.3);
    world.scene.add(ring);

    const speed = 3 + power * 5; // 3-8 m/s forward
    const upSpeed = 2 + power * 2; // arc

    const fr: FlyingRing = {
      group: ring,
      vx: aimX * 1.5,
      vy: upSpeed,
      vz: -speed,
      rx: (Math.random() - 0.5) * 3,
      rz: (Math.random() - 0.5) * 2,
      active: true,
      landed: false,
      landedOnPeg: null,
      bounced: false,
      age: 0,
      trail: [],
    };
    flyingRings.push(fr);
    audio.playSfx('throw');
    gameRingsThrown++;
  }

  // Trail rendering
  const trailMat = new LineBasicMaterial({
    color: skinDef().glow, transparent: true, opacity: 0.3, blending: AdditiveBlending,
  });
  const trailLines: Line[] = [];

  function updateRingPhysics(dt: number) {
    for (const fr of flyingRings) {
      if (!fr.active) continue;
      fr.age += dt;

      // Gravity
      fr.vy -= 6.0 * dt;

      // Update position
      fr.group.position.x += fr.vx * dt;
      fr.group.position.y += fr.vy * dt;
      fr.group.position.z += fr.vz * dt;

      // Tumble rotation
      fr.group.rotation.x += fr.rx * dt;
      fr.group.rotation.z += fr.rz * dt;

      // Trail
      fr.trail.push(fr.group.position.clone());
      if (fr.trail.length > 25) fr.trail.shift();

      // Check peg collision (ring encirclement)
      for (const peg of pegMeshes) {
        const dx = fr.group.position.x - peg.def.x;
        const dz = fr.group.position.z - peg.def.z;
        const dist2D = Math.sqrt(dx * dx + dz * dz);
        const ringY = fr.group.position.y;

        // Ring must be at peg height and within encirclement distance
        if (dist2D < 0.12 && ringY > 0 && ringY < peg.def.height + 0.1 && fr.vy < 0) {
          // Check if ring is descending and close enough to encircle
          if (dist2D < 0.06) {
            // Direct hit on peg body - bounce
            fr.vx += dx * 3;
            fr.vz += dz * 3;
            fr.vy *= -0.3;
            fr.bounced = true;
            audio.playSfx('bounce');
          } else if (dist2D < 0.12 && ringY < peg.def.height - 0.05) {
            // Ring is sliding down around the peg - RINGER!
            fr.active = false;
            fr.landed = true;
            fr.landedOnPeg = peg.def;

            // Settle ring on peg
            fr.group.position.set(peg.def.x, 0.05, peg.def.z);
            fr.group.rotation.set(Math.PI / 2, 0, 0); // flat
            landedRings.push(fr.group);

            onRinger(peg.def, fr.bounced);
            break;
          }
        }

        // Near-miss peg bounce (ring hits peg from side)
        if (dist2D < peg.def.radius + 0.08 + 0.015 && ringY > 0 && ringY < peg.def.height) {
          // Bounce off peg
          const nx = dx / dist2D;
          const nz = dz / dist2D;
          const dot = fr.vx * nx + fr.vz * nz;
          if (dot < 0) { // approaching
            fr.vx -= 2 * dot * nx * 0.6;
            fr.vz -= 2 * dot * nz * 0.6;
            fr.vy *= 0.7;
            fr.bounced = true;
            audio.playSfx('bounce');
          }
        }
      }

      // Floor hit
      if (fr.group.position.y < 0.02 && fr.active) {
        fr.active = false;
        fr.landed = true;
        if (!fr.landedOnPeg) {
          onMiss();
          // Remove after delay
          setTimeout(() => {
            world.scene.remove(fr.group);
          }, 1000);
        }
        audio.playSfx('land');
      }

      // Out of bounds
      if (fr.group.position.z < -8 || fr.group.position.y < -2 ||
        Math.abs(fr.group.position.x) > 5) {
        fr.active = false;
        fr.landed = true;
        if (!fr.landedOnPeg) onMiss();
        world.scene.remove(fr.group);
      }
    }

    // Clean up inactive
    for (let i = flyingRings.length - 1; i >= 0; i--) {
      if (!flyingRings[i].active && flyingRings[i].age > 3) {
        flyingRings.splice(i, 1);
      }
    }
  }

  // ============================================================
  // GAME STATE
  // ============================================================

  let gameState: GameState = 'title';
  let gameMode: GameMode = 'classic';
  let gameDifficulty: Difficulty = save.settings.difficulty;
  let gameScore = 0;
  let gameRingsLeft = 10;
  let gameRingsThrown = 0;
  let gameHits = 0;
  let gameMisses = 0;
  let gameCombo = 0;
  let gameBestCombo = 0;
  let gameTimeLeft = 0;
  let gameTimePlayed = 0;
  let gameStartTime = 0;
  let gamePaused = false;
  let isCharging = false;
  let chargePower = 0;
  let aimX = 0;
  let aimY = 0;
  let countdownValue = 3;
  let countdownTimer = 0;
  let comboDecayTimer = 0;
  let trickShotsThisGame: string[] = [];
  let pegHitsThisGame: Map<string, number> = new Map();
  let targetPeg: PegDef | null = null; // for target mode
  let dailyRng: (() => number) | null = null;
  let achievementQueue: string[] = [];
  let toastMsg = '';
  let toastTimer = 0;

  // ============================================================
  // SCORING & EVENTS
  // ============================================================

  function onRinger(peg: PegDef, bounced: boolean) {
    gameHits++;
    gameCombo++;
    comboDecayTimer = 2.5;
    if (gameCombo > gameBestCombo) gameBestCombo = gameCombo;

    let points = peg.points;
    // Combo multiplier
    const mult = Math.min(gameCombo, 10);
    points *= mult;

    // Target mode bonus
    if (gameMode === 'target' && targetPeg === peg) {
      points *= 2;
      showToast('TARGET HIT! x2');
      pickTargetPeg();
    }

    gameScore += points;

    // Track peg hits
    const key = `${peg.x},${peg.z}`;
    pegHitsThisGame.set(key, (pegHitsThisGame.get(key) || 0) + 1);

    // Effects
    const color = peg.points >= 100 ? '#ffcc00' : theme().accent;
    particles.emit(peg.x, peg.height, peg.z, 20, color, 2.5, 0.8);

    if (peg.points >= 100) {
      audio.playSfx('golden');
      showToast('GOLDEN RINGER! +' + points);
      checkAchievement('golden_ringer');
      checkAchievement('distance_100');
    } else if (peg.points >= 50) {
      audio.playSfx('ringer', 1.1);
      showToast('+' + points + (mult > 1 ? ' x' + mult : ''));
      checkAchievement('distance_50');
    } else {
      audio.playSfx('ringer');
      if (mult > 1) showToast('+' + points + ' x' + mult);
      else showToast('+' + points);
    }

    if (gameCombo >= 3) { audio.playSfx('combo'); checkAchievement('combo_3'); }
    if (gameCombo >= 5) checkAchievement('combo_5');
    if (gameCombo >= 8) checkAchievement('combo_8');
    if (gameCombo >= 10) checkAchievement('combo_10');

    // Bounce ringer
    if (bounced) checkAchievement('bounce_ringer');

    // Check tricks
    if (chargePower >= 0.95) { trickShotsThisGame.push('max_power'); checkAchievement('trick_3'); }
    if (chargePower <= 0.15) { trickShotsThisGame.push('min_power'); checkAchievement('trick_3'); }
    if (peg.points >= 100) trickShotsThisGame.push('far_golden');

    // First ringer
    checkAchievement('first_ringer');

    updateHUD();
  }

  function onMiss() {
    gameMisses++;
    gameCombo = 0;
    audio.playSfx('miss');
    updateHUD();
  }

  function pickTargetPeg() {
    const idx = Math.floor(Math.random() * ALL_PEGS.length);
    targetPeg = ALL_PEGS[idx];
    // Highlight target peg
    pegMeshes.forEach(p => {
      const isTarget = p.def === targetPeg;
      (p.glowMesh.material as MeshBasicMaterial).opacity = isTarget ? 0.5 : 0.15;
      (p.glowMesh.material as MeshBasicMaterial).color.set(isTarget ? '#ff3333' : theme().glow);
    });
  }

  function showToast(msg: string) {
    toastMsg = msg;
    toastTimer = 2.0;
    updatePanel(toastEntity, 'toast-text', msg);
    showPanel(toastEntity);
  }

  function checkAchievement(id: string) {
    if (save.achievements.includes(id)) return;
    const a = ACHIEVEMENTS.find(a => a.id === id);
    if (!a) return;
    save.achievements.push(id);
    saveSave(save);
    audio.playSfx('achievement');
    showToast('Achievement: ' + a.name);
  }

  function addXP(amount: number) {
    save.xp += amount;
    const threshold = (lvl: number) => 100 + lvl * 50;
    while (save.xp >= threshold(save.level) && save.level < 50) {
      save.xp -= threshold(save.level);
      save.level++;
      audio.playSfx('levelup');
      showToast('Level Up! ' + XP_TITLES[Math.min(Math.floor((save.level - 1) / 2.5), 19)]);
      if (save.level >= 10) checkAchievement('lv_10');
      if (save.level >= 25) checkAchievement('lv_25');
      if (save.level >= 50) checkAchievement('lv_50');
    }
    saveSave(save);
  }

  // ============================================================
  // GAME FLOW
  // ============================================================

  function startGame(mode: GameMode) {
    gameMode = mode;
    gameScore = 0;
    gameHits = 0;
    gameMisses = 0;
    gameCombo = 0;
    gameBestCombo = 0;
    gameTimePlayed = 0;
    gameStartTime = Date.now();
    isCharging = false;
    chargePower = 0;
    trickShotsThisGame = [];
    pegHitsThisGame.clear();
    targetPeg = null;

    // Clear landed rings
    landedRings.forEach(r => world.scene.remove(r));
    landedRings.length = 0;
    flyingRings.forEach(r => { r.active = false; world.scene.remove(r.group); });
    flyingRings.length = 0;

    const diff = gameDifficulty;
    switch (mode) {
      case 'classic':
        gameRingsLeft = diff === 'easy' ? 15 : diff === 'medium' ? 10 : 7;
        gameTimeLeft = 0;
        break;
      case 'speed':
        gameRingsLeft = 999;
        gameTimeLeft = diff === 'easy' ? 60 : diff === 'medium' ? 45 : 30;
        break;
      case 'target':
        gameRingsLeft = diff === 'easy' ? 12 : diff === 'medium' ? 8 : 5;
        gameTimeLeft = 0;
        pickTargetPeg();
        break;
      case 'distance':
        gameRingsLeft = diff === 'easy' ? 12 : diff === 'medium' ? 8 : 5;
        gameTimeLeft = 0;
        break;
      case 'trick':
        gameRingsLeft = 20;
        gameTimeLeft = 0;
        break;
      case 'daily':
        gameRingsLeft = 10;
        gameTimeLeft = 0;
        dailyRng = mulberry32(dateSeed());
        break;
      case 'survival':
        gameRingsLeft = 999;
        gameTimeLeft = diff === 'easy' ? 90 : diff === 'medium' ? 60 : 45;
        break;
      case 'practice':
        gameRingsLeft = 999;
        gameTimeLeft = 0;
        break;
    }

    gameRingsThrown = 0;

    // Track mode played
    if (!save.stats.modesPlayed.includes(mode)) {
      save.stats.modesPlayed.push(mode);
      if (save.stats.modesPlayed.length >= 7) checkAchievement('all_modes');
    }

    // Track skin used
    const skinName = RING_SKINS[save.skin].name;
    if (!save.stats.skinsUsed.includes(skinName)) {
      save.stats.skinsUsed.push(skinName);
      if (save.stats.skinsUsed.length >= 3) checkAchievement('fashionista');
    }

    // Track theme used
    const themeName = THEMES[save.settings.theme].name;
    if (!save.stats.themesUsed.includes(themeName)) {
      save.stats.themesUsed.push(themeName);
      if (save.stats.themesUsed.length >= 5) checkAchievement('theme_all');
    }

    saveSave(save);

    // Start countdown
    gameState = 'countdown';
    countdownValue = 3;
    countdownTimer = 0;
    showPanel(countdownEntity);
    updatePanel(countdownEntity, 'cd-text', '3');
    audio.playSfx('countdown');

    hideAllPanels();
    showPanel(countdownEntity);
  }

  function endGame() {
    gameState = 'gameOver';
    gameTimePlayed = (Date.now() - gameStartTime) / 1000;

    // Stats
    save.stats.gamesPlayed++;
    save.stats.totalScore += gameScore;
    if (gameScore > save.stats.bestScore) save.stats.bestScore = gameScore;
    save.stats.totalRings += gameRingsThrown;
    save.stats.totalHits += gameHits;
    save.stats.totalMisses += gameMisses;
    if (gameBestCombo > save.stats.bestCombo) save.stats.bestCombo = gameBestCombo;
    save.stats.ringerCount += gameHits;
    save.stats.totalPlayTime += gameTimePlayed;
    save.stats.trickShotsLanded += new Set(trickShotsThisGame).size;

    // Perfect game check
    const accuracy = gameRingsThrown > 0 ? gameHits / gameRingsThrown : 0;
    if (accuracy >= 1.0 && gameRingsThrown >= 5 && gameMode === 'classic') {
      save.stats.perfectGames++;
      checkAchievement('perfect_game');
    }

    // Achievement checks
    if (save.stats.ringerCount >= 10) checkAchievement('ten_ringers');
    if (save.stats.ringerCount >= 50) checkAchievement('fifty_ringers');
    if (save.stats.ringerCount >= 100) checkAchievement('hundred_ringers');
    if (save.stats.ringerCount >= 500) checkAchievement('five_hundred');
    if (gameScore >= 500) checkAchievement('score_500');
    if (gameScore >= 1000) checkAchievement('score_1k');
    if (gameScore >= 5000) checkAchievement('score_5k');
    if (gameScore >= 10000) checkAchievement('score_10k');
    if (accuracy >= 0.8 && gameRingsThrown >= 5) checkAchievement('accuracy_80');
    if (accuracy >= 1.0 && gameRingsThrown >= 5) checkAchievement('accuracy_100');
    if (save.stats.gamesPlayed >= 10) checkAchievement('games_10');
    if (save.stats.gamesPlayed >= 50) checkAchievement('games_50');
    if (save.stats.gamesPlayed >= 100) checkAchievement('games_100');
    if (save.stats.totalScore >= 10000) checkAchievement('total_10k');
    if (save.stats.totalScore >= 50000) checkAchievement('total_50k');
    if (gameMode === 'speed' && gameHits >= 10) checkAchievement('speed_10');
    if (gameMode === 'survival' && gameTimePlayed >= 30) checkAchievement('survival_30');
    if (gameMode === 'survival' && gameTimePlayed >= 60) checkAchievement('survival_60');
    if (new Set(trickShotsThisGame).size >= 3) checkAchievement('trick_3');
    if (new Set(trickShotsThisGame).size >= 6) checkAchievement('trick_all');

    if (gameMode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      if (save.lastDaily === today) {
        // Already played today
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        save.dailyStreak = (save.lastDaily === yesterday) ? save.dailyStreak + 1 : 1;
        save.lastDaily = today;
        if (save.dailyStreak >= 3) checkAchievement('daily_3');
        if (save.dailyStreak >= 7) checkAchievement('daily_7');
      }
      checkAchievement('daily_done');
    }

    // Leaderboard
    const entry: LeaderEntry = {
      score: gameScore, mode: gameMode, difficulty: gameDifficulty,
      rings: gameRingsThrown, accuracy: Math.round(accuracy * 100),
      date: new Date().toISOString().split('T')[0],
    };
    save.highScores.push(entry);
    save.highScores.sort((a, b) => b.score - a.score);
    if (save.highScores.length > 20) save.highScores.length = 20;

    // XP
    addXP(Math.floor(gameScore / 10) + gameHits * 5);

    saveSave(save);
    audio.playSfx('gameOver');

    // Update game over panel
    updatePanel(gameOverEntity, 'go-score', String(gameScore));
    updatePanel(gameOverEntity, 'go-rings', `${gameHits}/${gameRingsThrown}`);
    updatePanel(gameOverEntity, 'go-accuracy', `${Math.round(accuracy * 100)}%`);
    updatePanel(gameOverEntity, 'go-combo', String(gameBestCombo));
    updatePanel(gameOverEntity, 'go-mode', gameMode.toUpperCase());

    hideAllPanels();
    showPanel(gameOverEntity);
  }

  // ============================================================
  // UI PANELS (PanelUI)
  // ============================================================

  const panelEntities: any[] = [];

  function createWorldPanel(config: string, x: number, y: number, z: number, w: number, h: number) {
    const e = world.createTransformEntity(undefined, { persistent: true });
    e.object3D.position.set(x, y, z);
    e.addComponent(PanelUI, { config, maxWidth: w, maxHeight: h });
    panelEntities.push(e);
    return e;
  }

  function createFollowerPanel(config: string, ox: number, oy: number, oz: number, w: number, h: number) {
    const e = world.createTransformEntity(undefined, { persistent: true });
    e.addComponent(PanelUI, { config, maxWidth: w, maxHeight: h });
    e.addComponent(Follower, {
      target: world.player.head,
      offsetPosition: [ox, oy, oz],
      behavior: FollowBehavior.PivotY,
      speed: 5,
      tolerance: 0.3,
    });
    panelEntities.push(e);
    return e;
  }

  function createScreenPanel(config: string, w: string, bottom: string, right: string, zOff: number, maxW: number, maxH: number) {
    const e = world.createTransformEntity(undefined, { persistent: true });
    e.addComponent(PanelUI, { config, maxWidth: maxW, maxHeight: maxH });
    e.addComponent(ScreenSpace, { width: w, height: 'auto', bottom, right, zOffset: zOff });
    panelEntities.push(e);
    return e;
  }

  // Panel entities
  const titleEntity = createWorldPanel('/ui/title.json', 0, 1.6, -2.5, 1.0, 1.2);
  const modeEntity = createWorldPanel('/ui/modeselect.json', 0, 1.6, -2.5, 1.0, 1.2);
  const diffEntity = createWorldPanel('/ui/difficulty.json', 0, 1.6, -2.5, 0.8, 0.8);
  const hudEntity = createFollowerPanel('/ui/hud.json', 0.3, -0.12, -0.5, 0.35, 0.2);
  const powerEntity = createFollowerPanel('/ui/power.json', -0.3, -0.15, -0.5, 0.15, 0.05);
  const pauseEntity = createWorldPanel('/ui/pause.json', 0, 1.6, -2.0, 0.6, 0.5);
  const gameOverEntity = createWorldPanel('/ui/gameover.json', 0, 1.6, -2.0, 0.9, 1.0);
  const leaderEntity = createWorldPanel('/ui/leaderboard.json', 0, 1.6, -2.5, 1.0, 1.0);
  const achieveEntity = createWorldPanel('/ui/achievements.json', 0, 1.6, -2.5, 1.0, 1.2);
  const settingsEntity = createWorldPanel('/ui/settings.json', 0, 1.6, -2.5, 0.9, 1.0);
  const statsEntity = createWorldPanel('/ui/stats.json', 0, 1.6, -2.5, 0.9, 1.0);
  const skinsEntity = createWorldPanel('/ui/skins.json', 0, 1.6, -2.5, 0.9, 0.9);
  const helpEntity = createWorldPanel('/ui/help.json', 0, 1.6, -2.5, 1.0, 1.2);
  const countdownEntity = createFollowerPanel('/ui/countdown.json', 0, 0, -0.6, 0.2, 0.15);
  const toastEntity = createFollowerPanel('/ui/toast.json', 0, 0.15, -0.5, 0.4, 0.08);

  function hideAllPanels() {
    panelEntities.forEach(e => hidePanel(e));
  }

  function showPanel(e: any) {
    if (e.object3D) e.object3D.visible = true;
  }

  function hidePanel(e: any) {
    if (e.object3D) e.object3D.visible = false;
  }

  function updatePanel(entity: any, id: string, text: string) {
    try {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (doc) {
        const el = doc.getElementById(id);
        if (el) el.text.value = text;
      }
    } catch {}
  }

  function updateHUD() {
    const timeStr = gameTimeLeft > 0 ? String(Math.ceil(gameTimeLeft)) + 's' : '--';
    updatePanel(hudEntity, 'hud-score', String(gameScore));
    updatePanel(hudEntity, 'hud-rings', gameRingsLeft < 900 ? String(gameRingsLeft) : 'INF');
    updatePanel(hudEntity, 'hud-combo', gameCombo > 1 ? 'x' + gameCombo : '');
    updatePanel(hudEntity, 'hud-time', timeStr);
    updatePanel(hudEntity, 'hud-mode', gameMode.toUpperCase());
    updatePanel(hudEntity, 'hud-hits', String(gameHits));
  }

  // ============================================================
  // UI EVENT BINDING (deferred)
  // ============================================================

  let uiBound = false;
  function tryBindUI() {
    if (uiBound) return;

    // Title buttons
    const titleDoc = titleEntity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!titleDoc) return;

    const bind = (ent: any, btnId: string, cb: () => void) => {
      try {
        const doc = ent.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
        if (doc) {
          const btn = doc.getElementById(btnId);
          if (btn) btn.addEventListener('click', cb);
        }
      } catch {}
    };

    // Title
    bind(titleEntity, 'btn-play', () => { audio.playSfx('click'); gameState = 'modeSelect'; hideAllPanels(); showPanel(modeEntity); });
    bind(titleEntity, 'btn-scores', () => { audio.playSfx('click'); gameState = 'leaderboard'; refreshLeaderboard(); hideAllPanels(); showPanel(leaderEntity); });
    bind(titleEntity, 'btn-achieve', () => { audio.playSfx('click'); gameState = 'achievements'; refreshAchievements(); hideAllPanels(); showPanel(achieveEntity); });
    bind(titleEntity, 'btn-stats', () => { audio.playSfx('click'); gameState = 'stats'; refreshStats(); hideAllPanels(); showPanel(statsEntity); });
    bind(titleEntity, 'btn-skins', () => { audio.playSfx('click'); gameState = 'skins'; refreshSkins(); hideAllPanels(); showPanel(skinsEntity); });
    bind(titleEntity, 'btn-settings', () => { audio.playSfx('click'); gameState = 'settings'; hideAllPanels(); showPanel(settingsEntity); });
    bind(titleEntity, 'btn-help', () => { audio.playSfx('click'); gameState = 'help'; hideAllPanels(); showPanel(helpEntity); });

    // Mode select
    const modes: GameMode[] = ['classic', 'speed', 'target', 'distance', 'trick', 'daily', 'survival', 'practice'];
    modes.forEach(m => {
      bind(modeEntity, 'btn-' + m, () => { audio.playSfx('click'); gameMode = m; gameState = 'difficulty'; hideAllPanels(); showPanel(diffEntity); });
    });

    // Difficulty
    (['easy', 'medium', 'hard'] as Difficulty[]).forEach(d => {
      bind(diffEntity, 'btn-' + d, () => {
        audio.playSfx('click');
        gameDifficulty = d;
        save.settings.difficulty = d;
        saveSave(save);
        startGame(gameMode);
      });
    });
    bind(diffEntity, 'btn-diff-back', () => { audio.playSfx('click'); gameState = 'modeSelect'; hideAllPanels(); showPanel(modeEntity); });

    // Pause
    bind(pauseEntity, 'btn-resume', () => { audio.playSfx('click'); gameState = 'playing'; hideAllPanels(); showPanel(hudEntity); showPanel(powerEntity); });
    bind(pauseEntity, 'btn-quit', () => { audio.playSfx('click'); endGame(); });

    // Game over
    bind(gameOverEntity, 'btn-rematch', () => { audio.playSfx('click'); startGame(gameMode); });
    bind(gameOverEntity, 'btn-go-title', () => { audio.playSfx('click'); goToTitle(); });

    // Back buttons
    const backPanels = [
      { ent: leaderEntity, btn: 'btn-lb-back' },
      { ent: achieveEntity, btn: 'btn-ach-back' },
      { ent: settingsEntity, btn: 'btn-set-back' },
      { ent: statsEntity, btn: 'btn-stats-back' },
      { ent: skinsEntity, btn: 'btn-skins-back' },
      { ent: helpEntity, btn: 'btn-help-back' },
      { ent: modeEntity, btn: 'btn-mode-back' },
    ];
    backPanels.forEach(({ ent, btn }) => {
      bind(ent, btn, () => { audio.playSfx('click'); goToTitle(); });
    });

    // Settings volume controls
    const volControls = [
      { up: 'btn-master-up', down: 'btn-master-down', key: 'masterVol' as const, id: 'set-master' },
      { up: 'btn-sfx-up', down: 'btn-sfx-down', key: 'sfxVol' as const, id: 'set-sfx' },
      { up: 'btn-music-up', down: 'btn-music-down', key: 'musicVol' as const, id: 'set-music' },
    ];
    volControls.forEach(vc => {
      bind(settingsEntity, vc.up, () => {
        save.settings[vc.key] = Math.min(1, save.settings[vc.key] + 0.1);
        audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol);
        updatePanel(settingsEntity, vc.id, Math.round(save.settings[vc.key] * 100) + '%');
        saveSave(save);
        audio.playSfx('click');
      });
      bind(settingsEntity, vc.down, () => {
        save.settings[vc.key] = Math.max(0, save.settings[vc.key] - 0.1);
        audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol);
        updatePanel(settingsEntity, vc.id, Math.round(save.settings[vc.key] * 100) + '%');
        saveSave(save);
        audio.playSfx('click');
      });
    });

    // Theme controls
    bind(settingsEntity, 'btn-theme-prev', () => {
      save.settings.theme = (save.settings.theme - 1 + THEMES.length) % THEMES.length;
      updatePanel(settingsEntity, 'set-theme', THEMES[save.settings.theme].name);
      applyTheme();
      saveSave(save);
      audio.playSfx('click');
    });
    bind(settingsEntity, 'btn-theme-next', () => {
      save.settings.theme = (save.settings.theme + 1) % THEMES.length;
      updatePanel(settingsEntity, 'set-theme', THEMES[save.settings.theme].name);
      applyTheme();
      saveSave(save);
      audio.playSfx('click');
    });

    // Skin buttons
    for (let i = 0; i < 8; i++) {
      bind(skinsEntity, 'btn-skin-' + i, () => {
        if (RING_SKINS[i].condition(save)) {
          save.skin = i;
          saveSave(save);
          refreshSkins();
          audio.playSfx('click');
        }
      });
    }

    // Achievement pagination
    bind(achieveEntity, 'btn-ach-prev', () => { achievePage = Math.max(0, achievePage - 1); refreshAchievements(); audio.playSfx('click'); });
    bind(achieveEntity, 'btn-ach-next', () => { achievePage = Math.min(Math.floor((ACHIEVEMENTS.length - 1) / 15), achievePage + 1); refreshAchievements(); audio.playSfx('click'); });

    uiBound = true;
  }

  let achievePage = 0;

  function refreshLeaderboard() {
    for (let i = 0; i < 10; i++) {
      const entry = save.highScores[i];
      if (entry) {
        updatePanel(leaderEntity, 'lb-rank-' + i, String(i + 1));
        updatePanel(leaderEntity, 'lb-score-' + i, String(entry.score));
        updatePanel(leaderEntity, 'lb-mode-' + i, entry.mode.toUpperCase());
        updatePanel(leaderEntity, 'lb-date-' + i, entry.date);
      } else {
        updatePanel(leaderEntity, 'lb-rank-' + i, String(i + 1));
        updatePanel(leaderEntity, 'lb-score-' + i, '-');
        updatePanel(leaderEntity, 'lb-mode-' + i, '-');
        updatePanel(leaderEntity, 'lb-date-' + i, '-');
      }
    }
  }

  function refreshAchievements() {
    const start = achievePage * 15;
    for (let i = 0; i < 15; i++) {
      const idx = start + i;
      const a = ACHIEVEMENTS[idx];
      if (a) {
        const unlocked = save.achievements.includes(a.id);
        updatePanel(achieveEntity, 'ach-check-' + i, unlocked ? '[X]' : '[ ]');
        updatePanel(achieveEntity, 'ach-name-' + i, a.name);
        updatePanel(achieveEntity, 'ach-desc-' + i, a.desc);
      } else {
        updatePanel(achieveEntity, 'ach-check-' + i, '');
        updatePanel(achieveEntity, 'ach-name-' + i, '');
        updatePanel(achieveEntity, 'ach-desc-' + i, '');
      }
    }
    updatePanel(achieveEntity, 'ach-page', `${achievePage + 1}/${Math.ceil(ACHIEVEMENTS.length / 15)}`);
  }

  function refreshStats() {
    const s = save.stats;
    const acc = s.totalRings > 0 ? Math.round((s.totalHits / s.totalRings) * 100) : 0;
    updatePanel(statsEntity, 'st-games', String(s.gamesPlayed));
    updatePanel(statsEntity, 'st-score', String(s.totalScore));
    updatePanel(statsEntity, 'st-best', String(s.bestScore));
    updatePanel(statsEntity, 'st-rings', String(s.totalRings));
    updatePanel(statsEntity, 'st-hits', String(s.totalHits));
    updatePanel(statsEntity, 'st-acc', acc + '%');
    updatePanel(statsEntity, 'st-combo', String(s.bestCombo));
    updatePanel(statsEntity, 'st-perfect', String(s.perfectGames));
    updatePanel(statsEntity, 'st-time', Math.floor(s.totalPlayTime / 60) + 'm');
    updatePanel(statsEntity, 'st-level', 'Lv.' + save.level + ' ' + XP_TITLES[Math.min(Math.floor((save.level - 1) / 2.5), 19)]);
  }

  function refreshSkins() {
    for (let i = 0; i < 8; i++) {
      const s = RING_SKINS[i];
      const unlocked = s.condition(save);
      const equipped = save.skin === i;
      const status = equipped ? 'EQUIPPED' : unlocked ? 'UNLOCKED' : s.unlock;
      updatePanel(skinsEntity, 'skin-name-' + i, s.name);
      updatePanel(skinsEntity, 'skin-status-' + i, status);
    }
  }

  function applyTheme() {
    const t = theme();
    world.scene.fog = new Fog(t.bg, 5, 20);
    world.scene.background = new Color(t.bg);
    accentLight1.color.set(t.accent);
    accentLight2.color.set(t.accent);
    // Rebuild pegs with new colors
    buildPegs();
  }

  function goToTitle() {
    gameState = 'title';
    hideAllPanels();
    showPanel(titleEntity);

    // Update title level display
    const title = XP_TITLES[Math.min(Math.floor((save.level - 1) / 2.5), 19)];
    updatePanel(titleEntity, 'title-level', 'Lv.' + save.level + ' ' + title);
  }

  // ============================================================
  // INPUT
  // ============================================================

  const keyboard = world.input.keyboard;

  function handleInput(dt: number) {
    if (gameState === 'playing') {
      // Aim with mouse/keyboard
      if (keyboard.getKeyPressed('ArrowLeft') || keyboard.getKeyPressed('KeyA')) {
        aimX = Math.max(-1, aimX - 2 * dt);
      }
      if (keyboard.getKeyPressed('ArrowRight') || keyboard.getKeyPressed('KeyD')) {
        aimX = Math.min(1, aimX + 2 * dt);
      }

      // Charge/throw with space
      if (keyboard.getKeyPressed('Space')) {
        if (!isCharging) {
          isCharging = true;
          chargePower = 0;
        }
        chargePower = Math.min(1, chargePower + dt * 1.2);
        updatePanel(powerEntity, 'power-bar', getPowerBar(chargePower));
        showPanel(powerEntity);
      } else if (isCharging) {
        // Release - throw!
        isCharging = false;
        if (gameRingsLeft > 0 || gameMode === 'practice' || gameMode === 'survival' || gameMode === 'speed') {
          throwRing(chargePower, aimX, aimY);
          if (gameRingsLeft < 900) gameRingsLeft--;
          updateHUD();
        }
        chargePower = 0;
        hidePanel(powerEntity);
      }

      // Pause
      if (keyboard.getKeyDown('Escape') || keyboard.getKeyDown('KeyP')) {
        gameState = 'paused';
        hideAllPanels();
        showPanel(pauseEntity);
      }
    } else if (gameState === 'paused') {
      if (keyboard.getKeyDown('Escape') || keyboard.getKeyDown('KeyP')) {
        gameState = 'playing';
        hideAllPanels();
        showPanel(hudEntity);
        showPanel(powerEntity);
      }
    } else if (gameState === 'gameOver') {
      if (keyboard.getKeyDown('KeyR')) {
        startGame(gameMode);
      }
      if (keyboard.getKeyDown('Escape')) {
        goToTitle();
      }
    } else if (gameState === 'title') {
      // Quick start
      if (keyboard.getKeyDown('Space')) {
        gameState = 'modeSelect';
        hideAllPanels();
        showPanel(modeEntity);
      }
    }

    // XR controller input
    try {
      const rightGP = (world.input as any).xr?.gamepads?.right;
      if (rightGP) {
        if (gameState === 'playing') {
          // Thumbstick for aim
          const axes = rightGP.getAxesValues?.({ index: 0 });
          if (axes) aimX = Math.max(-1, Math.min(1, aimX + axes.x * 2 * dt));

          // Trigger for charge/throw
          const triggerDown = rightGP.getButtonPressed?.({ index: 0 });
          if (triggerDown) {
            if (!isCharging) {
              isCharging = true;
              chargePower = 0;
            }
            chargePower = Math.min(1, chargePower + dt * 1.2);
            updatePanel(powerEntity, 'power-bar', getPowerBar(chargePower));
            showPanel(powerEntity);
          } else if (isCharging) {
            isCharging = false;
            if (gameRingsLeft > 0 || gameMode === 'practice' || gameMode === 'survival' || gameMode === 'speed') {
              throwRing(chargePower, aimX, aimY);
              if (gameRingsLeft < 900) gameRingsLeft--;
              updateHUD();
            }
            chargePower = 0;
            hidePanel(powerEntity);
          }

          // B for pause
          const bDown = rightGP.getButtonDown?.({ index: 4 });
          if (bDown) {
            gameState = 'paused';
            hideAllPanels();
            showPanel(pauseEntity);
          }
        } else if (gameState === 'paused') {
          const bDown = rightGP.getButtonDown?.({ index: 4 });
          if (bDown) {
            gameState = 'playing';
            hideAllPanels();
            showPanel(hudEntity);
          }
        }
      }
    } catch {}
  }

  function getPowerBar(power: number): string {
    const filled = Math.floor(power * 10);
    return '|'.repeat(filled) + '.'.repeat(10 - filled);
  }

  // ============================================================
  // AIM GUIDE
  // ============================================================

  const aimGuideGroup = new Group();
  world.scene.add(aimGuideGroup);
  const aimDots: Mesh[] = [];
  const aimDotGeo = new SphereGeometry(0.01, 4, 4);
  for (let i = 0; i < 30; i++) {
    const m = new Mesh(aimDotGeo, new MeshBasicMaterial({ color: theme().accent, transparent: true, opacity: 0.3, blending: AdditiveBlending }));
    aimGuideGroup.add(m);
    aimDots.push(m);
  }

  function updateAimGuide() {
    if (gameState !== 'playing' || !isCharging) {
      aimGuideGroup.visible = false;
      return;
    }
    aimGuideGroup.visible = true;

    const power = chargePower;
    const speed = 3 + power * 5;
    const upSpeed = 2 + power * 2;

    let px = aimX * 0.3, py = 1.2, pz = -0.3;
    let vx = aimX * 1.5, vy = upSpeed, vz = -speed;
    const dt = 0.05;

    for (let i = 0; i < 30; i++) {
      px += vx * dt;
      py += vy * dt;
      pz += vz * dt;
      vy -= 6.0 * dt;

      aimDots[i].position.set(px, py, pz);
      (aimDots[i].material as MeshBasicMaterial).opacity = 0.3 * (1 - i / 30);

      if (py < 0) break;
    }
  }

  // ============================================================
  // MAIN LOOP
  // ============================================================

  let lastTime = performance.now();

  const update = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Try to bind UI on first frames
    if (!uiBound) tryBindUI();

    // Countdown
    if (gameState === 'countdown') {
      countdownTimer += dt;
      if (countdownTimer >= 1) {
        countdownTimer = 0;
        countdownValue--;
        if (countdownValue > 0) {
          updatePanel(countdownEntity, 'cd-text', String(countdownValue));
          audio.playSfx('countdown');
        } else {
          updatePanel(countdownEntity, 'cd-text', 'TOSS!');
          audio.playSfx('go');
          setTimeout(() => {
            gameState = 'playing';
            hideAllPanels();
            showPanel(hudEntity);
            updateHUD();
            audio.playSfx('gameStart');
          }, 500);
        }
      }
    }

    // Playing updates
    if (gameState === 'playing') {
      handleInput(dt);
      updateRingPhysics(dt);
      updateAimGuide();

      // Combo decay
      if (gameCombo > 0) {
        comboDecayTimer -= dt;
        if (comboDecayTimer <= 0) {
          gameCombo = 0;
          updateHUD();
        }
      }

      // Timer modes
      if (gameTimeLeft > 0) {
        gameTimeLeft -= dt;
        updateHUD();
        if (gameTimeLeft <= 0) {
          gameTimeLeft = 0;
          endGame();
          return;
        }
        // Warning beeps
        if (gameTimeLeft <= 5 && Math.floor(gameTimeLeft) !== Math.floor(gameTimeLeft + dt)) {
          audio.playSfx('countdown');
        }
      }

      // Check if out of rings
      if (gameRingsLeft <= 0 && gameRingsLeft < 900) {
        // Wait for all rings to land
        if (flyingRings.every(r => !r.active)) {
          endGame();
          return;
        }
      }

      // Survival: miss 3 times and game over
      if (gameMode === 'survival' && gameMisses >= 3) {
        endGame();
        return;
      }
    } else {
      handleInput(dt);
    }

    // Toast timer
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) {
        hidePanel(toastEntity);
      }
    }

    // Particle update
    particles.update(dt);

    // Animate decorations
    const t = now / 1000;
    decoGroup.children.forEach(c => {
      const m = c as Mesh;
      m.rotation.y += (m as any)._rotSpeed * dt;
      m.position.y = (m as any)._baseY + Math.sin(t * (m as any)._bobSpeed + (m as any)._bobOffset) * 0.15;
    });

    // Ambient particles
    ambientParticles.forEach(m => {
      m.position.x += (m as any)._vx * dt;
      m.position.y += (m as any)._vy * dt;
      (m.material as MeshBasicMaterial).opacity = 0.15 + 0.15 * Math.sin(t * 0.5 + (m as any)._phase);
      // Wrap
      if (m.position.x > 7) m.position.x = -7;
      if (m.position.x < -7) m.position.x = 7;
    });

    // Peg glow pulse
    pegMeshes.forEach(p => {
      const intensity = 0.1 + 0.08 * Math.sin(t * 2 + p.def.x * 5);
      (p.glowMesh.material as MeshBasicMaterial).opacity = p.def === targetPeg ? 0.4 + 0.2 * Math.sin(t * 4) : intensity;
    });
  };

  // Use world's built-in update loop
  (world as any).onUpdate = update;
  // Fallback: manual rAF loop if onUpdate doesn't work
  function loop() {
    update();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Initial state
  hideAllPanels();
  showPanel(titleEntity);
  goToTitle();

  // Settings initial values
  setTimeout(() => {
    updatePanel(settingsEntity, 'set-master', Math.round(save.settings.masterVol * 100) + '%');
    updatePanel(settingsEntity, 'set-sfx', Math.round(save.settings.sfxVol * 100) + '%');
    updatePanel(settingsEntity, 'set-music', Math.round(save.settings.musicVol * 100) + '%');
    updatePanel(settingsEntity, 'set-theme', THEMES[save.settings.theme].name);
  }, 1000);
}

main().catch(console.error);
