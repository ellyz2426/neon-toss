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
  'skins' | 'help' | 'countdown' | 'history' | 'challenge';

type GameMode = 'classic' | 'speed' | 'target' | 'distance' | 'trick' | 'daily' |
  'survival' | 'practice' | 'marathon' | 'precision' | 'carnival' | 'zen' |
  'ricochet' | 'elimination' | 'duel' | 'arcade' | 'custom';
type Difficulty = 'easy' | 'medium' | 'hard';
type PowerUpType = 'multi' | 'magnet' | 'fire' | 'giant' | 'ghost' | 'slowmo' | 'laser' | 'bounce';

interface PegDef {
  x: number; z: number; height: number; points: number; radius: number;
  moving?: boolean; moveAmplitude?: number; moveSpeed?: number; movePhase?: number;
  baseX?: number;
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

interface PowerUpDef {
  type: PowerUpType; name: string; desc: string; color: string;
  duration: number; // seconds (0 = instant)
}

interface CustomSettings {
  rings: number; time: number; wind: number; movePegs: boolean; powerUps: boolean;
}

interface SaveData {
  highScores: LeaderEntry[];
  gameHistory: LeaderEntry[];
  achievements: string[];
  stats: {
    gamesPlayed: number; totalScore: number; bestScore: number;
    totalRings: number; totalHits: number; totalMisses: number;
    bestCombo: number; trickShotsLanded: number;
    ringerCount: number; doubleRingerCount: number;
    perfectGames: number; modesPlayed: string[];
    skinsUsed: string[]; themesUsed: string[];
    totalPlayTime: number;
    powerUpsUsed: number; marathonWavesBeat: number;
    windRingers: number; carnivalBonuses: number;
    fireBlasts: number; magnetPulls: number;
    giantRingers: number; ghostPasses: number;
    multiRingers: number; slowmoRingers: number;
    bestMarathonWave: number; precisionPerfects: number;
    zenMinutes: number;
    ricochetBounceScores: number; eliminationClears: number;
    laserAims: number; bounceRingers: number;
    frenzyBonuses: number; boardClears: number;
    duelsWon: number; duelsPlayed: number;
    bestArcadeLevel: number; arcadeGamesPlayed: number;
  };
  settings: {
    masterVol: number; sfxVol: number; musicVol: number;
    theme: number; difficulty: Difficulty;
  };
  skin: number;
  xp: number; level: number;
  dailyStreak: number; lastDaily: string;
  powerUpInventory: Record<PowerUpType, number>;
  customSettings: CustomSettings;
}

// Peg layouts
const PEG_LAYOUTS: PegDef[][] = [
  [
    { x: -0.4, z: -2.0, height: 0.35, points: 10, radius: 0.04 },
    { x: 0.0, z: -2.0, height: 0.35, points: 10, radius: 0.04 },
    { x: 0.4, z: -2.0, height: 0.35, points: 10, radius: 0.04 },
  ],
  [
    { x: -0.3, z: -3.0, height: 0.4, points: 25, radius: 0.035 },
    { x: 0.15, z: -3.0, height: 0.4, points: 25, radius: 0.035 },
    { x: 0.5, z: -3.0, height: 0.4, points: 25, radius: 0.035 },
  ],
  [
    { x: -0.2, z: -4.0, height: 0.45, points: 50, radius: 0.03 },
    { x: 0.3, z: -4.0, height: 0.45, points: 50, radius: 0.03 },
  ],
  [
    { x: 0.0, z: -5.0, height: 0.5, points: 100, radius: 0.025 },
  ],
];

const ALL_PEGS = PEG_LAYOUTS.flat();

// Alternate peg arrangements for variety
const PEG_LAYOUTS_DIAMOND: PegDef[] = [
  { x: 0.0, z: -2.0, height: 0.35, points: 10, radius: 0.04 },
  { x: -0.35, z: -2.8, height: 0.38, points: 25, radius: 0.035 },
  { x: 0.35, z: -2.8, height: 0.38, points: 25, radius: 0.035 },
  { x: -0.6, z: -3.5, height: 0.42, points: 25, radius: 0.035 },
  { x: 0.0, z: -3.5, height: 0.42, points: 50, radius: 0.03 },
  { x: 0.6, z: -3.5, height: 0.42, points: 25, radius: 0.035 },
  { x: -0.35, z: -4.2, height: 0.45, points: 50, radius: 0.03 },
  { x: 0.35, z: -4.2, height: 0.45, points: 50, radius: 0.03 },
  { x: 0.0, z: -5.0, height: 0.5, points: 100, radius: 0.025 },
];

const PEG_LAYOUTS_CIRCLE: PegDef[] = [];
for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2;
  PEG_LAYOUTS_CIRCLE.push({
    x: Math.cos(angle) * 0.5, z: -3.0 + Math.sin(angle) * 0.5,
    height: 0.38, points: 25, radius: 0.035,
  });
}
PEG_LAYOUTS_CIRCLE.push({ x: 0, z: -3.0, height: 0.5, points: 100, radius: 0.025 });
for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
  PEG_LAYOUTS_CIRCLE.push({
    x: Math.cos(angle) * 1.0, z: -3.0 + Math.sin(angle) * 1.0,
    height: 0.35, points: 10, radius: 0.04,
  });
}

const PEG_LAYOUTS_ZIGZAG: PegDef[] = [
  { x: -0.4, z: -1.8, height: 0.35, points: 10, radius: 0.04 },
  { x: 0.3, z: -2.3, height: 0.37, points: 10, radius: 0.04 },
  { x: -0.3, z: -2.8, height: 0.39, points: 25, radius: 0.035 },
  { x: 0.4, z: -3.3, height: 0.41, points: 25, radius: 0.035 },
  { x: -0.2, z: -3.8, height: 0.43, points: 50, radius: 0.03 },
  { x: 0.2, z: -4.3, height: 0.46, points: 50, radius: 0.03 },
  { x: 0.0, z: -4.8, height: 0.5, points: 100, radius: 0.025 },
];

const ALTERNATE_LAYOUTS = [ALL_PEGS, PEG_LAYOUTS_DIAMOND, PEG_LAYOUTS_CIRCLE, PEG_LAYOUTS_ZIGZAG];
const LAYOUT_NAMES = ['Standard', 'Diamond', 'Circle', 'Zigzag'];

const THEMES: Theme[] = [
  { name: 'Neon Holodeck', grid: '#00ffff', accent: '#00ffff', bg: '#050510', fog: '#050510', wall: '#001a1a', peg: '#00cccc', ring: '#00ffff', glow: '#00ffff' },
  { name: 'Crimson Arena', grid: '#ff3344', accent: '#ff3344', bg: '#100505', fog: '#100505', wall: '#1a0000', peg: '#cc2233', ring: '#ff3344', glow: '#ff3344' },
  { name: 'Toxic Neon', grid: '#33ff33', accent: '#33ff33', bg: '#051005', fog: '#051005', wall: '#001a00', peg: '#22cc22', ring: '#33ff33', glow: '#33ff33' },
  { name: 'Ultra Violet', grid: '#aa33ff', accent: '#aa33ff', bg: '#0a0510', fog: '#0a0510', wall: '#0a001a', peg: '#8822cc', ring: '#aa33ff', glow: '#aa33ff' },
  { name: 'Solar Blaze', grid: '#ff8800', accent: '#ff8800', bg: '#100805', fog: '#100805', wall: '#1a0a00', peg: '#cc6600', ring: '#ff8800', glow: '#ff8800' },
  { name: 'Deep Ocean', grid: '#0066cc', accent: '#0088ff', bg: '#020812', fog: '#020812', wall: '#001030', peg: '#0055aa', ring: '#0088ff', glow: '#0088ff' },
  { name: 'Cyber Pink', grid: '#ff33aa', accent: '#ff33aa', bg: '#100510', fog: '#100510', wall: '#1a0015', peg: '#cc2288', ring: '#ff33aa', glow: '#ff33aa' },
  { name: 'Matrix', grid: '#00ff44', accent: '#00ff44', bg: '#001a00', fog: '#001a00', wall: '#003300', peg: '#00cc33', ring: '#00ff44', glow: '#00ff44' },
  { name: 'Lava Core', grid: '#ff4400', accent: '#ff6600', bg: '#0a0200', fog: '#0a0200', wall: '#1a0800', peg: '#cc3300', ring: '#ff4400', glow: '#ff6600' },
  { name: 'Ice Palace', grid: '#88ccff', accent: '#aaddff', bg: '#080c14', fog: '#080c14', wall: '#0a1525', peg: '#6699cc', ring: '#88ccff', glow: '#aaddff' },
  { name: 'Midnight Gold', grid: '#cc9933', accent: '#ddaa44', bg: '#0a0800', fog: '#0a0800', wall: '#1a1000', peg: '#aa7722', ring: '#cc9933', glow: '#ddaa44' },
  { name: 'Neon Frost', grid: '#66eeff', accent: '#88ffff', bg: '#060e10', fog: '#060e10', wall: '#0a1a1e', peg: '#44bbcc', ring: '#66eeff', glow: '#88ffff' },
];

const RING_SKINS: RingSkin[] = [
  { name: 'Neon Cyan', color: '#00ffff', emissive: '#00aaaa', glow: '#00ffff', unlock: 'Default', condition: () => true },
  { name: 'Solar Flare', color: '#ff8800', emissive: '#aa5500', glow: '#ff8800', unlock: '50 ringers', condition: s => s.stats.ringerCount >= 50 },
  { name: 'Plasma Pink', color: '#ff33aa', emissive: '#aa2277', glow: '#ff33aa', unlock: '5K score', condition: s => s.stats.bestScore >= 5000 },
  { name: 'Frost Ring', color: '#88ccff', emissive: '#5588aa', glow: '#88ccff', unlock: '10 games', condition: s => s.stats.gamesPlayed >= 10 },
  { name: 'Toxic Green', color: '#33ff33', emissive: '#22aa22', glow: '#33ff33', unlock: 'x5 combo', condition: s => s.stats.bestCombo >= 5 },
  { name: 'Royal Gold', color: '#ffcc00', emissive: '#aa8800', glow: '#ffcc00', unlock: 'Perfect game', condition: s => s.stats.perfectGames >= 1 },
  { name: 'Void Purple', color: '#8833ff', emissive: '#5522aa', glow: '#8833ff', unlock: '80% accuracy', condition: s => s.stats.totalRings > 0 && (s.stats.totalHits / s.stats.totalRings) >= 0.8 },
  { name: 'Inferno', color: '#ff2200', emissive: '#aa1100', glow: '#ff2200', unlock: 'All 8 base modes', condition: s => s.stats.modesPlayed.length >= 8 },
  { name: 'Chrome', color: '#cccccc', emissive: '#888888', glow: '#ffffff', unlock: 'Level 15', condition: s => s.level >= 15 },
  { name: 'Electric Blue', color: '#3366ff', emissive: '#2244aa', glow: '#4488ff', unlock: '10 power-ups', condition: s => s.stats.powerUpsUsed >= 10 },
  { name: 'Sunset', color: '#ff6633', emissive: '#aa4422', glow: '#ff8855', unlock: 'Marathon wave 5', condition: s => s.stats.bestMarathonWave >= 5 },
  { name: 'Forest', color: '#22aa44', emissive: '#116622', glow: '#33cc55', unlock: '5 wind ringers', condition: s => s.stats.windRingers >= 5 },
  { name: 'Cosmic', color: '#cc44ff', emissive: '#8822aa', glow: '#dd66ff', unlock: 'Carnival bonus x3', condition: s => s.stats.carnivalBonuses >= 3 },
  { name: 'Hologram', color: '#88ffcc', emissive: '#55aa88', glow: '#aaffdd', unlock: 'All 12 modes', condition: s => s.stats.modesPlayed.length >= 12 },
  { name: 'Diamond', color: '#eeeeff', emissive: '#aaaacc', glow: '#ffffff', unlock: 'Level 30', condition: s => s.level >= 30 },
  { name: 'Neon Rose', color: '#ff66aa', emissive: '#cc3377', glow: '#ff88cc', unlock: '200 ringers', condition: s => s.stats.ringerCount >= 200 },
  { name: 'Thunder', color: '#ffff33', emissive: '#cccc00', glow: '#ffff66', unlock: 'x8 combo in ricochet', condition: s => s.stats.ricochetBounceScores >= 20 },
  { name: 'Obsidian', color: '#333344', emissive: '#222233', glow: '#555566', unlock: '3 board clears', condition: s => s.stats.boardClears >= 3 },
  { name: 'Aurora', color: '#44ffaa', emissive: '#22cc77', glow: '#66ffcc', unlock: 'All 16 modes', condition: s => s.stats.modesPlayed.length >= 16 },
  { name: 'Ember', color: '#ff6622', emissive: '#cc4411', glow: '#ff8844', unlock: 'Win 3 duels', condition: s => s.stats.duelsWon >= 3 },
  { name: 'Starlight', color: '#eeeeff', emissive: '#ccccee', glow: '#ffffff', unlock: 'Arcade level 10', condition: s => s.stats.bestArcadeLevel >= 10 },
];

const POWER_UP_DEFS: PowerUpDef[] = [
  { type: 'multi', name: 'MULTI-RING', desc: 'Throw 3 rings at once', color: '#ff33ff', duration: 0 },
  { type: 'magnet', name: 'MAGNET', desc: 'Ring curves to nearest peg', color: '#4488ff', duration: 0 },
  { type: 'fire', name: 'FIRE RING', desc: 'Blast scores nearby pegs', color: '#ff4400', duration: 0 },
  { type: 'giant', name: 'GIANT', desc: '2x ring size', color: '#ffcc00', duration: 0 },
  { type: 'ghost', name: 'GHOST', desc: 'Pass through to peg behind', color: '#aaddff', duration: 0 },
  { type: 'slowmo', name: 'SLOW-MO', desc: 'Slow time for 5 seconds', color: '#33ff88', duration: 5 },
  { type: 'laser', name: 'LASER AIM', desc: 'Perfect aim guide for 8 seconds', color: '#ff0000', duration: 8 },
  { type: 'bounce', name: 'BOUNCE RING', desc: 'Ring bounces extra to hit more pegs', color: '#ff88ff', duration: 0 },
];

const ACHIEVEMENTS: Achievement[] = [
  // Original 40
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
  { id: 'all_modes', name: 'Explorer', desc: 'Play every base game mode' },
  { id: 'fashionista', name: 'Fashionista', desc: 'Use 3 different ring skins' },
  { id: 'theme_all', name: 'Theme Tourist', desc: 'Use all 5+ arena themes' },
  { id: 'lv_10', name: 'Rising Star', desc: 'Reach level 10' },
  { id: 'lv_25', name: 'Expert', desc: 'Reach level 25' },
  { id: 'lv_50', name: 'Grandmaster', desc: 'Reach level 50' },
  { id: 'total_10k', name: 'Career 10K', desc: 'Accumulate 10,000 total score' },
  { id: 'total_50k', name: 'Career 50K', desc: 'Accumulate 50,000 total score' },
  { id: 'bounce_ringer', name: 'Lucky Bounce', desc: 'Ring a peg after bouncing off another' },
  // Power-up achievements (41-55)
  { id: 'pu_first', name: 'Power Player', desc: 'Use your first power-up' },
  { id: 'pu_10', name: 'Powered Up', desc: 'Use 10 power-ups total' },
  { id: 'pu_50', name: 'Power Addict', desc: 'Use 50 power-ups total' },
  { id: 'pu_multi', name: 'Triple Threat', desc: 'Ring 3 pegs with Multi-Ring' },
  { id: 'pu_magnet', name: 'Magnetic Pull', desc: 'Get 5 magnet-assisted ringers' },
  { id: 'pu_fire', name: 'Fire Starter', desc: 'Blast 3+ pegs with Fire Ring' },
  { id: 'pu_giant', name: 'Big Ring Energy', desc: 'Get 5 giant-ring ringers' },
  { id: 'pu_ghost', name: 'Ghost Rider', desc: 'Pass through 3 pegs with Ghost' },
  { id: 'pu_slowmo', name: 'Bullet Time', desc: 'Ring 3 pegs during one Slow-Mo' },
  { id: 'pu_all_types', name: 'Power Collector', desc: 'Use every power-up type' },
  { id: 'pu_combo_5', name: 'Powered Combo', desc: 'Get 5x combo with power-up active' },
  { id: 'pu_fire_golden', name: 'Inferno Golden', desc: 'Hit golden peg with Fire Ring' },
  { id: 'pu_ghost_double', name: 'Phantom Double', desc: 'Ghost through to ring 2 pegs' },
  { id: 'pu_magnet_100', name: 'Magnet Sniper', desc: 'Magnet pull to the golden peg' },
  { id: 'pu_giant_combo', name: 'Giant Streak', desc: 'x5 combo with Giant ring' },
  // Wind achievements (56-65)
  { id: 'wind_first', name: 'Wind Warrior', desc: 'Ring a peg in strong wind' },
  { id: 'wind_5', name: 'Storm Ringer', desc: '5 ringers in windy conditions' },
  { id: 'wind_20', name: 'Gale Force', desc: '20 ringers in windy conditions' },
  { id: 'wind_golden', name: 'Tempest Shot', desc: 'Ring golden peg in strong wind' },
  { id: 'wind_combo_5', name: 'Wind Streak', desc: '5x combo in windy conditions' },
  { id: 'wind_headwind', name: 'Into the Wind', desc: 'Ringer against headwind' },
  { id: 'wind_crosswind', name: 'Cross Shot', desc: 'Ringer in crosswind' },
  { id: 'wind_perfect', name: 'Storm Chaser', desc: '100% accuracy in strong wind game' },
  { id: 'wind_all_dirs', name: 'Weathervane', desc: 'Ring pegs in all wind directions' },
  { id: 'wind_calm', name: 'Zen Tosser', desc: 'Get 10x combo in Zen mode' },
  // Marathon achievements (66-75)
  { id: 'marathon_w1', name: 'First Wave', desc: 'Complete Marathon wave 1' },
  { id: 'marathon_w3', name: 'Wave Rider', desc: 'Reach Marathon wave 3' },
  { id: 'marathon_w5', name: 'Wave Master', desc: 'Reach Marathon wave 5' },
  { id: 'marathon_w10', name: 'Endless Tosser', desc: 'Reach Marathon wave 10' },
  { id: 'marathon_score_5k', name: 'Marathon Gold', desc: 'Score 5K in Marathon' },
  { id: 'marathon_score_10k', name: 'Marathon Platinum', desc: 'Score 10K in Marathon' },
  { id: 'marathon_no_miss_w', name: 'Clean Wave', desc: 'Complete a Marathon wave with no misses' },
  { id: 'marathon_streak_3', name: 'Wave Streak', desc: 'Clear 3 waves with 80%+ accuracy each' },
  { id: 'marathon_golden_w', name: 'Golden Wave', desc: 'Ring golden peg in every wave of a 3+ wave run' },
  { id: 'marathon_comeback', name: 'Comeback King', desc: 'Miss 2 then ring 5 straight in Marathon' },
  // Carnival achievements (76-82)
  { id: 'carnival_first', name: 'Carnival Fun', desc: 'Complete a Carnival game' },
  { id: 'carnival_moving', name: 'Moving Target', desc: 'Ring a moving peg' },
  { id: 'carnival_bonus_3', name: 'Bonus Collector', desc: 'Collect 3 carnival bonuses' },
  { id: 'carnival_score_3k', name: 'Carnival King', desc: 'Score 3K in Carnival' },
  { id: 'carnival_all_move', name: 'Dance Floor', desc: 'Ring 3 different moving pegs' },
  { id: 'carnival_perfect', name: 'Carnival Master', desc: 'Perfect accuracy in Carnival' },
  { id: 'carnival_combo_8', name: 'Party Combo', desc: 'x8 combo in Carnival mode' },
  // Precision achievements (83-88)
  { id: 'precision_first', name: 'Precision Player', desc: 'Complete a Precision game' },
  { id: 'precision_perfect', name: 'Laser Focus', desc: 'Perfect accuracy in Precision' },
  { id: 'precision_1k', name: 'Precision Grand', desc: 'Score 1K in Precision mode' },
  { id: 'precision_golden', name: 'Precision Snipe', desc: 'Ring golden peg in Precision' },
  { id: 'precision_streak', name: 'Precision Streak', desc: '3 perfect Precision games' },
  { id: 'precision_no_close', name: 'Long Range Only', desc: 'Score in Precision without 10-pt pegs' },
  // Zen achievements (89-93)
  { id: 'zen_5min', name: 'Meditation', desc: 'Play 5 minutes in Zen mode' },
  { id: 'zen_10min', name: 'Deep Focus', desc: 'Play 10 minutes in Zen mode' },
  { id: 'zen_100rings', name: 'Zen Master', desc: 'Throw 100 rings in Zen mode' },
  { id: 'zen_combo_10', name: 'Zen Flow', desc: 'x10 combo in Zen mode' },
  { id: 'zen_golden_5', name: 'Zen Gold', desc: 'Ring golden peg 5 times in one Zen session' },
  // Milestone achievements (94-105)
  { id: 'score_25k', name: 'Score Legend', desc: 'Score 25,000+ in a single game' },
  { id: 'thousand_ringers', name: 'Millennium Ring', desc: 'Land 1,000 total ringers' },
  { id: 'total_100k', name: 'Career 100K', desc: 'Accumulate 100,000 total score' },
  { id: 'total_500k', name: 'Career 500K', desc: 'Accumulate 500,000 total score' },
  { id: 'daily_14', name: 'Fortnight', desc: '14-day daily streak' },
  { id: 'daily_30', name: 'Monthly Master', desc: '30-day daily streak' },
  { id: 'all_skins', name: 'Skin Collector', desc: 'Unlock all 14 ring skins' },
  { id: 'all_themes_10', name: 'Theme Master', desc: 'Use all 10 arena themes' },
  { id: 'all_12_modes', name: 'Mode Master', desc: 'Play all 12 game modes' },
  { id: 'play_time_1h', name: 'Hour Player', desc: 'Accumulate 1 hour of play time' },
  { id: 'play_time_5h', name: 'Five Hours', desc: 'Accumulate 5 hours of play time' },
  { id: 'combo_perfect_10', name: 'Perfect Ten', desc: 'x10 combo on golden peg ringer' },
  // Ricochet achievements (106-115)
  { id: 'ricochet_first', name: 'Bouncer', desc: 'Complete a Ricochet game' },
  { id: 'ricochet_bounce_5', name: 'Bank Shot', desc: '5 bounce-ringers in one Ricochet game' },
  { id: 'ricochet_bounce_10', name: 'Pinball Wizard', desc: '10 bounce-ringers in one Ricochet game' },
  { id: 'ricochet_score_3k', name: 'Ricochet Gold', desc: 'Score 3K in Ricochet mode' },
  { id: 'ricochet_combo_5', name: 'Bounce Streak', desc: 'x5 combo from ricochets only' },
  { id: 'ricochet_golden_bounce', name: 'Golden Bounce', desc: 'Bounce to the golden peg' },
  { id: 'ricochet_double_bounce', name: 'Double Bank', desc: 'Bounce off 2 pegs then ringer a 3rd' },
  { id: 'ricochet_triple', name: 'Triple Ricochet', desc: 'Ring 3 pegs via bouncing in one throw' },
  { id: 'ricochet_perfect', name: 'Clean Bouncer', desc: '100% accuracy in Ricochet (5+ rings)' },
  { id: 'ricochet_20_total', name: 'Bounce Master', desc: '20 total Ricochet bounce-scores' },
  // Elimination achievements (116-125)
  { id: 'elim_first', name: 'Eliminator', desc: 'Complete an Elimination game' },
  { id: 'elim_clear', name: 'Board Clear', desc: 'Ring every peg in Elimination' },
  { id: 'elim_3_clears', name: 'Sweep Master', desc: 'Clear 3 boards in Elimination' },
  { id: 'elim_fast_clear', name: 'Speed Sweep', desc: 'Clear board in 6 or fewer rings' },
  { id: 'elim_no_miss', name: 'Perfect Clear', desc: 'Clear board with 0 misses' },
  { id: 'elim_score_5k', name: 'Elim Grand', desc: 'Score 5K in Elimination' },
  { id: 'elim_golden_first', name: 'Golden Start', desc: 'Ring golden peg first in Elimination' },
  { id: 'elim_combo_clear', name: 'Combo Clear', desc: 'Clear board with active combo (3+)' },
  { id: 'elim_3_no_miss', name: 'Flawless Sweep', desc: '3 perfect clears in one session' },
  { id: 'elim_chain_3', name: 'Chain Clear', desc: 'Clear 3 boards in one Elimination run' },
  // New power-up achievements (126-135)
  { id: 'pu_laser_first', name: 'Laser Focus', desc: 'Use Laser Aim power-up' },
  { id: 'pu_laser_golden', name: 'Laser Snipe', desc: 'Ring golden peg with Laser Aim active' },
  { id: 'pu_laser_3', name: 'Precision Strike', desc: '3 ringers during one Laser Aim' },
  { id: 'pu_bounce_first', name: 'Bouncy Ring', desc: 'Use Bounce Ring power-up' },
  { id: 'pu_bounce_multi', name: 'Bounce Frenzy', desc: 'Ring 3+ pegs with one Bounce Ring' },
  { id: 'pu_bounce_golden', name: 'Bounce to Gold', desc: 'Bounce Ring reaches golden peg' },
  { id: 'pu_all_8', name: 'Full Arsenal', desc: 'Use all 8 power-up types' },
  { id: 'pu_100', name: 'Power Century', desc: 'Use 100 power-ups total' },
  { id: 'pu_laser_combo', name: 'Laser Streak', desc: 'x5 combo during Laser Aim' },
  { id: 'pu_bounce_chain', name: 'Chain Bounce', desc: 'Bounce Ring hits 4+ pegs' },
  // Frenzy achievements (136-140)
  { id: 'frenzy_first', name: 'Frenzy!', desc: 'Score during a Score Frenzy event' },
  { id: 'frenzy_5', name: 'Frenzy Hunter', desc: 'Score in 5 separate frenzy events' },
  { id: 'frenzy_golden', name: 'Golden Frenzy', desc: 'Ring golden peg during frenzy' },
  { id: 'frenzy_combo_8', name: 'Frenzy Combo', desc: 'x8 combo during frenzy' },
  { id: 'frenzy_10', name: 'Frenzy Addict', desc: 'Score in 10 frenzy events total' },
  // Board layout achievements (141-145)
  { id: 'layout_diamond', name: 'Diamond Player', desc: 'Play on Diamond layout' },
  { id: 'layout_circle', name: 'Circle Player', desc: 'Play on Circle layout' },
  { id: 'layout_zigzag', name: 'Zigzag Player', desc: 'Play on Zigzag layout' },
  { id: 'layout_all', name: 'Layout Explorer', desc: 'Play on all 4 board layouts' },
  { id: 'trail_master', name: 'Trail Blazer', desc: 'Throw 500 total rings' },
  // Duel achievements (146-160)
  { id: 'duel_first', name: 'Challenger', desc: 'Complete a Duel match' },
  { id: 'duel_win', name: 'Victor', desc: 'Win a Duel match' },
  { id: 'duel_win_3', name: 'Champion Duelist', desc: 'Win 3 Duel matches' },
  { id: 'duel_win_10', name: 'Duel Legend', desc: 'Win 10 Duel matches' },
  { id: 'duel_perfect', name: 'Perfect Duel', desc: '100% accuracy in a Duel' },
  { id: 'duel_comeback', name: 'Comeback Kid', desc: 'Win a Duel after trailing in round 2' },
  { id: 'duel_sweep', name: 'Clean Sweep', desc: 'Win all 3 rounds of a Duel' },
  { id: 'duel_golden_3', name: 'Golden Duelist', desc: 'Ring 3 golden pegs in a single Duel' },
  { id: 'duel_score_2k', name: 'Duel Grand', desc: 'Score 2K in a single Duel' },
  { id: 'duel_dominate', name: 'Domination', desc: 'Win a Duel round by 500+ points' },
  // Arcade achievements (161-175)
  { id: 'arcade_first', name: 'Insert Coin', desc: 'Complete an Arcade run' },
  { id: 'arcade_lv5', name: 'Level 5', desc: 'Reach Arcade level 5' },
  { id: 'arcade_lv10', name: 'Level 10', desc: 'Reach Arcade level 10' },
  { id: 'arcade_lv20', name: 'Level 20', desc: 'Reach Arcade level 20' },
  { id: 'arcade_1up', name: 'Extra Life', desc: 'Earn an extra life in Arcade' },
  { id: 'arcade_bonus', name: 'Bonus Round', desc: 'Trigger a bonus round in Arcade' },
  { id: 'arcade_no_miss_lv', name: 'Perfect Level', desc: 'Clear an Arcade level with 0 misses' },
  { id: 'arcade_3_perfect', name: 'Triple Perfect', desc: 'Clear 3 Arcade levels with 0 misses' },
  { id: 'arcade_score_5k', name: 'Arcade Gold', desc: 'Score 5K in Arcade mode' },
  { id: 'arcade_score_10k', name: 'Arcade Platinum', desc: 'Score 10K in Arcade mode' },
  { id: 'arcade_streak_10', name: 'Arcade Streak', desc: '10 consecutive ringers in Arcade' },
  { id: 'arcade_5_games', name: 'Arcade Regular', desc: 'Play 5 Arcade games' },
  { id: 'arcade_all_bonus', name: 'Bonus Collector', desc: 'Trigger 3 bonus rounds total' },
  { id: 'arcade_survive', name: 'Last Chance', desc: 'Ring on final life with 0 rings left' },
  { id: 'arcade_boss', name: 'Boss Slayer', desc: 'Clear an Arcade boss level (every 5th)' },
  // All modes milestone (176-178)
  { id: 'all_16_modes', name: 'Mode Legend', desc: 'Play all 16 game modes' },
  { id: 'all_skins_21', name: 'Full Collection', desc: 'Unlock all 21 ring skins' },
  { id: 'all_themes_12', name: 'Theme Legend', desc: 'Use all 12 arena themes' },
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

const WIND_LABELS = ['Calm', 'Light', 'Moderate', 'Strong', 'Gale'];
const WIND_ARROWS = ['--', '←', '→', '↙', '↗', '←←', '→→', '↓', '↑'];

// ============================================================
// SAVE DATA MANAGEMENT
// ============================================================

function defaultSave(): SaveData {
  return {
    highScores: [],
    gameHistory: [],
    achievements: [],
    stats: {
      gamesPlayed: 0, totalScore: 0, bestScore: 0,
      totalRings: 0, totalHits: 0, totalMisses: 0,
      bestCombo: 0, trickShotsLanded: 0,
      ringerCount: 0, doubleRingerCount: 0,
      perfectGames: 0, modesPlayed: [],
      skinsUsed: [], themesUsed: [],
      totalPlayTime: 0,
      powerUpsUsed: 0, marathonWavesBeat: 0,
      windRingers: 0, carnivalBonuses: 0,
      fireBlasts: 0, magnetPulls: 0,
      giantRingers: 0, ghostPasses: 0,
      multiRingers: 0, slowmoRingers: 0,
      bestMarathonWave: 0, precisionPerfects: 0,
      zenMinutes: 0,
      ricochetBounceScores: 0, eliminationClears: 0,
      laserAims: 0, bounceRingers: 0,
      frenzyBonuses: 0, boardClears: 0,
      duelsWon: 0, duelsPlayed: 0,
      bestArcadeLevel: 0, arcadeGamesPlayed: 0,
    },
    settings: { masterVol: 0.8, sfxVol: 0.8, musicVol: 0.5, theme: 0, difficulty: 'medium' },
    skin: 0, xp: 0, level: 1,
    dailyStreak: 0, lastDaily: '',
    powerUpInventory: { multi: 3, magnet: 3, fire: 2, giant: 3, ghost: 2, slowmo: 2, laser: 2, bounce: 3 },
    customSettings: { rings: 10, time: 0, wind: 0, movePegs: false, powerUps: false },
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem('neon-toss-save');
    if (raw) {
      const s = JSON.parse(raw);
      const d = defaultSave();
      return {
        ...d, ...s,
        stats: { ...d.stats, ...s.stats },
        settings: { ...d.settings, ...s.settings },
        powerUpInventory: { ...d.powerUpInventory, ...s.powerUpInventory },
        customSettings: { ...d.customSettings, ...s.customSettings },
        gameHistory: s.gameHistory || [],
      };
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
    const p = pitch * (0.95 + Math.random() * 0.1);
    switch (name) {
      case 'throw': {
        this.playTone(220 * p, 'triangle', 0.3, 0.2);
        this.playTone(330 * p, 'sine', 0.2, 0.1);
        break;
      }
      case 'ringer': {
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
        const base = 440 + gameCombo * 30;
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
        if (this.ctx) {
          const t = this.ctx.currentTime;
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
      case 'powerup': {
        this.playTone(660 * p, 'sine', 0.15, 0.25);
        setTimeout(() => this.playTone(990 * p, 'sine', 0.2, 0.25), 60);
        setTimeout(() => this.playTone(1320 * p, 'triangle', 0.25, 0.2), 120);
        break;
      }
      case 'fire': {
        this.playTone(200 * p, 'sawtooth', 0.4, 0.3);
        this.playTone(100 * p, 'sine', 0.5, 0.2);
        setTimeout(() => this.playTone(300 * p, 'sawtooth', 0.3, 0.2), 50);
        break;
      }
      case 'slowmo': {
        this.playTone(880 * p, 'sine', 0.8, 0.15);
        this.playTone(440 * p, 'triangle', 1.0, 0.1);
        break;
      }
      case 'wind': {
        if (this.ctx) {
          const t = this.ctx.currentTime;
          const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) {
            d[i] = (Math.random() * 2 - 1) * 0.1 * (1 - i / d.length);
          }
          const src = this.ctx.createBufferSource();
          const g = this.ctx.createGain();
          src.buffer = buf;
          g.gain.setValueAtTime(0.08, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          src.connect(g); g.connect(this.sfxGain!);
          src.start(t);
        }
        break;
      }
      case 'wave': {
        [440, 660, 880, 1100, 880, 660].forEach((f, i) => {
          setTimeout(() => this.playTone(f * p, 'sine', 0.15, 0.2), i * 50);
        });
        break;
      }
    }
  }

  startMusic() {
    if (!this.ctx) return;
    this.stopMusic();
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

    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.15;
    lfoG.gain.value = 0.02;
    lfo.connect(lfoG); lfoG.connect(padG.gain);
    lfo.start();

    this.droneOscs = [bass, pad, sub, lfo];

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
      if (p.life <= 0) { p.active = false; p.mesh.visible = false; continue; }
      p.vy -= 3 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      (p.mesh.material as MeshBasicMaterial).opacity = p.life / p.maxLife;
    }
  }
}


// ============================================================
// MAIN GAME
// ============================================================

let save = loadSave();
const audio = new AudioManager();

// Game state variables (module-level for audio access)
let gameCombo = 0;

async function main() {
  const container = document.getElementById('app') as HTMLDivElement;

  const world = await World.create(container, {
    xr: { offer: 'once' as any },
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

  world.scene.fog = new Fog(theme().bg, 5, 20);
  world.scene.background = new Color(theme().bg);

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

  // Combo intensity light
  const comboLight = new PointLight('#ffffff', 0, 15);
  comboLight.position.set(0, 3, -3);
  world.scene.add(comboLight);

  // Neon grid floor
  const gridGroup = new Group();
  const gridMat = new LineBasicMaterial({ color: theme().grid, transparent: true, opacity: 0.2 });
  for (let i = -10; i <= 10; i++) {
    const g1 = new BufferGeometry().setFromPoints([new Vector3(i, 0, -10), new Vector3(i, 0, 10)]);
    const g2 = new BufferGeometry().setFromPoints([new Vector3(-10, 0, i), new Vector3(10, 0, i)]);
    gridGroup.add(new Line(g1, gridMat));
    gridGroup.add(new Line(g2, gridMat));
  }
  world.scene.add(gridGroup);

  // Grid ceiling
  const ceilGroup = new Group();
  ceilGroup.position.y = 4;
  for (let i = -10; i <= 10; i++) {
    const g1 = new BufferGeometry().setFromPoints([new Vector3(i, 0, -10), new Vector3(i, 0, 10)]);
    const g2 = new BufferGeometry().setFromPoints([new Vector3(-10, 0, i), new Vector3(10, 0, i)]);
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
    m.position.set((Math.random() - 0.5) * 12, 1 + Math.random() * 2.5, -3 + (Math.random() - 0.5) * 10);
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
    m.position.set((Math.random() - 0.5) * 14, 0.5 + Math.random() * 3, (Math.random() - 0.5) * 14);
    (m as any)._vx = (Math.random() - 0.5) * 0.1;
    (m as any)._vy = (Math.random() - 0.5) * 0.05;
    (m as any)._phase = Math.random() * Math.PI * 2;
    world.scene.add(m);
    ambientParticles.push(m);
  }

  const particles = new ParticlePool(world.scene, 200);

  // ============================================================
  // PEG FIELD
  // ============================================================

  const pegMeshes: { mesh: Group; def: PegDef; glowMesh: Mesh }[] = [];
  let activePegs: PegDef[] = [...ALL_PEGS];

  function buildPegs() {
    pegMeshes.forEach(p => world.scene.remove(p.mesh));
    pegMeshes.length = 0;

    for (const def of activePegs) {
      const g = new Group();
      const isGolden = def.points >= 100;

      const baseMat = new MeshStandardMaterial({
        color: isGolden ? '#ffcc00' : theme().peg,
        emissive: isGolden ? '#aa8800' : theme().peg,
        emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.3,
      });
      const base = new Mesh(new CylinderGeometry(def.radius * 3, def.radius * 3, 0.02, 16), baseMat);
      g.add(base);

      const pegMat = new MeshStandardMaterial({
        color: isGolden ? '#ffcc00' : theme().peg,
        emissive: isGolden ? '#ffaa00' : theme().peg,
        emissiveIntensity: 0.8, metalness: 0.8, roughness: 0.2,
      });
      const peg = new Mesh(new CylinderGeometry(def.radius, def.radius, def.height, 12), pegMat);
      peg.position.y = def.height / 2;
      g.add(peg);

      const edges = new LineSegments(
        new EdgesGeometry(peg.geometry),
        new LineBasicMaterial({ color: isGolden ? '#ffee88' : theme().glow, transparent: true, opacity: 0.4 })
      );
      edges.position.copy(peg.position);
      g.add(edges);

      const tip = new Mesh(
        new SphereGeometry(def.radius * 1.5, 8, 8),
        new MeshStandardMaterial({
          color: isGolden ? '#ffcc00' : theme().peg,
          emissive: isGolden ? '#ffaa00' : theme().peg,
          emissiveIntensity: 1.0, metalness: 0.5, roughness: 0.3,
        })
      );
      tip.position.y = def.height;
      g.add(tip);

      const glowMat = new MeshBasicMaterial({
        color: isGolden ? '#ffcc00' : theme().glow,
        transparent: true, opacity: 0.15, blending: AdditiveBlending,
      });
      const glow = new Mesh(new SphereGeometry(def.radius * 4, 8, 8), glowMat);
      glow.position.y = def.height / 2;
      g.add(glow);

      if (def.points >= 50) {
        const pl = new PointLight(isGolden ? '#ffcc00' : theme().accent, 0.3, 1.5);
        pl.position.y = def.height + 0.1;
        g.add(pl);
      }

      g.position.set(def.x, 0, def.z);
      world.scene.add(g);
      pegMeshes.push({ mesh: g, def, glowMesh: glow });
    }

    // Point value labels above pegs (using small emissive geometry "rings" to indicate value)
    // We'll create small indicator dots above each peg showing its value tier
    for (const pm of pegMeshes) {
      const p = pm.def;
      const isGolden = p.points >= 100;
      const is50 = p.points >= 50;
      const dotCount = isGolden ? 4 : is50 ? 3 : p.points >= 25 ? 2 : 1;
      const dotColor = isGolden ? '#ffcc00' : is50 ? '#ff8800' : p.points >= 25 ? '#00ccff' : '#00ffff';
      const dotGeo = new SphereGeometry(0.008, 4, 4);
      for (let i = 0; i < dotCount; i++) {
        const dotMat = new MeshBasicMaterial({ color: dotColor, transparent: true, opacity: 0.7, blending: AdditiveBlending });
        const dot = new Mesh(dotGeo, dotMat);
        const angle = (i / dotCount) * Math.PI * 2;
        dot.position.set(Math.cos(angle) * 0.04, p.height + 0.06, Math.sin(angle) * 0.04);
        pm.mesh.add(dot);
      }
    }
  }
  buildPegs();

  // Throw line marker
  const throwLine = new Mesh(
    new BoxGeometry(1.5, 0.005, 0.02),
    new MeshBasicMaterial({ color: theme().accent, transparent: true, opacity: 0.6 })
  );
  throwLine.position.set(0, 0.005, -0.5);
  world.scene.add(throwLine);

  // ============================================================
  // WIND SYSTEM
  // ============================================================

  let windX = 0; // horizontal wind force
  let windZ = 0; // forward/back wind force
  let windStrength = 0; // 0-4 index
  let windEnabled = false;
  let windThrowCounter = 0;
  let windDirsUsed = new Set<string>();

  function updateWind() {
    if (!windEnabled) {
      windX = 0; windZ = 0; windStrength = 0;
      return;
    }
    const angle = Math.random() * Math.PI * 2;
    const str = 0.5 + Math.random() * 2.0;
    windX = Math.cos(angle) * str;
    windZ = Math.sin(angle) * str * 0.5;
    windStrength = Math.min(4, Math.floor(str / 0.5));

    // Track wind direction
    if (windX < -0.3) windDirsUsed.add('left');
    if (windX > 0.3) windDirsUsed.add('right');
    if (windZ < -0.3) windDirsUsed.add('forward');
    if (windZ > 0.3) windDirsUsed.add('back');

    audio.playSfx('wind');
  }

  function getWindArrow(): string {
    if (windStrength === 0) return '--';
    const absX = Math.abs(windX);
    const absZ = Math.abs(windZ);
    if (absX > absZ) return windX < 0 ? (windStrength >= 3 ? '←←' : '←') : (windStrength >= 3 ? '→→' : '→');
    return windZ < 0 ? '↑' : '↓';
  }

  // ============================================================
  // RING CREATION & PHYSICS
  // ============================================================

  interface FlyingRing {
    group: Group;
    vx: number; vy: number; vz: number;
    rx: number; rz: number;
    active: boolean;
    landed: boolean;
    landedOnPeg: PegDef | null;
    bounced: boolean;
    age: number;
    trail: Vector3[];
    hasMagnet: boolean;
    isGhost: boolean;
    ghostPassed: number;
    isGiant: boolean;
    isFire: boolean;
    isBounce: boolean;
    bounceCount: number;
    trailLine: Line | null;
  }

  const flyingRings: FlyingRing[] = [];
  const landedRings: Group[] = [];

  function createRingMesh(isGiant = false, specialColor?: string): Group {
    const g = new Group();
    const skin = skinDef();
    const col = specialColor || skin.color;
    const em = specialColor || skin.emissive;
    const gl = specialColor || skin.glow;
    const scale = isGiant ? 2.0 : 1.0;

    const ringMat = new MeshStandardMaterial({
      color: col, emissive: em, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.3,
    });
    const ring = new Mesh(new TorusGeometry(0.08 * scale, 0.015 * scale, 8, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);

    const edges = new LineSegments(
      new EdgesGeometry(ring.geometry),
      new LineBasicMaterial({ color: gl, transparent: true, opacity: 0.5 })
    );
    edges.rotation.x = Math.PI / 2;
    g.add(edges);

    const glowMat = new MeshBasicMaterial({
      color: gl, transparent: true, opacity: 0.2, blending: AdditiveBlending,
    });
    const glow = new Mesh(new TorusGeometry(0.08 * scale, 0.03 * scale, 8, 24), glowMat);
    glow.rotation.x = Math.PI / 2;
    g.add(glow);

    return g;
  }

  function throwRing(power: number, aimXVal: number, aimYVal: number, flags?: {
    magnet?: boolean; ghost?: boolean; giant?: boolean; fire?: boolean; offsetX?: number;
    bounce?: boolean;
  }) {
    const f = flags || {};
    const ring = createRingMesh(
      f.giant,
      f.fire ? '#ff4400' : f.ghost ? '#aaddff88' : f.magnet ? '#4488ff' : f.bounce ? '#ff88ff' : undefined,
    );
    const ox = f.offsetX || 0;
    ring.position.set(aimXVal * 0.3 + ox, 1.2, -0.3);
    world.scene.add(ring);

    const speed = 3 + power * 5;
    const upSpeed = 2 + power * 2;

    // Create trail line
    const trailGeo = new BufferGeometry();
    const trailPositions = new Float32Array(75); // 25 points * 3
    trailGeo.setAttribute('position', new Float32BufferAttribute(trailPositions, 3));
    const trailMat = new LineBasicMaterial({
      color: skinDef().glow, transparent: true, opacity: 0.4, blending: AdditiveBlending,
    });
    const trailLine = new Line(trailGeo, trailMat);
    world.scene.add(trailLine);

    const fr: FlyingRing = {
      group: ring,
      vx: aimXVal * 1.5 + ox * 3,
      vy: upSpeed,
      vz: -speed,
      rx: (Math.random() - 0.5) * 3,
      rz: (Math.random() - 0.5) * 2,
      active: true, landed: false, landedOnPeg: null,
      bounced: false, age: 0, trail: [],
      hasMagnet: !!f.magnet,
      isGhost: !!f.ghost,
      ghostPassed: 0,
      isGiant: !!f.giant,
      isFire: !!f.fire,
      isBounce: !!f.bounce,
      bounceCount: 0,
      trailLine,
    };
    flyingRings.push(fr);
    audio.playSfx('throw');
    gameRingsThrown++;
  }

  function updateRingPhysics(dt: number) {
    const timeMult = slowmoActive ? 0.3 : 1.0;
    const effectiveDt = dt * timeMult;

    for (const fr of flyingRings) {
      if (!fr.active) continue;
      fr.age += effectiveDt;

      // Gravity
      fr.vy -= 6.0 * effectiveDt;

      // Wind
      if (windEnabled) {
        fr.vx += windX * effectiveDt * 0.5;
        fr.vz += windZ * effectiveDt * 0.3;
      }

      // Magnet: curve toward nearest peg
      if (fr.hasMagnet && fr.age > 0.2) {
        let nearDist = Infinity;
        let nearPeg: PegDef | null = null;
        for (const peg of activePegs) {
          const dx = peg.x - fr.group.position.x;
          const dz = peg.z - fr.group.position.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < nearDist) { nearDist = d; nearPeg = peg; }
        }
        if (nearPeg && nearDist < 2) {
          const dx = nearPeg.x - fr.group.position.x;
          const dz = nearPeg.z - fr.group.position.z;
          const force = 2.0 / Math.max(nearDist, 0.3);
          fr.vx += dx / nearDist * force * effectiveDt;
          fr.vz += dz / nearDist * force * effectiveDt;
        }
      }

      fr.group.position.x += fr.vx * effectiveDt;
      fr.group.position.y += fr.vy * effectiveDt;
      fr.group.position.z += fr.vz * effectiveDt;
      fr.group.rotation.x += fr.rx * effectiveDt;
      fr.group.rotation.z += fr.rz * effectiveDt;

      fr.trail.push(fr.group.position.clone());
      if (fr.trail.length > 25) fr.trail.shift();

      // Update trail line VFX
      if (fr.trailLine && fr.trail.length > 1) {
        const posAttr = fr.trailLine.geometry.getAttribute('position') as any;
        for (let ti = 0; ti < 25; ti++) {
          if (ti < fr.trail.length) {
            posAttr.setXYZ(ti, fr.trail[ti].x, fr.trail[ti].y, fr.trail[ti].z);
          } else {
            const last = fr.trail[fr.trail.length - 1];
            posAttr.setXYZ(ti, last.x, last.y, last.z);
          }
        }
        posAttr.needsUpdate = true;
        fr.trailLine.geometry.setDrawRange(0, fr.trail.length);
        (fr.trailLine.material as LineBasicMaterial).opacity = fr.active ? 0.4 : Math.max(0, 0.4 - fr.age * 0.5);
      }

      const ringRadius = fr.isGiant ? 0.16 : 0.08;
      const encircleRange = fr.isGiant ? 0.24 : 0.12;
      const directHitRange = fr.isGiant ? 0.12 : 0.06;

      // Check peg collision
      for (const pm of pegMeshes) {
        const peg = pm.def;
        const pegX = pm.mesh.position.x; // use mesh position for moving pegs
        const dx = fr.group.position.x - pegX;
        const dz = fr.group.position.z - peg.z;
        const dist2D = Math.sqrt(dx * dx + dz * dz);
        const ringY = fr.group.position.y;

        if (dist2D < encircleRange && ringY > 0 && ringY < peg.height + 0.1 && fr.vy < 0) {
          if (dist2D < directHitRange) {
            if (fr.isGhost && fr.ghostPassed < 2) {
              fr.ghostPassed++;
              save.stats.ghostPasses++;
              continue;
            }
            // Bounce off peg body
            if (fr.isBounce && fr.bounceCount < 4) {
              // Bounce ring: redirect toward another peg instead of just bouncing
              fr.bounceCount++;
              const otherPeg = activePegs.find(p => p !== peg && Math.abs(p.x - pegX) + Math.abs(p.z - peg.z) > 0.3);
              if (otherPeg) {
                const tdx = otherPeg.x - fr.group.position.x;
                const tdz = otherPeg.z - fr.group.position.z;
                const tDist = Math.sqrt(tdx*tdx + tdz*tdz);
                fr.vx = (tdx / tDist) * 3;
                fr.vz = (tdz / tDist) * 3;
                fr.vy = 1.5;
              } else {
                fr.vx += dx * 3;
                fr.vz += dz * 3;
                fr.vy *= -0.3;
              }
              fr.bounced = true;
              audio.playSfx('bounce');
              // Ricochet mode: bouncing scores bonus
              if (gameMode === 'ricochet') {
                const bouncePoints = Math.floor(peg.points * 0.5) * Math.min(fr.bounceCount, 5);
                gameScore += bouncePoints;
                save.stats.ricochetBounceScores++;
                showToast('BOUNCE +' + bouncePoints);
                particles.emit(fr.group.position.x, fr.group.position.y, fr.group.position.z, 10, '#ff88ff', 1.5, 0.4);
                checkAchievement('ricochet_bounce_5');
                if (save.stats.ricochetBounceScores >= 20) checkAchievement('ricochet_20_total');
              }
            } else {
              fr.vx += dx * 3;
              fr.vz += dz * 3;
              fr.vy *= -0.3;
              fr.bounced = true;
              audio.playSfx('bounce');
              // Ricochet mode bounce scoring (non-power-up)
              if (gameMode === 'ricochet') {
                const bouncePoints = Math.floor(peg.points * 0.5);
                gameScore += bouncePoints;
                save.stats.ricochetBounceScores++;
                showToast('BOUNCE +' + bouncePoints);
                particles.emit(fr.group.position.x, fr.group.position.y, fr.group.position.z, 8, '#ff88ff', 1.2, 0.3);
              }
            }
          } else if (dist2D < encircleRange && ringY < peg.height - 0.05) {
            // RINGER!
            fr.active = false;
            fr.landed = true;
            fr.landedOnPeg = peg;

            fr.group.position.set(pegX, 0.05, peg.z);
            fr.group.rotation.set(Math.PI / 2, 0, 0);
            landedRings.push(fr.group);

            // Fire ring: blast nearby pegs
            if (fr.isFire) {
              onFireBlast(peg, pegX);
            } else {
              onRinger(peg, fr.bounced, fr.hasMagnet, fr.isGiant);
            }
            break;
          }
        }

        // Near-miss bounce
        if (dist2D < peg.radius + ringRadius + 0.015 && ringY > 0 && ringY < peg.height) {
          if (fr.isGhost && fr.ghostPassed < 2) {
            fr.ghostPassed++;
            save.stats.ghostPasses++;
            continue;
          }
          const nx = dx / dist2D;
          const nz = dz / dist2D;
          const dot = fr.vx * nx + fr.vz * nz;
          if (dot < 0) {
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
          setTimeout(() => { world.scene.remove(fr.group); }, 1000);
        }
        audio.playSfx('land');
      }

      // Out of bounds
      if (fr.group.position.z < -8 || fr.group.position.y < -2 || Math.abs(fr.group.position.x) > 5) {
        fr.active = false;
        fr.landed = true;
        if (!fr.landedOnPeg) onMiss();
        world.scene.remove(fr.group);
      }
    }

    // Cleanup
    for (let i = flyingRings.length - 1; i >= 0; i--) {
      if (!flyingRings[i].active && flyingRings[i].age > 3) {
        if (flyingRings[i].trailLine) world.scene.remove(flyingRings[i].trailLine!);
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
  let gameBestCombo = 0;
  let gameTimeLeft = 0;
  let gameTimePlayed = 0;
  let gameStartTime = 0;
  let isCharging = false;
  let chargePower = 0;
  let aimX = 0;
  let aimY = 0;
  let countdownValue = 3;
  let countdownTimer = 0;
  let comboDecayTimer = 0;
  let trickShotsThisGame: string[] = [];
  let pegHitsThisGame: Map<string, number> = new Map();
  let targetPeg: PegDef | null = null;
  let dailyRng: (() => number) | null = null;
  let toastMsg = '';
  let toastTimer = 0;

  // Power-up state
  let activePowerUp: PowerUpType | null = null;
  let powerUpTimer = 0;
  let slowmoActive = false;
  let slowmoRingersCount = 0;
  let powerUpTypesUsed = new Set<PowerUpType>();
  let nextPowerUp: PowerUpType | null = null;

  // Marathon state
  let marathonWave = 0;
  let marathonWaveRings = 0;
  let marathonWaveHits = 0;
  let marathonWaveMisses = 0;
  let marathonCleanWaves = 0;
  let marathonGoldenWaves = 0;
  let marathonGoldenThisWave = false;
  let marathonComeback = 0; // tracks miss→hit pattern
  let marathonMissBefore = 0;

  // Custom challenge state
  let customRings = 10;
  let customTime = 0;
  let customWind = 0;
  let customMovePegs = false;
  let customPowerUps = false;

  // Zen state
  let zenGoldenCount = 0;

  // Frenzy system
  let frenzyActive = false;
  let frenzyTimer = 0;
  let frenzyMultiplier = 2;
  let frenzyNextCheck = 15; // seconds until next frenzy chance
  let frenzyCount = 0;

  // Elimination state
  let elimPegsRinged = new Set<string>();
  let elimBoardClears = 0;
  let elimPerfectClears = 0;
  let elimFirstPegGolden = false;

  // Ricochet state
  let ricochetBounceHits = 0;
  let ricochetOnlyBounces = true;

  // Laser aim state
  let laserAimActive = false;
  let laserAimTimer = 0;
  let laserAimRingers = 0;

  // Board layout tracking
  let currentLayout = 0;
  let layoutsPlayed = new Set<number>();

  // Duel state
  let duelRound = 1;
  let duelMaxRounds = 3;
  let duelPlayerScore = 0;
  let duelAiScore = 0;
  let duelPlayerRoundScores: number[] = [];
  let duelAiRoundScores: number[] = [];
  let duelIsPlayerTurn = true;
  let duelAiRingsLeft = 0;
  let duelAiTimer = 0;
  let duelPlayerWins = 0;
  let duelAiWins = 0;
  let duelGoldenCount = 0;
  let duelTrashedAfterR2 = false;

  // Arcade state
  let arcadeLevel = 1;
  let arcadeLives = 3;
  let arcadeLevelRings = 5;
  let arcadeLevelHits = 0;
  let arcadeLevelMisses = 0;
  let arcadeBonusActive = false;
  let arcadeBonusTimer = 0;
  let arcadePerfectLevels = 0;
  let arcadeConsecutiveRingers = 0;
  let arcadeBonusTriggered = 0;
  let arcadeExtraLivesEarned = 0;

  // ============================================================
  // POWER-UP SYSTEM
  // ============================================================

  function selectRandomPowerUp(): PowerUpType {
    const types: PowerUpType[] = ['multi', 'magnet', 'fire', 'giant', 'ghost', 'slowmo', 'laser', 'bounce'];
    return types[Math.floor(Math.random() * types.length)];
  }

  function activatePowerUp(type: PowerUpType) {
    const def = POWER_UP_DEFS.find(p => p.type === type)!;
    save.stats.powerUpsUsed++;
    powerUpTypesUsed.add(type);
    checkAchievement('pu_first');
    if (save.stats.powerUpsUsed >= 10) checkAchievement('pu_10');
    if (save.stats.powerUpsUsed >= 50) checkAchievement('pu_50');
    if (save.stats.powerUpsUsed >= 100) checkAchievement('pu_100');
    if (powerUpTypesUsed.size >= 6) checkAchievement('pu_all_types');
    if (powerUpTypesUsed.size >= 8) checkAchievement('pu_all_8');

    audio.playSfx('powerup');
    showToast(def.name + '!');

    if (type === 'slowmo') {
      slowmoActive = true;
      powerUpTimer = 5;
      slowmoRingersCount = 0;
      audio.playSfx('slowmo');
    } else if (type === 'laser') {
      laserAimActive = true;
      laserAimTimer = 8;
      laserAimRingers = 0;
      save.stats.laserAims++;
      checkAchievement('pu_laser_first');
    }

    activePowerUp = type;
    if (def.duration > 0) {
      powerUpTimer = def.duration;
    }
    nextPowerUp = selectRandomPowerUp();
    saveSave(save);
  }

  // ============================================================
  // SCORING & EVENTS
  // ============================================================

  function onRinger(peg: PegDef, bounced: boolean, magnetic = false, giant = false) {
    gameHits++;
    gameCombo++;
    comboDecayTimer = 2.5;
    if (gameCombo > gameBestCombo) gameBestCombo = gameCombo;

    let points = peg.points;
    const mult = Math.min(gameCombo, 10);
    points *= mult;

    // Target mode bonus
    if (gameMode === 'target' && targetPeg === peg) {
      points *= 2;
      showToast('TARGET HIT! x2');
      pickTargetPeg();
    }

    // Precision mode: 5x scoring
    if (gameMode === 'precision') points *= 5;

    // Frenzy multiplier
    if (frenzyActive) {
      points *= frenzyMultiplier;
      save.stats.frenzyBonuses++;
      checkAchievement('frenzy_first');
      if (save.stats.frenzyBonuses >= 5) checkAchievement('frenzy_5');
      if (save.stats.frenzyBonuses >= 10) checkAchievement('frenzy_10');
      if (peg.points >= 100) checkAchievement('frenzy_golden');
      if (gameCombo >= 8) checkAchievement('frenzy_combo_8');
    }

    // Ricochet mode: bonus for intentional bounces
    if (gameMode === 'ricochet' && bounced) {
      points *= 2;
      ricochetBounceHits++;
      if (peg.points >= 100) checkAchievement('ricochet_golden_bounce');
      if (ricochetBounceHits >= 5) checkAchievement('ricochet_bounce_5');
      if (ricochetBounceHits >= 10) checkAchievement('ricochet_bounce_10');
      if (gameCombo >= 5 && ricochetOnlyBounces) checkAchievement('ricochet_combo_5');
      showToast('RICOCHET! x2');
    }
    if (gameMode === 'ricochet' && !bounced) ricochetOnlyBounces = false;

    // Elimination mode: track pegs hit
    if (gameMode === 'elimination') {
      const pegKey = `${peg.x},${peg.z}`;
      if (!elimPegsRinged.has(pegKey)) {
        elimPegsRinged.add(pegKey);
        if (elimPegsRinged.size === 1 && peg.points >= 100) {
          elimFirstPegGolden = true;
          checkAchievement('elim_golden_first');
        }
        // Check board clear
        if (elimPegsRinged.size >= activePegs.length) {
          elimBoardClears++;
          save.stats.boardClears++;
          save.stats.eliminationClears++;
          checkAchievement('elim_clear');
          if (save.stats.boardClears >= 3) { checkAchievement('elim_3_clears'); checkAchievement('elim_3_clears'); }
          if (gameRingsThrown <= 6) checkAchievement('elim_fast_clear');
          if (gameMisses === 0) { elimPerfectClears++; checkAchievement('elim_no_miss'); }
          if (elimPerfectClears >= 3) checkAchievement('elim_3_no_miss');
          if (gameCombo >= 3) checkAchievement('elim_combo_clear');
          if (elimBoardClears >= 3) checkAchievement('elim_chain_3');
          particles.emit(0, 2, -3, 50, '#ffcc00', 4, 1.2);
          showToast('BOARD CLEARED!');
          audio.playSfx('levelup');
          // Reset for next board or end
          elimPegsRinged.clear();
          gameRingsLeft += 5; // bonus rings
          gameScore += 500; // clear bonus
        }
      }
    }

    // Laser aim tracking
    if (laserAimActive) {
      laserAimRingers++;
      if (laserAimRingers >= 3) checkAchievement('pu_laser_3');
      if (peg.points >= 100) checkAchievement('pu_laser_golden');
      if (gameCombo >= 5) checkAchievement('pu_laser_combo');
    }

    // Carnival bonus multiplier
    if (gameMode === 'carnival' && peg.moving) {
      points *= 2;
      save.stats.carnivalBonuses++;
      showToast('MOVING PEG x2!');
      checkAchievement('carnival_moving');
    }

    gameScore += points;

    const key = `${peg.x},${peg.z}`;
    pegHitsThisGame.set(key, (pegHitsThisGame.get(key) || 0) + 1);

    // Wind ringer tracking
    if (windEnabled && windStrength >= 2) {
      save.stats.windRingers++;
      checkAchievement('wind_first');
      if (save.stats.windRingers >= 5) checkAchievement('wind_5');
      if (save.stats.windRingers >= 20) checkAchievement('wind_20');
      if (peg.points >= 100) checkAchievement('wind_golden');
      if (gameCombo >= 5) checkAchievement('wind_combo_5');
      if (windX < -0.5) checkAchievement('wind_crosswind');
      if (windX > 0.5) checkAchievement('wind_crosswind');
      if (windZ < -0.5) checkAchievement('wind_headwind');
    }

    // Power-up stat tracking
    if (magnetic) { save.stats.magnetPulls++; if (save.stats.magnetPulls >= 5) checkAchievement('pu_magnet'); if (peg.points >= 100) checkAchievement('pu_magnet_100'); }
    if (giant) { save.stats.giantRingers++; if (save.stats.giantRingers >= 5) checkAchievement('pu_giant'); if (gameCombo >= 5) checkAchievement('pu_giant_combo'); }
    if (slowmoActive) { slowmoRingersCount++; save.stats.slowmoRingers++; if (slowmoRingersCount >= 3) checkAchievement('pu_slowmo'); }
    if (activePowerUp && gameCombo >= 5) checkAchievement('pu_combo_5');

    // Bounce ring tracking
    if (bounced && activePowerUp === 'bounce') {
      save.stats.bounceRingers++;
      checkAchievement('pu_bounce_first');
      if (peg.points >= 100) checkAchievement('pu_bounce_golden');
    }

    // Slowmo ringer count
    if (slowmoActive) save.stats.slowmoRingers++;

    // Marathon tracking
    if (gameMode === 'marathon') {
      marathonWaveHits++;
      if (peg.points >= 100) marathonGoldenThisWave = true;
      // Comeback tracking
      if (marathonMissBefore >= 2) { marathonComeback++; if (marathonComeback >= 5) checkAchievement('marathon_comeback'); }
      marathonMissBefore = 0;
    }

    // Zen golden tracking
    if (gameMode === 'zen' && peg.points >= 100) {
      zenGoldenCount++;
      if (zenGoldenCount >= 5) checkAchievement('zen_golden_5');
    }

    // Duel: track golden pegs + bind score to player
    if (gameMode === 'duel' && duelIsPlayerTurn) {
      duelPlayerScore = gameScore;
      if (peg.points >= 100) duelGoldenCount++;
      updateDuelPanel();
    }

    // Arcade: track hits
    if (gameMode === 'arcade') {
      arcadeOnHit();
    }

    // Effects
    const color = peg.points >= 100 ? '#ffcc00' : theme().accent;
    particles.emit(peg.x, peg.height, peg.z, 25, color, 2.5, 0.8);

    if (peg.points >= 100) {
      audio.playSfx('golden');
      showToast('GOLDEN RINGER! +' + points);
      checkAchievement('golden_ringer');
      checkAchievement('distance_100');
      if (gameCombo >= 10) checkAchievement('combo_perfect_10');
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
    if (gameCombo >= 10) { checkAchievement('combo_10'); if (gameMode === 'zen') checkAchievement('zen_combo_10'); if (gameMode === 'zen') checkAchievement('wind_calm'); }
    if (bounced) checkAchievement('bounce_ringer');
    if (chargePower >= 0.95) trickShotsThisGame.push('max_power');
    if (chargePower <= 0.15) trickShotsThisGame.push('min_power');
    if (peg.points >= 100) trickShotsThisGame.push('far_golden');
    checkAchievement('first_ringer');

    updateHUD();
  }

  function onFireBlast(centerPeg: PegDef, pegX: number) {
    // Score center peg + all pegs within blast radius
    let hitCount = 0;
    save.stats.fireBlasts++;
    audio.playSfx('fire');
    particles.emit(pegX, centerPeg.height, centerPeg.z, 40, '#ff4400', 4, 1.0);

    for (const pm of pegMeshes) {
      const peg = pm.def;
      const px = pm.mesh.position.x;
      const dx = px - pegX;
      const dz = peg.z - centerPeg.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.5) {
        hitCount++;
        gameHits++;
        gameCombo++;
        comboDecayTimer = 2.5;
        if (gameCombo > gameBestCombo) gameBestCombo = gameCombo;
        const points = peg.points * Math.min(gameCombo, 10);
        gameScore += points;
        particles.emit(px, peg.height, peg.z, 15, '#ff6600', 2, 0.5);
        if (peg.points >= 100) checkAchievement('pu_fire_golden');
      }
    }

    if (hitCount >= 3) checkAchievement('pu_fire');
    showToast('FIRE BLAST! ' + hitCount + ' pegs!');
    updateHUD();
  }

  function onMiss() {
    gameMisses++;
    gameCombo = 0;
    if (gameMode === 'marathon') { marathonWaveMisses++; marathonMissBefore++; marathonComeback = 0; }
    if (gameMode === 'arcade') { arcadeOnMiss(); return; } // arcade handles its own miss flow
    audio.playSfx('miss');
    updateHUD();
  }

  function pickTargetPeg() {
    const idx = Math.floor(Math.random() * activePegs.length);
    targetPeg = activePegs[idx];
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

    // Grant power-ups on level up
    if (save.level % 3 === 0) {
      const type = selectRandomPowerUp();
      save.powerUpInventory[type] = (save.powerUpInventory[type] || 0) + 1;
      showToast('Got ' + POWER_UP_DEFS.find(p => p.type === type)!.name + '!');
    }
    saveSave(save);
  }

  // ============================================================
  // GAME FLOW
  // ============================================================

  function setupMovingPegs() {
    // Make some pegs move for carnival mode
    activePegs = ALL_PEGS.map(p => ({
      ...p,
      moving: true,
      baseX: p.x,
      moveAmplitude: 0.15 + Math.random() * 0.2,
      moveSpeed: 0.8 + Math.random() * 0.8,
      movePhase: Math.random() * Math.PI * 2,
    }));
  }

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
    activePowerUp = null;
    powerUpTimer = 0;
    slowmoActive = false;
    slowmoRingersCount = 0;
    powerUpTypesUsed.clear();
    nextPowerUp = selectRandomPowerUp();
    marathonWave = 1;
    marathonWaveRings = 0;
    marathonWaveHits = 0;
    marathonWaveMisses = 0;
    marathonCleanWaves = 0;
    marathonGoldenWaves = 0;
    marathonGoldenThisWave = false;
    marathonComeback = 0;
    marathonMissBefore = 0;
    zenGoldenCount = 0;
    windDirsUsed.clear();

    // Clear rings
    landedRings.forEach(r => world.scene.remove(r));
    landedRings.length = 0;
    flyingRings.forEach(r => { r.active = false; world.scene.remove(r.group); });
    flyingRings.length = 0;

    // Reset pegs to default
    activePegs = [...ALL_PEGS];
    windEnabled = false;

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
        windEnabled = true;
        updateWind();
        break;
      case 'survival':
        gameRingsLeft = 999;
        gameTimeLeft = diff === 'easy' ? 90 : diff === 'medium' ? 60 : 45;
        break;
      case 'practice':
        gameRingsLeft = 999;
        gameTimeLeft = 0;
        break;
      case 'marathon':
        gameRingsLeft = 10;
        gameTimeLeft = 0;
        windEnabled = true;
        updateWind();
        break;
      case 'precision':
        gameRingsLeft = 3;
        gameTimeLeft = 0;
        break;
      case 'carnival':
        gameRingsLeft = diff === 'easy' ? 15 : diff === 'medium' ? 10 : 7;
        gameTimeLeft = 0;
        setupMovingPegs();
        windEnabled = true;
        updateWind();
        break;
      case 'zen':
        gameRingsLeft = 999;
        gameTimeLeft = 0;
        windEnabled = false;
        break;
      case 'ricochet':
        gameRingsLeft = diff === 'easy' ? 15 : diff === 'medium' ? 10 : 7;
        gameTimeLeft = 0;
        ricochetBounceHits = 0;
        ricochetOnlyBounces = true;
        break;
      case 'elimination':
        gameRingsLeft = diff === 'easy' ? 20 : diff === 'medium' ? 15 : 10;
        gameTimeLeft = 0;
        elimPegsRinged.clear();
        elimBoardClears = 0;
        elimPerfectClears = 0;
        elimFirstPegGolden = false;
        break;
      case 'duel':
        gameRingsLeft = 5; // per turn
        gameTimeLeft = 0;
        duelRound = 1;
        duelMaxRounds = 3;
        duelPlayerScore = 0;
        duelAiScore = 0;
        duelPlayerRoundScores = [];
        duelAiRoundScores = [];
        duelIsPlayerTurn = true;
        duelAiRingsLeft = 0;
        duelAiTimer = 0;
        duelPlayerWins = 0;
        duelAiWins = 0;
        duelGoldenCount = 0;
        duelTrashedAfterR2 = false;
        break;
      case 'arcade':
        arcadeLevel = 1;
        arcadeLives = 3;
        arcadeLevelRings = 5;
        arcadeLevelHits = 0;
        arcadeLevelMisses = 0;
        arcadeBonusActive = false;
        arcadeBonusTimer = 0;
        arcadePerfectLevels = 0;
        arcadeConsecutiveRingers = 0;
        arcadeBonusTriggered = 0;
        arcadeExtraLivesEarned = 0;
        gameRingsLeft = 5;
        gameTimeLeft = 0;
        break;
      case 'custom':
        gameRingsLeft = save.customSettings.rings;
        gameTimeLeft = save.customSettings.time;
        windEnabled = save.customSettings.wind > 0;
        if (save.customSettings.movePegs) setupMovingPegs();
        if (windEnabled) updateWind();
        break;
    }

    gameRingsThrown = 0;
    windThrowCounter = 0;

    // Reset frenzy state
    frenzyActive = false;
    frenzyTimer = 0;
    frenzyNextCheck = 15 + Math.random() * 15;
    frenzyCount = 0;

    // Reset laser aim
    laserAimActive = false;
    laserAimTimer = 0;
    laserAimRingers = 0;

    // Rotate board layout (not for carnival which has its own layout)
    if (mode !== 'carnival') {
      currentLayout = (currentLayout + 1) % ALTERNATE_LAYOUTS.length;
      activePegs = [...ALTERNATE_LAYOUTS[currentLayout]];
      layoutsPlayed.add(currentLayout);
      if (currentLayout === 1) checkAchievement('layout_diamond');
      if (currentLayout === 2) checkAchievement('layout_circle');
      if (currentLayout === 3) checkAchievement('layout_zigzag');
      if (layoutsPlayed.size >= 4) checkAchievement('layout_all');
    }

    // Rebuild pegs for new layout
    buildPegs();

    // Track mode played
    if (!save.stats.modesPlayed.includes(mode)) {
      save.stats.modesPlayed.push(mode);
      if (save.stats.modesPlayed.length >= 8) checkAchievement('all_modes');
      if (save.stats.modesPlayed.length >= 12) checkAchievement('all_12_modes');
      if (save.stats.modesPlayed.length >= 14) checkAchievement('all_12_modes');
      if (save.stats.modesPlayed.length >= 16) checkAchievement('all_16_modes');
    }

    const skinName = RING_SKINS[save.skin].name;
    if (!save.stats.skinsUsed.includes(skinName)) {
      save.stats.skinsUsed.push(skinName);
      if (save.stats.skinsUsed.length >= 3) checkAchievement('fashionista');
    }

    const themeName = THEMES[save.settings.theme].name;
    if (!save.stats.themesUsed.includes(themeName)) {
      save.stats.themesUsed.push(themeName);
      if (save.stats.themesUsed.length >= 5) checkAchievement('theme_all');
      if (save.stats.themesUsed.length >= 10) checkAchievement('all_themes_10');
      if (save.stats.themesUsed.length >= 12) checkAchievement('all_themes_12');
    }

    // Track total rings milestone
    if (save.stats.totalRings >= 500) checkAchievement('trail_master');

    saveSave(save);

    // Start countdown
    gameState = 'countdown';
    countdownValue = 3;
    countdownTimer = 0;
    hideAllPanels();
    showPanel(countdownEntity);
    updatePanel(countdownEntity, 'cd-text', '3');
    audio.playSfx('countdown');
  }

  function advanceMarathonWave() {
    // Check wave completion achievements
    if (marathonWaveMisses === 0 && marathonWaveHits > 0) {
      marathonCleanWaves++;
      checkAchievement('marathon_no_miss_w');
    }
    if (marathonGoldenThisWave) marathonGoldenWaves++;

    save.stats.marathonWavesBeat++;
    if (marathonWave >= 1) checkAchievement('marathon_w1');
    if (marathonWave >= 3) checkAchievement('marathon_w3');
    if (marathonWave >= 5) checkAchievement('marathon_w5');
    if (marathonWave >= 10) checkAchievement('marathon_w10');
    if (marathonCleanWaves >= 3) checkAchievement('marathon_streak_3');
    if (marathonGoldenWaves >= 3 && marathonWave >= 3) checkAchievement('marathon_golden_w');
    if (marathonWave > save.stats.bestMarathonWave) save.stats.bestMarathonWave = marathonWave;

    marathonWave++;
    marathonWaveRings = 0;
    marathonWaveHits = 0;
    marathonWaveMisses = 0;
    marathonGoldenThisWave = false;

    // Each wave: more rings but also harder
    gameRingsLeft = 8 + marathonWave * 2;

    // Increase wind intensity per wave
    windEnabled = true;
    updateWind();

    // Some waves introduce moving pegs
    if (marathonWave >= 3 && marathonWave % 2 === 1) {
      const moveFraction = Math.min(0.6, 0.2 + marathonWave * 0.05);
      activePegs = ALL_PEGS.map(p => {
        if (Math.random() < moveFraction) {
          return { ...p, moving: true, baseX: p.x, moveAmplitude: 0.1 + Math.random() * 0.15, moveSpeed: 0.5 + marathonWave * 0.1, movePhase: Math.random() * Math.PI * 2 };
        }
        return { ...p };
      });
      buildPegs();
    }

    // Grant a random power-up each wave
    const type = selectRandomPowerUp();
    save.powerUpInventory[type] = (save.powerUpInventory[type] || 0) + 1;

    showToast('WAVE ' + marathonWave + '!');
    audio.playSfx('wave');
    updatePanel(waveEntity, 'wave-num', 'WAVE ' + marathonWave);
    updatePanel(waveEntity, 'wave-info', gameRingsLeft + ' rings');
    saveSave(save);
  }

  function endGame() {
    gameState = 'gameOver';
    gameTimePlayed = (Date.now() - gameStartTime) / 1000;

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

    if (gameMode === 'zen') save.stats.zenMinutes += gameTimePlayed / 60;

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
    if (save.stats.ringerCount >= 1000) checkAchievement('thousand_ringers');
    if (gameScore >= 500) checkAchievement('score_500');
    if (gameScore >= 1000) checkAchievement('score_1k');
    if (gameScore >= 5000) checkAchievement('score_5k');
    if (gameScore >= 10000) checkAchievement('score_10k');
    if (gameScore >= 25000) checkAchievement('score_25k');
    if (accuracy >= 0.8 && gameRingsThrown >= 5) checkAchievement('accuracy_80');
    if (accuracy >= 1.0 && gameRingsThrown >= 5) checkAchievement('accuracy_100');
    if (save.stats.gamesPlayed >= 10) checkAchievement('games_10');
    if (save.stats.gamesPlayed >= 50) checkAchievement('games_50');
    if (save.stats.gamesPlayed >= 100) checkAchievement('games_100');
    if (save.stats.totalScore >= 10000) checkAchievement('total_10k');
    if (save.stats.totalScore >= 50000) checkAchievement('total_50k');
    if (save.stats.totalScore >= 100000) checkAchievement('total_100k');
    if (save.stats.totalScore >= 500000) checkAchievement('total_500k');
    if (save.stats.totalPlayTime >= 3600) checkAchievement('play_time_1h');
    if (save.stats.totalPlayTime >= 18000) checkAchievement('play_time_5h');
    if (gameMode === 'speed' && gameHits >= 10) checkAchievement('speed_10');
    if (gameMode === 'survival' && gameTimePlayed >= 30) checkAchievement('survival_30');
    if (gameMode === 'survival' && gameTimePlayed >= 60) checkAchievement('survival_60');
    if (new Set(trickShotsThisGame).size >= 3) checkAchievement('trick_3');
    if (new Set(trickShotsThisGame).size >= 6) checkAchievement('trick_all');
    if (save.dailyStreak >= 14) checkAchievement('daily_14');
    if (save.dailyStreak >= 30) checkAchievement('daily_30');
    if (windEnabled && windStrength >= 2 && accuracy >= 1.0 && gameRingsThrown >= 5) checkAchievement('wind_perfect');
    if (windDirsUsed.size >= 4) checkAchievement('wind_all_dirs');

    // Mode-specific
    if (gameMode === 'marathon') {
      if (gameScore >= 5000) checkAchievement('marathon_score_5k');
      if (gameScore >= 10000) checkAchievement('marathon_score_10k');
    }
    if (gameMode === 'carnival') {
      checkAchievement('carnival_first');
      if (save.stats.carnivalBonuses >= 3) checkAchievement('carnival_bonus_3');
      if (gameScore >= 3000) checkAchievement('carnival_score_3k');
      if (accuracy >= 1.0 && gameRingsThrown >= 5) checkAchievement('carnival_perfect');
      if (gameBestCombo >= 8) checkAchievement('carnival_combo_8');
    }
    if (gameMode === 'precision') {
      checkAchievement('precision_first');
      if (accuracy >= 1.0 && gameRingsThrown >= 3) { save.stats.precisionPerfects++; checkAchievement('precision_perfect'); }
      if (gameScore >= 1000) checkAchievement('precision_1k');
      if (save.stats.precisionPerfects >= 3) checkAchievement('precision_streak');
    }
    if (gameMode === 'zen') {
      if (gameTimePlayed >= 300) checkAchievement('zen_5min');
      if (gameTimePlayed >= 600) checkAchievement('zen_10min');
      if (gameRingsThrown >= 100) checkAchievement('zen_100rings');
    }

    // Ricochet mode achievements
    if (gameMode === 'ricochet') {
      checkAchievement('ricochet_first');
      if (gameScore >= 3000) checkAchievement('ricochet_score_3k');
      if (accuracy >= 1.0 && gameRingsThrown >= 5) checkAchievement('ricochet_perfect');
    }

    // Elimination mode achievements
    if (gameMode === 'elimination') {
      checkAchievement('elim_first');
      if (gameScore >= 5000) checkAchievement('elim_score_5k');
    }

    // Skin unlock checks
    const unlockedSkins = RING_SKINS.filter(s => s.condition(save)).length;
    if (unlockedSkins >= RING_SKINS.length) checkAchievement('all_skins_21');

    // Theme checks
    if (save.stats.themesUsed.length >= 12) checkAchievement('all_themes_12');

    // Daily
    if (gameMode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      if (save.lastDaily !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        save.dailyStreak = (save.lastDaily === yesterday) ? save.dailyStreak + 1 : 1;
        save.lastDaily = today;
        if (save.dailyStreak >= 3) checkAchievement('daily_3');
        if (save.dailyStreak >= 7) checkAchievement('daily_7');
      }
      checkAchievement('daily_done');
    }

    // Duel mode end handling
    if (gameMode === 'duel') {
      save.stats.duelsPlayed++;
      checkAchievement('duel_first');
      if (duelPlayerScore > duelAiScore) {
        save.stats.duelsWon++;
        checkAchievement('duel_win');
        if (save.stats.duelsWon >= 3) checkAchievement('duel_win_3');
        if (save.stats.duelsWon >= 10) checkAchievement('duel_win_10');
        if (duelPlayerWins === duelMaxRounds) checkAchievement('duel_sweep');
        if (duelTrashedAfterR2) checkAchievement('duel_comeback');
        // Check domination
        for (let ri = 0; ri < duelPlayerRoundScores.length; ri++) {
          if (duelPlayerRoundScores[ri] - duelAiRoundScores[ri] >= 500) {
            checkAchievement('duel_dominate');
            break;
          }
        }
      }
      if (accuracy >= 1.0 && gameRingsThrown >= 5) checkAchievement('duel_perfect');
      if (duelGoldenCount >= 3) checkAchievement('duel_golden_3');
      if (duelPlayerScore >= 2000) checkAchievement('duel_score_2k');
    }

    // Arcade mode end handling
    if (gameMode === 'arcade') {
      save.stats.arcadeGamesPlayed++;
      if (arcadeLevel > save.stats.bestArcadeLevel) save.stats.bestArcadeLevel = arcadeLevel;
      checkAchievement('arcade_first');
      if (arcadeLevel >= 5) checkAchievement('arcade_lv5');
      if (arcadeLevel >= 10) checkAchievement('arcade_lv10');
      if (arcadeLevel >= 20) checkAchievement('arcade_lv20');
      if (save.stats.arcadeGamesPlayed >= 5) checkAchievement('arcade_5_games');
      if (gameScore >= 5000) checkAchievement('arcade_score_5k');
      if (gameScore >= 10000) checkAchievement('arcade_score_10k');
      if (arcadeBonusTriggered >= 3) checkAchievement('arcade_all_bonus');
    }

    // Leaderboard & history
    const entry: LeaderEntry = {
      score: gameScore, mode: gameMode, difficulty: gameDifficulty,
      rings: gameRingsThrown, accuracy: Math.round(accuracy * 100),
      date: new Date().toISOString().split('T')[0],
    };
    save.highScores.push(entry);
    save.highScores.sort((a, b) => b.score - a.score);
    if (save.highScores.length > 20) save.highScores.length = 20;

    save.gameHistory.unshift(entry);
    if (save.gameHistory.length > 100) save.gameHistory.length = 100;

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
    e.object3D!.position.set(x, y, z);
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

  // Panel entities
  const titleEntity = createWorldPanel('/ui/title.json', 0, 1.6, -2.5, 1.0, 1.2);
  const modeEntity = createWorldPanel('/ui/modeselect.json', 0, 1.6, -2.5, 1.0, 1.4);
  const diffEntity = createWorldPanel('/ui/difficulty.json', 0, 1.6, -2.5, 0.8, 0.8);
  const hudEntity = createFollowerPanel('/ui/hud.json', 0.3, -0.12, -0.5, 0.35, 0.2);
  const powerEntity = createFollowerPanel('/ui/power.json', -0.3, -0.15, -0.5, 0.15, 0.05);
  const pauseEntity = createWorldPanel('/ui/pause.json', 0, 1.6, -2.0, 0.6, 0.5);
  const gameOverEntity = createWorldPanel('/ui/gameover.json', 0, 1.6, -2.0, 0.9, 1.0);
  const leaderEntity = createWorldPanel('/ui/leaderboard.json', 0, 1.6, -2.5, 1.0, 1.0);
  const achieveEntity = createWorldPanel('/ui/achievements.json', 0, 1.6, -2.5, 1.0, 1.2);
  const settingsEntity = createWorldPanel('/ui/settings.json', 0, 1.6, -2.5, 0.9, 1.0);
  const statsEntity = createWorldPanel('/ui/stats.json', 0, 1.6, -2.5, 0.9, 1.0);
  const skinsEntity = createWorldPanel('/ui/skins.json', 0, 1.6, -2.5, 0.9, 1.0);
  const helpEntity = createWorldPanel('/ui/help.json', 0, 1.6, -2.5, 1.0, 1.4);
  const countdownEntity = createFollowerPanel('/ui/countdown.json', 0, 0, -0.6, 0.2, 0.15);
  const toastEntity = createFollowerPanel('/ui/toast.json', 0, 0.15, -0.5, 0.4, 0.08);
  const puEntity = createFollowerPanel('/ui/powerups.json', -0.3, -0.05, -0.5, 0.2, 0.15);
  const windEntity = createFollowerPanel('/ui/wind.json', 0.3, 0.05, -0.5, 0.2, 0.06);
  const waveEntity = createFollowerPanel('/ui/wave.json', -0.3, 0.05, -0.5, 0.2, 0.1);
  const challengeEntity = createWorldPanel('/ui/challenge.json', 0, 1.6, -2.5, 0.9, 1.2);
  const historyEntity = createWorldPanel('/ui/history.json', 0, 1.6, -2.5, 1.0, 1.2);
  const duelEntity = createFollowerPanel('/ui/duel.json', -0.32, 0.1, -0.5, 0.35, 0.2);
  const arcadeEntity = createFollowerPanel('/ui/arcade.json', -0.32, 0.1, -0.5, 0.3, 0.1);

  function hideAllPanels() {
    panelEntities.forEach(e => hidePanel(e));
  }
  function showPanel(e: any) { if (e?.object3D) e.object3D.visible = true; }
  function hidePanel(e: any) { if (e?.object3D) e.object3D.visible = false; }

  function updatePanel(entity: any, id: string, text: string) {
    try {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (doc) {
        const el = doc.getElementById(id) as any;
        if (el && el.text) el.text.value = text;
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

    // Wind indicator
    if (windEnabled) {
      updatePanel(windEntity, 'wind-dir', getWindArrow());
      updatePanel(windEntity, 'wind-str', WIND_LABELS[Math.min(windStrength, 4)]);
      showPanel(windEntity);
    } else {
      hidePanel(windEntity);
    }

    // Power-up indicator
    if (nextPowerUp && (gameMode !== 'zen')) {
      const def = POWER_UP_DEFS.find(p => p.type === nextPowerUp)!;
      const stock = save.powerUpInventory[nextPowerUp] || 0;
      updatePanel(puEntity, 'pu-name', stock > 0 ? def.name : 'EMPTY');
      updatePanel(puEntity, 'pu-timer', slowmoActive ? Math.ceil(powerUpTimer) + 's' : '');
      updatePanel(puEntity, 'pu-stock', stock > 0 ? 'Q: Use (' + stock + ')' : 'No stock');
      showPanel(puEntity);
    } else {
      hidePanel(puEntity);
    }

    // Marathon wave
    if (gameMode === 'marathon') {
      showPanel(waveEntity);
    } else {
      hidePanel(waveEntity);
    }

    // Duel panel
    if (gameMode === 'duel') {
      updateDuelPanel();
      showPanel(duelEntity);
    } else {
      hidePanel(duelEntity);
    }

    // Arcade panel
    if (gameMode === 'arcade') {
      updateArcadePanel();
      showPanel(arcadeEntity);
    } else {
      hidePanel(arcadeEntity);
    }
  }

  // ============================================================
  // UI EVENT BINDING
  // ============================================================

  let uiBound = false;
  function tryBindUI() {
    if (uiBound) return;
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
    bind(titleEntity, 'btn-history', () => { audio.playSfx('click'); gameState = 'history'; refreshHistory(); hideAllPanels(); showPanel(historyEntity); });

    // Mode select - all 12 modes + custom
    const modes: GameMode[] = ['classic', 'speed', 'target', 'distance', 'trick', 'daily', 'survival', 'practice', 'marathon', 'precision', 'carnival', 'zen', 'ricochet', 'elimination', 'duel', 'arcade'];
    modes.forEach(m => {
      bind(modeEntity, 'btn-' + m, () => { audio.playSfx('click'); gameMode = m; gameState = 'difficulty'; hideAllPanels(); showPanel(diffEntity); });
    });
    bind(modeEntity, 'btn-custom', () => { audio.playSfx('click'); gameState = 'challenge'; refreshChallenge(); hideAllPanels(); showPanel(challengeEntity); });

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
      { ent: historyEntity, btn: 'btn-hi-back' },
      { ent: challengeEntity, btn: 'btn-ch-back' },
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
        saveSave(save); audio.playSfx('click');
      });
      bind(settingsEntity, vc.down, () => {
        save.settings[vc.key] = Math.max(0, save.settings[vc.key] - 0.1);
        audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol);
        updatePanel(settingsEntity, vc.id, Math.round(save.settings[vc.key] * 100) + '%');
        saveSave(save); audio.playSfx('click');
      });
    });

    // Theme controls
    bind(settingsEntity, 'btn-theme-prev', () => {
      save.settings.theme = (save.settings.theme - 1 + THEMES.length) % THEMES.length;
      updatePanel(settingsEntity, 'set-theme', THEMES[save.settings.theme].name);
      applyTheme(); saveSave(save); audio.playSfx('click');
    });
    bind(settingsEntity, 'btn-theme-next', () => {
      save.settings.theme = (save.settings.theme + 1) % THEMES.length;
      updatePanel(settingsEntity, 'set-theme', THEMES[save.settings.theme].name);
      applyTheme(); saveSave(save); audio.playSfx('click');
    });

    // Skins (20 total)
    for (let i = 0; i < RING_SKINS.length; i++) {
      bind(skinsEntity, 'btn-skin-' + i, () => {
        if (RING_SKINS[i].condition(save)) {
          save.skin = i; saveSave(save); refreshSkins(); audio.playSfx('click');
        }
      });
    }

    // Achievement pagination
    bind(achieveEntity, 'btn-ach-prev', () => { achievePage = Math.max(0, achievePage - 1); refreshAchievements(); audio.playSfx('click'); });
    bind(achieveEntity, 'btn-ach-next', () => { achievePage = Math.min(Math.floor((ACHIEVEMENTS.length - 1) / 15), achievePage + 1); refreshAchievements(); audio.playSfx('click'); });

    // History pagination
    bind(historyEntity, 'btn-hi-prev', () => { historyPage = Math.max(0, historyPage - 1); refreshHistory(); audio.playSfx('click'); });
    bind(historyEntity, 'btn-hi-next', () => {
      historyPage = Math.min(Math.floor((save.gameHistory.length - 1) / 10), historyPage + 1);
      refreshHistory(); audio.playSfx('click');
    });

    // Custom challenge controls
    bind(challengeEntity, 'btn-ch-rings-up', () => { customRings = Math.min(50, customRings + 5); updatePanel(challengeEntity, 'ch-rings', String(customRings)); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-rings-down', () => { customRings = Math.max(1, customRings - 5); updatePanel(challengeEntity, 'ch-rings', String(customRings)); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-time-up', () => { customTime = Math.min(120, customTime + 15); updatePanel(challengeEntity, 'ch-time', customTime > 0 ? customTime + 's' : 'OFF'); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-time-down', () => { customTime = Math.max(0, customTime - 15); updatePanel(challengeEntity, 'ch-time', customTime > 0 ? customTime + 's' : 'OFF'); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-wind-up', () => { customWind = Math.min(4, customWind + 1); updatePanel(challengeEntity, 'ch-wind', customWind > 0 ? WIND_LABELS[customWind] : 'OFF'); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-wind-down', () => { customWind = Math.max(0, customWind - 1); updatePanel(challengeEntity, 'ch-wind', customWind > 0 ? WIND_LABELS[customWind] : 'OFF'); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-move', () => { customMovePegs = !customMovePegs; updatePanel(challengeEntity, 'btn-ch-move', customMovePegs ? 'ON' : 'OFF'); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-power', () => { customPowerUps = !customPowerUps; updatePanel(challengeEntity, 'btn-ch-power', customPowerUps ? 'ON' : 'OFF'); audio.playSfx('click'); });
    bind(challengeEntity, 'btn-ch-go', () => {
      save.customSettings = { rings: customRings, time: customTime, wind: customWind, movePegs: customMovePegs, powerUps: customPowerUps };
      saveSave(save);
      audio.playSfx('click');
      startGame('custom');
    });

    uiBound = true;
  }

  let achievePage = 0;
  let historyPage = 0;

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
    for (let i = 0; i < RING_SKINS.length; i++) {
      const s = RING_SKINS[i];
      if (!s) continue;
      const unlocked = s.condition(save);
      const equipped = save.skin === i;
      const status = equipped ? 'EQUIPPED' : unlocked ? 'UNLOCKED' : s.unlock;
      updatePanel(skinsEntity, 'skin-name-' + i, s.name);
      updatePanel(skinsEntity, 'skin-status-' + i, status);
    }
  }

  function refreshHistory() {
    const start = historyPage * 10;
    for (let i = 0; i < 10; i++) {
      const idx = start + i;
      const entry = save.gameHistory[idx];
      if (entry) {
        updatePanel(historyEntity, 'hi-idx-' + i, String(idx + 1));
        updatePanel(historyEntity, 'hi-score-' + i, String(entry.score));
        updatePanel(historyEntity, 'hi-mode-' + i, entry.mode.toUpperCase());
        updatePanel(historyEntity, 'hi-acc-' + i, entry.accuracy + '%');
        updatePanel(historyEntity, 'hi-date-' + i, entry.date);
      } else {
        updatePanel(historyEntity, 'hi-idx-' + i, '-');
        updatePanel(historyEntity, 'hi-score-' + i, '-');
        updatePanel(historyEntity, 'hi-mode-' + i, '-');
        updatePanel(historyEntity, 'hi-acc-' + i, '-');
        updatePanel(historyEntity, 'hi-date-' + i, '-');
      }
    }
    const totalPages = Math.max(1, Math.ceil(save.gameHistory.length / 10));
    updatePanel(historyEntity, 'hi-page', `${historyPage + 1}/${totalPages}`);
  }

  function refreshChallenge() {
    updatePanel(challengeEntity, 'ch-rings', String(customRings));
    updatePanel(challengeEntity, 'ch-time', customTime > 0 ? customTime + 's' : 'OFF');
    updatePanel(challengeEntity, 'ch-wind', customWind > 0 ? WIND_LABELS[customWind] : 'OFF');
  }

  function applyTheme() {
    const t = theme();
    world.scene.fog = new Fog(t.bg, 5, 20);
    world.scene.background = new Color(t.bg);
    accentLight1.color.set(t.accent);
    accentLight2.color.set(t.accent);
    buildPegs();
  }

  function goToTitle() {
    gameState = 'title';
    hideAllPanels();
    showPanel(titleEntity);
    const title = XP_TITLES[Math.min(Math.floor((save.level - 1) / 2.5), 19)];
    updatePanel(titleEntity, 'title-level', 'Lv.' + save.level + ' ' + title);
  }


  // ============================================================
  // DUEL AI LOGIC
  // ============================================================

  function duelAiThrow() {
    // AI has variable accuracy based on difficulty
    const aiAccuracy = gameDifficulty === 'easy' ? 0.4 : gameDifficulty === 'medium' ? 0.6 : 0.8;
    const aimBias = (Math.random() - 0.5) * (1 - aiAccuracy) * 2; // worse AI = more random aim
    const power = 0.3 + Math.random() * 0.5;
    throwRing(power, aimBias, 0, {});
  }

  function duelEndRound() {
    // End player turn, run AI round
    duelPlayerRoundScores.push(gameScore - (duelPlayerRoundScores.reduce((a, b) => a + b, 0) || 0));
    duelIsPlayerTurn = false;
    duelAiRingsLeft = 5;
    duelAiTimer = 0;
    showToast('CPU TURN...');
    updateDuelPanel();
  }

  function duelAiUpdate(dt: number) {
    if (!duelIsPlayerTurn && gameState === 'playing' && duelAiRingsLeft > 0) {
      duelAiTimer += dt;
      if (duelAiTimer >= 1.5) { // AI throws every 1.5 seconds
        duelAiTimer = 0;
        duelAiRingsLeft--;
        duelAiThrow();
        // Simulate AI scoring (simplified)
        const aiAccuracy = gameDifficulty === 'easy' ? 0.35 : gameDifficulty === 'medium' ? 0.55 : 0.75;
        if (Math.random() < aiAccuracy) {
          const pegIdx = Math.floor(Math.random() * activePegs.length);
          const peg = activePegs[pegIdx];
          const pts = peg.points * (1 + Math.floor(Math.random() * 3)); // some combo chance
          duelAiScore += pts;
        }
        updateDuelPanel();

        if (duelAiRingsLeft <= 0) {
          // AI round done
          duelAiRoundScores.push(duelAiScore - (duelAiRoundScores.reduce((a, b) => a + b, 0) || 0));
          const prs = duelPlayerRoundScores[duelPlayerRoundScores.length - 1] || 0;
          const ars = duelAiRoundScores[duelAiRoundScores.length - 1] || 0;
          if (prs > ars) duelPlayerWins++;
          else if (ars > prs) duelAiWins++;

          // Check if trailing after round 2
          if (duelRound === 2 && duelAiScore > duelPlayerScore) duelTrashedAfterR2 = true;

          if (duelRound >= duelMaxRounds) {
            // End duel
            endGame();
            return;
          }

          duelRound++;
          duelIsPlayerTurn = true;
          gameRingsLeft = 5;
          gameRingsThrown = 0; // reset ring count for new round
          showToast('ROUND ' + duelRound + ' - YOUR TURN');
          updateDuelPanel();
        }
      }
    }
  }

  function updateDuelPanel() {
    updatePanel(duelEntity, 'duel-p-score', String(duelPlayerScore));
    updatePanel(duelEntity, 'duel-ai-score', String(duelAiScore));
    updatePanel(duelEntity, 'duel-round', 'Round ' + duelRound + ' of ' + duelMaxRounds);
    updatePanel(duelEntity, 'duel-turn', duelIsPlayerTurn ? 'YOUR TURN' : 'CPU TURN');
    updatePanel(duelEntity, 'duel-rings', 'Rings: ' + (duelIsPlayerTurn ? gameRingsLeft : duelAiRingsLeft));
  }

  // ============================================================
  // ARCADE LEVEL LOGIC
  // ============================================================

  function arcadeNextLevel() {
    // Check for perfect level
    if (arcadeLevelMisses === 0 && arcadeLevelHits > 0) {
      arcadePerfectLevels++;
      checkAchievement('arcade_no_miss_lv');
      if (arcadePerfectLevels >= 3) checkAchievement('arcade_3_perfect');
    }

    // Boss level every 5th
    if (arcadeLevel % 5 === 0) {
      checkAchievement('arcade_boss');
      showToast('BOSS CLEARED!');
      // Extra rings for boss victory
      gameRingsLeft += 3;
    }

    arcadeLevel++;
    arcadeLevelRings = Math.max(3, 5 + Math.floor(arcadeLevel / 2));
    gameRingsLeft = arcadeLevelRings;
    arcadeLevelHits = 0;
    arcadeLevelMisses = 0;
    gameRingsThrown = 0;

    // Extra life every 5 levels
    if (arcadeLevel % 5 === 0 && arcadeLives < 5) {
      arcadeLives++;
      arcadeExtraLivesEarned++;
      checkAchievement('arcade_1up');
      showToast('EXTRA LIFE! ♥');
    }

    // Bonus round chance every 3 levels
    if (arcadeLevel % 3 === 0 && !arcadeBonusActive) {
      arcadeBonusActive = true;
      arcadeBonusTimer = 10;
      arcadeBonusTriggered++;
      checkAchievement('arcade_bonus');
      showToast('BONUS ROUND! 2x ALL!');
      audio.playSfx('wave');
    }

    // Increase difficulty: more wind, moving pegs at higher levels
    if (arcadeLevel >= 5) {
      windEnabled = true;
      updateWind();
    }
    if (arcadeLevel >= 10 && arcadeLevel % 3 === 0) {
      // Some pegs start moving
      activePegs = activePegs.map(p => {
        if (Math.random() < 0.3) {
          return { ...p, moving: true, baseX: p.x, moveAmplitude: 0.1, moveSpeed: 0.5 + arcadeLevel * 0.05, movePhase: Math.random() * Math.PI * 2 };
        }
        return p;
      });
      buildPegs();
    }

    // Update arcade HUD
    updateArcadePanel();
    showToast('LEVEL ' + arcadeLevel);
    audio.playSfx('levelup');
  }

  function arcadeOnHit() {
    arcadeLevelHits++;
    arcadeConsecutiveRingers++;
    if (arcadeConsecutiveRingers >= 10) checkAchievement('arcade_streak_10');

    // Arcade bonus: 2x scoring
    if (arcadeBonusActive) {
      const bonus = Math.floor(gameScore * 0.1); // extra 10% during bonus
      gameScore += bonus;
    }
  }

  function arcadeOnMiss() {
    arcadeLevelMisses++;
    arcadeConsecutiveRingers = 0;
    arcadeLives--;

    // Last chance achievement
    if (arcadeLives === 0 && gameRingsLeft === 0) {
      // Will trigger on next ringer if they somehow get one
    }

    updateArcadePanel();

    if (arcadeLives <= 0) {
      endGame();
    }
  }

  function updateArcadePanel() {
    updatePanel(arcadeEntity, 'arc-level', String(arcadeLevel));
    let hearts = '';
    for (let i = 0; i < arcadeLives; i++) hearts += '♥';
    updatePanel(arcadeEntity, 'arc-lives', hearts || 'X');
    updatePanel(arcadeEntity, 'arc-bonus', arcadeBonusActive ? Math.ceil(arcadeBonusTimer) + 's' : '--');
  }

  // ============================================================
  // INPUT
  // ============================================================

  const keyboard = (world.input as any).keyboard ?? world.input;

  function doThrow() {
    if (gameRingsLeft <= 0 && gameRingsLeft < 900) return;
    if (gameMode === 'duel' && !duelIsPlayerTurn) return; // Can't throw during AI turn

    const flags: { magnet?: boolean; ghost?: boolean; giant?: boolean; fire?: boolean; offsetX?: number; bounce?: boolean } = {};

    // Apply active power-up
    if (activePowerUp === 'magnet') { flags.magnet = true; activePowerUp = null; save.stats.magnetPulls++; }
    else if (activePowerUp === 'ghost') { flags.ghost = true; activePowerUp = null; }
    else if (activePowerUp === 'giant') { flags.giant = true; activePowerUp = null; }
    else if (activePowerUp === 'fire') { flags.fire = true; activePowerUp = null; }
    else if (activePowerUp === 'bounce') { flags.bounce = true; activePowerUp = null; checkAchievement('pu_bounce_first'); }
    else if (activePowerUp === 'multi') {
      // Throw 3 rings
      throwRing(chargePower, aimX, aimY, { offsetX: -0.1 });
      throwRing(chargePower, aimX, aimY, { offsetX: 0.1 });
      throwRing(chargePower, aimX, aimY, {});
      save.stats.multiRingers++;
      activePowerUp = null;
      if (gameRingsLeft < 900) gameRingsLeft = Math.max(0, gameRingsLeft - 3);
      // Wind changes on throw
      windThrowCounter += 3;
      if (windEnabled && windThrowCounter >= 3) { updateWind(); windThrowCounter = 0; }
      updateHUD();
      return;
    }

    throwRing(chargePower, aimX, aimY, flags);
    if (gameRingsLeft < 900) gameRingsLeft--;

    // Wind changes every 3 throws
    windThrowCounter++;
    if (windEnabled && windThrowCounter >= 3) { updateWind(); windThrowCounter = 0; }

    // Precision mode: earn back rings on hits
    // (checked in onRinger)

    updateHUD();
  }

  function tryActivatePowerUp() {
    if (!nextPowerUp) return;
    if (gameMode === 'zen') return;
    if (gameMode === 'custom' && !save.customSettings.powerUps) return;

    const stock = save.powerUpInventory[nextPowerUp] || 0;
    if (stock <= 0) return;

    save.powerUpInventory[nextPowerUp]--;
    activatePowerUp(nextPowerUp);
  }

  function handleInput(dt: number) {
    if (gameState === 'playing') {
      // Aim
      if (keyboard.getKeyPressed('ArrowLeft') || keyboard.getKeyPressed('KeyA')) {
        aimX = Math.max(-1, aimX - 2 * dt);
      }
      if (keyboard.getKeyPressed('ArrowRight') || keyboard.getKeyPressed('KeyD')) {
        aimX = Math.min(1, aimX + 2 * dt);
      }

      // Charge/throw
      if (keyboard.getKeyPressed('Space')) {
        if (!isCharging) { isCharging = true; chargePower = 0; }
        chargePower = Math.min(1, chargePower + dt * 1.2);
        updatePanel(powerEntity, 'power-bar', getPowerBar(chargePower));
        showPanel(powerEntity);
      } else if (isCharging) {
        isCharging = false;
        doThrow();
        chargePower = 0;
        hidePanel(powerEntity);
      }

      // Power-up activation (Q key)
      if (keyboard.getKeyDown('KeyQ')) {
        tryActivatePowerUp();
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
      if (keyboard.getKeyDown('KeyR')) startGame(gameMode);
      if (keyboard.getKeyDown('Escape')) goToTitle();
    } else if (gameState === 'title') {
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
          const axes = rightGP.getAxesValues?.({ index: 0 });
          if (axes) aimX = Math.max(-1, Math.min(1, aimX + axes.x * 2 * dt));

          const triggerDown = rightGP.getButtonPressed?.({ index: 0 });
          if (triggerDown) {
            if (!isCharging) { isCharging = true; chargePower = 0; }
            chargePower = Math.min(1, chargePower + dt * 1.2);
            updatePanel(powerEntity, 'power-bar', getPowerBar(chargePower));
            showPanel(powerEntity);
          } else if (isCharging) {
            isCharging = false;
            doThrow();
            chargePower = 0;
            hidePanel(powerEntity);
          }

          // A button: power-up
          const aDown = rightGP.getButtonDown?.({ index: 3 });
          if (aDown) tryActivatePowerUp();

          // B button: pause
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
    const simDt = 0.05;

    // Laser aim: brighter, more dots, solid line
    const dotOpacity = laserAimActive ? 0.7 : 0.3;
    const dotColor = laserAimActive ? '#ff0000' : theme().accent;

    for (let i = 0; i < 30; i++) {
      // Apply wind to simulation
      if (windEnabled) {
        vx += windX * simDt * 0.5;
        vz += windZ * simDt * 0.3;
      }
      px += vx * simDt;
      py += vy * simDt;
      pz += vz * simDt;
      vy -= 6.0 * simDt;

      aimDots[i].position.set(px, py, pz);
      (aimDots[i].material as MeshBasicMaterial).color.set(dotColor);
      (aimDots[i].material as MeshBasicMaterial).opacity = dotOpacity * (1 - i / 30);
      // Laser: larger dots
      if (laserAimActive) {
        aimDots[i].scale.setScalar(2.0);
      } else {
        aimDots[i].scale.setScalar(1.0);
      }
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
        if (comboDecayTimer <= 0) { gameCombo = 0; updateHUD(); }
      }

      // Timer modes
      if (gameTimeLeft > 0) {
        gameTimeLeft -= dt;
        updateHUD();
        if (gameTimeLeft <= 0) { gameTimeLeft = 0; endGame(); return; }
        if (gameTimeLeft <= 5 && Math.floor(gameTimeLeft) !== Math.floor(gameTimeLeft + dt)) audio.playSfx('countdown');
      }

      // Power-up timer (slow-mo)
      if (slowmoActive) {
        powerUpTimer -= dt;
        updatePanel(puEntity, 'pu-timer', Math.ceil(powerUpTimer) + 's');
        if (powerUpTimer <= 0) { slowmoActive = false; activePowerUp = null; showToast('Slow-Mo ended'); }
      }

      // Laser aim timer
      if (laserAimActive) {
        laserAimTimer -= dt;
        if (laserAimTimer <= 0) { laserAimActive = false; showToast('Laser Aim ended'); }
      }

      // Frenzy system
      if (!frenzyActive) {
        frenzyNextCheck -= dt;
        if (frenzyNextCheck <= 0 && gameMode !== 'zen' && gameMode !== 'practice') {
          frenzyActive = true;
          frenzyMultiplier = Math.random() < 0.3 ? 3 : 2;
          frenzyTimer = 5 + Math.random() * 5;
          frenzyCount++;
          showToast('SCORE FRENZY x' + frenzyMultiplier + '!');
          audio.playSfx('wave');
          particles.emit(0, 2, -3, 30, '#ffcc00', 3, 1);
        }
      } else {
        frenzyTimer -= dt;
        if (frenzyTimer <= 0) {
          frenzyActive = false;
          frenzyNextCheck = 20 + Math.random() * 20;
          showToast('Frenzy ended');
        }
      }

      // Check if out of rings
      if (gameRingsLeft <= 0 && gameRingsLeft < 900) {
        if (flyingRings.every(r => !r.active)) {
          // Marathon: advance wave instead of ending
          if (gameMode === 'marathon') {
            advanceMarathonWave();
          } else if (gameMode === 'precision') {
            // Precision: if you hit all, earn more rings
            if (gameMisses === 0 && gameHits > 0 && gameRingsThrown === gameHits) {
              gameRingsLeft = 3; // bonus round
              showToast('PERFECT! +3 RINGS');
            } else {
              endGame();
              return;
            }
          } else if (gameMode === 'duel' && duelIsPlayerTurn) {
            // End player's round, start AI
            duelEndRound();
          } else if (gameMode === 'arcade') {
            // Advance to next level
            arcadeNextLevel();
          } else {
            endGame();
            return;
          }
        }
      }

      // Duel AI update
      if (gameMode === 'duel') {
        duelAiUpdate(dt);
      }

      // Arcade bonus timer
      if (gameMode === 'arcade' && arcadeBonusActive) {
        arcadeBonusTimer -= dt;
        updateArcadePanel();
        if (arcadeBonusTimer <= 0) {
          arcadeBonusActive = false;
          showToast('Bonus ended');
          updateArcadePanel();
        }
      }

      // Survival miss limit
      if (gameMode === 'survival' && gameMisses >= 3) { endGame(); return; }

      // Moving pegs
      const t = now / 1000;
      for (const pm of pegMeshes) {
        if (pm.def.moving && pm.def.baseX !== undefined) {
          pm.mesh.position.x = pm.def.baseX + Math.sin(t * pm.def.moveSpeed! + pm.def.movePhase!) * pm.def.moveAmplitude!;
        }
      }
    } else {
      handleInput(dt);
    }

    // Toast timer
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) hidePanel(toastEntity); }

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
      if (m.position.x > 7) m.position.x = -7;
      if (m.position.x < -7) m.position.x = 7;
    });

    // Peg glow pulse
    pegMeshes.forEach(p => {
      const intensity = 0.1 + 0.08 * Math.sin(t * 2 + p.def.x * 5);
      (p.glowMesh.material as MeshBasicMaterial).opacity = p.def === targetPeg ? 0.4 + 0.2 * Math.sin(t * 4) : intensity;
    });

    // Combo intensity: lights pulse brighter with combo
    const comboIntensity = Math.min(gameCombo / 10, 1);
    comboLight.intensity = comboIntensity * 0.8 + (frenzyActive ? 0.5 : 0);
    comboLight.color.set(frenzyActive ? '#ffcc00' : gameCombo >= 8 ? '#ffcc00' : gameCombo >= 5 ? '#ff8800' : theme().accent);

    // Slow-mo visual: accent light flicker
    if (slowmoActive) {
      accentLight1.intensity = 0.3 + 0.3 * Math.sin(t * 8);
      accentLight2.intensity = 0.2 + 0.2 * Math.sin(t * 8 + 1);
    } else {
      accentLight1.intensity = 0.6;
      accentLight2.intensity = 0.4;
    }
  };

  (world as any).onUpdate = update;
  function loop() { update(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  // Initial state
  hideAllPanels();
  showPanel(titleEntity);
  goToTitle();

  setTimeout(() => {
    updatePanel(settingsEntity, 'set-master', Math.round(save.settings.masterVol * 100) + '%');
    updatePanel(settingsEntity, 'set-sfx', Math.round(save.settings.sfxVol * 100) + '%');
    updatePanel(settingsEntity, 'set-music', Math.round(save.settings.musicVol * 100) + '%');
    updatePanel(settingsEntity, 'set-theme', THEMES[save.settings.theme].name);
  }, 1000);
}

main().catch(console.error);
