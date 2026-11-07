import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, ArrowLeft, Trophy } from 'lucide-react';

// Pixel font & drawing routines
const GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:!-'";
const BITS = (
  "111101101101111 010110010010111 111001111100111 111001111001111 101101111001001 111100111001111 " +
  "111100111101111 111001001001001 111101111101111 111101111001111 010101111101101 110101110101110 " +
  "011100100100011 110101101101110 111100110100111 111100110100100 011100101101011 101101111101101 " +
  "111010010010111 001001001101010 101101110101101 100100100100111 101111111101101 110101101101101 " +
  "010101101101010 110101110100100 010101101110011 110101110101101 011100010001110 111010010010010 " +
  "101101101101111 101101101101010 101101111111101 101101010101101 101101010010010 111001010100111 " +
  "000000000000010 000010000010000 010010010000010 000000111000000 010010000000000"
).split(" ");

function drawPixelText(c: CanvasRenderingContext2D, str: string, x: number, y: number, align?: 'center' | 'right') {
  str = String(str).toUpperCase();
  const w = str.length * 4 - 1;
  if (align === 'center') x -= Math.floor(w / 2);
  else if (align === 'right') x -= w;
  for (let i = 0; i < str.length; i++) {
    const b = BITS[GLYPHS.indexOf(str[i])];
    if (b) {
      for (let p = 0; p < 15; p++) {
        if (b[p] === '1') c.fillRect(x + i * 4 + (p % 3), y + Math.floor(p / 3), 1, 1);
      }
    }
  }
}

function drawSprite(c: CanvasRenderingContext2D, rows: string[], x: number, y: number) {
  x = Math.round(x);
  y = Math.round(y);
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      if (rows[j][i] === '#') c.fillRect(x + i, y + j, 1, 1);
    }
  }
}

const ROBOT = [
  "......#.....",
  ".......#....",
  "..########..",
  ".##########.",
  ".#####.##.#.",
  ".#####.##.#.",
  ".##########.",
  "..########..",
  "....####....",
  "..########..",
  ".#.######.#.",
  "....####....",
];

const LEGS = [
  ["....#..#....", "...##..##..."],
  ["...#....#...", "..##....##.."],
];

const CONE = [
  "...#...",
  "..###..",
  "..#.#..",
  "..###..",
  ".#####.",
  ".#...#.",
  ".#####.",
  "#######",
  "#######",
];

const CRATE = [
  "########",
  "##....##",
  "#.#..#.#",
  "#..##..#",
  "#..##..#",
  "#.#..#.#",
  "##....##",
  "########",
];

const CLOUD = [
  ".....####.....",
  "...##....##...",
  ".##........###",
  "##############",
];

const BIRD = [
  [
    "##.........",
    "###.####...",
    ".#######.#.",
    "..#####.##.",
    "..#########",
    "...######..",
    "....###....",
  ],
  [
    "....####...",
    "...####.#..",
    "..######.#.",
    ".###########",
    "####.####..",
    "###.####...",
    "##.........",
  ],
];

const APPLE = [
  "...#...",
  "..#....",
  ".#####.",
  "#######",
  "#######",
  ".#####.",
  "..###..",
];

const SNAKE_ICON = [
  "###.###.###......#.",
  "###.###.###.....###",
  "###.###.###......#.",
  "...................",
  "........###........",
  "........###........",
  "........###........",
  "...................",
  "........###.###....",
  "........###.###....",
  "........###.###....",
];

const BRICKS_ICON = [
  "#####.#####.#####",
  "#####.#####.#####",
  ".................",
  "#####.#####......",
  "#####.#####......",
  ".................",
  "..........##.....",
  "..........##.....",
  ".................",
  ".................",
  "......######.....",
];

const HUD = 9;

interface GameDef {
  id: string;
  name: string;
  desc: string;
  hint: string;
  icon: string[];
  W: number;
  H: number;
  GROUND?: number;
  reset: () => void;
  update: (dt: number, held: Record<string, boolean>) => void;
  draw: (c: CanvasRenderingContext2D) => void;
  score: number;
  dead: boolean;
  press?: () => void;
  dir?: (dx: number, dy: number) => void;
  pointer?: (x: number) => void;
}

export const Retro8BitSuite: React.FC = () => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const gameStateRef = useRef<{
    game: GameDef | null;
    state: 'ready' | 'play' | 'over';
    overAt: number;
    lastTime: number;
    held: Record<string, boolean>;
  }>({
    game: null,
    state: 'ready',
    overAt: 0,
    lastTime: 0,
    held: {},
  });

  // Touch tracking for swiping/dragging
  const touchStateRef = useRef<{ down: boolean; sx: number; sy: number }>({
    down: false,
    sx: 0,
    sy: 0,
  });

  // Load high scores from localStorage
  const loadHi = useCallback((id: string) => {
    try {
      return parseInt(localStorage.getItem(`arcade-hi-${id}`) || '0', 10);
    } catch {
      return 0;
    }
  }, []);

  const saveHi = useCallback((id: string, score: number) => {
    try {
      const cur = loadHi(id);
      if (score > cur) {
        localStorage.setItem(`arcade-hi-${id}`, String(score));
        setHighScores(prev => ({ ...prev, [id]: score }));
      }
    } catch {}
  }, [loadHi]);

  useEffect(() => {
    setHighScores({
      runner: loadHi('runner'),
      snake: loadHi('snake'),
      flappy: loadHi('flappy'),
      breakout: loadHi('breakout'),
    });
  }, [loadHi]);

  // Create games
  const createGames = useCallback((): Record<string, GameDef> => {
    const rand = (n: number) => Math.random() * n;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const isMobile = window.innerWidth < 640;

    // 1. RUNNER
    const Runner: GameDef = {
      id: "runner",
      name: "Runner",
      desc: "Jump over crates & cones",
      hint: isMobile ? "Tap to jump" : "Space or Up to jump",
      W: isMobile ? 180 : 240,
      H: 90,
      GROUND: 80,
      icon: ROBOT.concat(LEGS[0]),
      score: 0,
      dead: false,
      reset() {
        (this as any).y = 0;
        (this as any).vy = 0;
        (this as any).speed = 110;
        (this as any).dist = 0;
        (this as any).t = 0;
        (this as any).buffer = 0;
        (this as any).obs = [];
        (this as any).next = 140;
        (this as any).clouds = [[50, 22], [150, 34], [220, 18]];
        (this as any).bumps = Array.from({ length: 24 }, () => [rand(this.W), 2 + (rand(4) | 0), 1 + (rand(3) | 0)]);
        this.dead = false;
        this.score = 0;
      },
      press() {
        (this as any).buffer = 0.12;
      },
      update(dt: number) {
        const self = this as any;
        self.t += dt;
        self.speed = Math.min(260, self.speed + 3 * dt);
        const dx = self.speed * dt;
        self.dist += dx;
        this.score = Math.floor(self.dist / 10);
        self.buffer -= dt;
        if (self.buffer > 0 && self.y === 0) {
          self.vy = -260;
          self.buffer = 0;
        }
        self.vy += 900 * dt;
        self.y += self.vy * dt;
        if (self.y >= 0) {
          self.y = 0;
          self.vy = 0;
        }
        if ((self.next -= dx) <= 0) {
          const kinds = [
            [[CONE, 0, 0]],
            [[CONE, 0, 0], [CONE, 7, 0]],
            [[CRATE, 0, 0]],
            [[CRATE, 0, 0], [CRATE, 0, 8]],
            [[CRATE, 0, 0], [CRATE, 9, 0]],
          ];
          const parts = kinds[rand(this.score > 150 ? kinds.length : 3) | 0];
          const w = Math.max(...parts.map(([s, dxx]: any) => dxx + s[0].length));
          const h = Math.max(...parts.map(([s, , dyy]: any) => dyy + s.length));
          self.obs.push({ x: this.W, parts, w, h });
          self.next = self.speed * 0.6 + 40 + rand(self.speed * 0.9);
        }
        for (const o of self.obs) o.x -= dx;
        self.obs = self.obs.filter((o: any) => o.x + o.w > 0);
        for (const c of self.clouds) {
          if ((c[0] -= dx * 0.2) < -14) {
            c[0] = this.W + rand(60);
            c[1] = 14 + rand(26);
          }
        }
        const px = 18;
        const py = this.GROUND! - 14 + self.y + 2;
        this.dead = self.obs.some((o: any) => px < o.x + o.w - 1 && px + 8 > o.x + 1 && py + 11 > this.GROUND! - o.h + 1);
      },
      draw(c: CanvasRenderingContext2D) {
        const self = this as any;
        const off = self.dist % this.W;
        c.fillRect(0, this.GROUND!, this.W, 1);
        for (const [x, dy, w] of self.bumps) c.fillRect(Math.round((x - off + this.W) % this.W), this.GROUND! + dy, w, 1);
        c.globalAlpha = 0.35;
        for (const [x, y] of self.clouds) drawSprite(c, CLOUD, x, y);
        c.globalAlpha = 1;
        for (const o of self.obs) {
          for (const [s, dx, dy] of o.parts) drawSprite(c, s, o.x + dx, this.GROUND! - dy - s.length);
        }
        const legs = self.y < 0 || !self.t ? LEGS[0] : LEGS[(self.t * 12 | 0) % 2];
        drawSprite(c, ROBOT.concat(legs), 16, this.GROUND! - 14 + self.y);
      },
    };

    // 2. SNAKE
    const Snake: GameDef = {
      id: "snake",
      name: "Snake",
      desc: "Collect apples & grow",
      hint: isMobile ? "Swipe to steer" : "Arrow keys / WASD to steer",
      W: 162,
      H: 171,
      icon: SNAKE_ICON,
      score: 0,
      dead: false,
      reset() {
        const self = this as any;
        self.N = 20;
        self.body = [[9, 10], [8, 10], [7, 10]];
        self.d = [1, 0];
        self.queue = [];
        self.acc = 0;
        self.step = 0.13;
        self.eaten = 0;
        this.score = 0;
        this.dead = false;
        const place = () => {
          let p: [number, number];
          do {
            p = [Math.floor(rand(self.N)), Math.floor(rand(self.N))];
          } while (self.body.some((b: any) => b[0] === p[0] && b[1] === p[1]));
          return p;
        };
        self.place = place;
        self.food = place();
      },
      dir(dx: number, dy: number) {
        const self = this as any;
        const last = self.queue[self.queue.length - 1] || self.d;
        if (self.queue.length > 2 || (dx === -last[0] && dy === -last[1]) || (dx === last[0] && dy === last[1])) return;
        self.queue.push([dx, dy]);
      },
      update(dt: number) {
        const self = this as any;
        for (self.acc += dt; self.acc >= self.step && !this.dead; self.acc -= self.step) {
          if (self.queue.length) self.d = self.queue.shift();
          const n = [self.body[0][0] + self.d[0], self.body[0][1] + self.d[1]];
          const eat = n[0] === self.food[0] && n[1] === self.food[1];
          const out = n[0] < 0 || n[1] < 0 || n[0] >= self.N || n[1] >= self.N;
          if (out || self.body.some((b: any, i: number) => (eat || i < self.body.length - 1) && b[0] === n[0] && b[1] === n[1])) {
            this.dead = true;
            return;
          }
          self.body.unshift(n);
          if (!eat) {
            self.body.pop();
          } else {
            self.eaten++;
            this.score = self.eaten * 10;
            self.step = Math.max(0.06, self.step - 0.003);
            if (self.body.length === self.N * self.N) {
              this.dead = true;
              return;
            }
            self.food = self.place();
          }
        }
      },
      draw(c: CanvasRenderingContext2D) {
        const self = this as any;
        // Outline box
        c.strokeRect(0.5, HUD - 0.5, this.W - 1, this.H - HUD);
        const at = ([x, y]: [number, number]) => [1 + x * 8, HUD + y * 8];
        if (!this.dead || (Math.floor(Date.now() / 250) % 2)) {
          for (const b of self.body) {
            const [bx, by] = at(b);
            c.fillRect(bx, by, 7, 7);
          }
        }
        const [fx, fy] = at(self.food);
        drawSprite(c, APPLE, fx, fy);
      },
    };

    // 3. FLAPPY
    const Flappy: GameDef = {
      id: "flappy",
      name: "Flappy",
      desc: "Fly through pixel pipes",
      hint: isMobile ? "Tap to flap" : "Space or Up to flap",
      W: 144,
      H: 200,
      GROUND: 188,
      icon: BIRD[0],
      score: 0,
      dead: false,
      reset() {
        const self = this as any;
        self.y = 90;
        self.vy = 0;
        self.pipes = [];
        self.next = 40;
        self.passed = 0;
        self.t = 0;
        self.dist = 0;
        self.GAP = 58;
        self.PW = 18;
        this.score = 0;
        this.dead = false;
      },
      press() {
        (this as any).vy = -175;
      },
      update(dt: number) {
        const self = this as any;
        self.t += dt;
        self.vy = Math.min(self.vy + 560 * dt, 260);
        self.y += self.vy * dt;
        if (self.y < HUD) {
          self.y = HUD;
          self.vy = 0;
        }
        const dx = 58 * dt;
        self.dist += dx;
        if ((self.next -= dx) <= 0) {
          self.pipes.push({
            x: this.W,
            gap: HUD + 18 + rand(this.GROUND! - HUD - 36 - self.GAP),
          });
          self.next = 80;
        }
        for (const p of self.pipes) {
          p.x -= dx;
          if (!p.done && p.x + self.PW < 30) {
            p.done = true;
            self.passed++;
            this.score = self.passed;
          }
        }
        self.pipes = self.pipes.filter((p: any) => p.x + self.PW > -2);
        const bx = 31;
        const by = self.y + 1;
        const bw = 9;
        const bh = 5;
        this.dead = self.y + 7 >= this.GROUND! || self.pipes.some((p: any) =>
          bx < p.x + self.PW && bx + bw > p.x && (by < p.gap || by + bh > p.gap + self.GAP)
        );
      },
      draw(c: CanvasRenderingContext2D) {
        const self = this as any;
        for (const p of self.pipes) {
          // Top pipe
          c.strokeRect(p.x, HUD - 1, self.PW, p.gap - HUD + 1);
          c.strokeRect(p.x - 2, p.gap - 6, self.PW + 4, 6);
          // Bottom pipe
          c.strokeRect(p.x, p.gap + self.GAP, self.PW, this.GROUND! - p.gap - self.GAP);
          c.strokeRect(p.x - 2, p.gap + self.GAP, self.PW + 4, 6);
        }
        c.fillRect(0, this.GROUND!, this.W, 1);
        for (let x = -(self.dist % 12); x < this.W; x += 12) {
          c.fillRect(x, this.GROUND! + 4, 6, 1);
        }
        const frame = self.vy < 0 || (Math.floor(self.t * 6) % 2) ? 1 : 0;
        drawSprite(c, BIRD[frame], 30, self.y);
      },
    };

    // 4. BREAKOUT
    const Breakout: GameDef = {
      id: "breakout",
      name: "Breakout",
      desc: "Smash all neon bricks",
      hint: isMobile ? "Touch & drag paddle" : "Mouse / Arrows to steer paddle",
      W: 160,
      H: 200,
      icon: BRICKS_ICON,
      score: 0,
      dead: false,
      reset() {
        const self = this as any;
        self.level = 1;
        self.lives = 3;
        self.points = 0;
        self.PY = 188;
        self.PW = 28;
        self.px = (this.W - self.PW) / 2;
        this.score = 0;
        this.dead = false;

        const build = () => {
          self.bricks = [];
          for (let r = 0; r < 5; r++) {
            for (let col = 0; col < 8; col++) {
              self.bricks.push({ x: 1 + col * 20, y: 22 + r * 8, w: 18, h: 5, r });
            }
          }
        };

        const serve = () => {
          const sp = 95 + self.level * 15;
          self.wait = 0.6;
          self.vx = sp * 0.5 * (Math.random() < 0.5 ? -1 : 1);
          self.vy = -sp * 0.87;
          self.bx = self.px + self.PW / 2 - 1;
          self.by = self.PY - 3;
        };

        self.build = build;
        self.serve = serve;
        build();
        serve();
      },
      pointer(x: number) {
        const self = this as any;
        self.px = clamp(x - self.PW / 2, 0, this.W - self.PW);
      },
      update(dt: number, held: Record<string, boolean>) {
        const self = this as any;
        const move = ((held.ArrowRight || held.KeyD ? 1 : 0) - (held.ArrowLeft || held.KeyA ? 1 : 0)) * 160 * dt;
        self.px = clamp(self.px + move, 0, this.W - self.PW);
        if (self.wait > 0) {
          self.wait -= dt;
          self.bx = self.px + self.PW / 2 - 1;
          return;
        }

        const hit = () => {
          const i = self.bricks.findIndex((b: any) =>
            self.bx < b.x + b.w && self.bx + 3 > b.x && self.by < b.y + b.h && self.by + 3 > b.y
          );
          if (i < 0) return false;
          self.bricks.splice(i, 1);
          self.points += 10;
          this.score = self.points;
          return true;
        };

        const steps = Math.ceil(Math.max(Math.abs(self.vx), Math.abs(self.vy)) * dt);
        for (let s = 0; s < steps; s++) {
          const sx = (self.vx * dt) / steps;
          const sy = (self.vy * dt) / steps;
          self.bx += sx;
          if (self.bx < 0 || self.bx + 3 > this.W) {
            self.vx = -self.vx;
            self.bx = clamp(self.bx, 0, this.W - 3);
          } else if (hit()) {
            self.vx = -self.vx;
            self.bx -= sx;
          }
          self.by += sy;
          if (self.by < HUD) {
            self.vy = Math.abs(self.vy);
            self.by = HUD;
          } else if (hit()) {
            self.vy = -self.vy;
            self.by -= sy;
          }
          if (self.vy > 0 && self.by + 3 >= self.PY && self.by + 3 <= self.PY + 3 && self.bx + 3 > self.px && self.bx < self.px + self.PW) {
            const sp = Math.hypot(self.vx, self.vy);
            const a = clamp((self.bx + 1.5 - self.px - self.PW / 2) / (self.PW / 2), -1, 1) * 1.05;
            self.vx = sp * Math.sin(a);
            self.vy = -sp * Math.cos(a);
            self.by = self.PY - 3;
          }
          if (self.by > this.H) {
            if (--self.lives <= 0) {
              this.dead = true;
              return;
            }
            return self.serve();
          }
        }
        if (!self.bricks.length) {
          self.level++;
          self.build();
          self.serve();
        }
      },
      draw(c: CanvasRenderingContext2D) {
        const self = this as any;
        c.fillRect(0, HUD - 1, this.W, 1);
        for (let i = 0; i < self.lives; i++) {
          c.fillRect(2 + i * 5, 2, 3, 3);
        }
        for (const b of self.bricks) {
          if (b.r % 2) {
            c.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
          } else {
            c.fillRect(b.x, b.y, b.w, b.h);
          }
        }
        c.fillRect(self.px, self.PY, self.PW, 3);
        c.fillRect(self.bx, self.by, 3, 3);
      },
    };

    return { runner: Runner, snake: Snake, flappy: Flappy, breakout: Breakout };
  }, []);

  const games = useRef<Record<string, GameDef>>(createGames()).current;

  // Start selected game
  const handleSelectGame = (id: string) => {
    const g = games[id];
    if (!g) return;
    g.reset();
    gameStateRef.current.game = g;
    gameStateRef.current.state = 'ready';
    gameStateRef.current.overAt = 0;
    gameStateRef.current.lastTime = performance.now();
    setSelectedGameId(id);
  };

  const handleBackToMenu = () => {
    gameStateRef.current.game = null;
    gameStateRef.current.state = 'ready';
    setSelectedGameId(null);
  };

  // Main game loop
  useEffect(() => {
    if (!selectedGameId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = games[selectedGameId];
    if (!g) return;

    canvas.width = g.W;
    canvas.height = g.H;

    const fitCanvas = () => {
      const stage = stageRef.current;
      if (!stage || !canvas) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight || 450;
      const s = Math.max(1, Math.min(w / g.W, h / g.H));
      canvas.style.width = `${Math.floor(g.W * s)}px`;
      canvas.style.height = `${Math.floor(g.H * s)}px`;
    };

    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    const pressAction = () => {
      const state = gameStateRef.current.state;
      if (state === 'play') {
        if (g.press) g.press();
      } else if (state === 'over' && performance.now() - gameStateRef.current.overAt < 500) {
        return;
      } else {
        g.reset();
        gameStateRef.current.state = 'play';
        if (g.press) g.press();
      }
    };

    // Keyboard handlers
    const DIRS: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      KeyW: [0, -1],
      KeyS: [0, 1],
      KeyA: [-1, 0],
      KeyD: [1, 0],
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        handleBackToMenu();
        return;
      }
      const d = DIRS[e.code];
      if (!d && e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      gameStateRef.current.held[e.code] = true;
      if (e.repeat) return;
      if (gameStateRef.current.state !== 'play') {
        pressAction();
      } else if (!d || (!g.dir && d[1] < 0)) {
        if (g.press) g.press();
      }
      if (d && g.dir) {
        g.dir(d[0], d[1]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.held[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation frame loop
    let running = true;
    const loop = (t: number) => {
      if (!running) return;
      const dt = Math.min((t - gameStateRef.current.lastTime) / 1000, 1 / 30);
      gameStateRef.current.lastTime = t;

      if (gameStateRef.current.state === 'play') {
        g.update(dt, gameStateRef.current.held);
        if (g.dead) {
          gameStateRef.current.state = 'over';
          gameStateRef.current.overAt = performance.now();
          saveHi(g.id, g.score);
        }
      }

      // Render
      ctx.fillStyle = '#040b0d';
      ctx.fillRect(0, 0, g.W, g.H);
      ctx.fillStyle = '#2dd4bf';

      g.draw(ctx);

      // HUD / Score
      const hi = Math.max(loadHi(g.id), g.score);
      const scoreStr = (hi ? `HI ${String(hi).padStart(5, '0')} ` : '') + String(g.score).padStart(5, '0');
      drawPixelText(ctx, scoreStr, g.W - 2, 2, 'right');

      if (gameStateRef.current.state !== 'play') {
        const isMobile = window.innerWidth < 640;
        const lines = gameStateRef.current.state === 'ready'
          ? [isMobile ? 'TAP TO START' : 'SPACE TO START']
          : ['GAME OVER', isMobile ? 'TAP TO RETRY' : 'SPACE TO RETRY'];

        const maxLen = Math.max(...lines.map(l => l.length * 4 - 1));
        const y = Math.round(g.H / 2) - lines.length * 4;
        ctx.fillStyle = '#040b0d';
        ctx.fillRect(Math.round((g.W - maxLen) / 2) - 4, y - 4, maxLen + 8, lines.length * 8 + 6);
        ctx.fillStyle = '#2dd4bf';
        lines.forEach((l, i) => drawPixelText(ctx, l, Math.round(g.W / 2), y + i * 8, 'center'));
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', fitCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedGameId, games, loadHi, saveHi]);

  // Pointer / Touch interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = games[selectedGameId || ''];
    if (!g) return;
    touchStateRef.current.down = true;
    touchStateRef.current.sx = e.clientX;
    touchStateRef.current.sy = e.clientY;

    const state = gameStateRef.current.state;
    if (state === 'play') {
      if (g.press) g.press();
    } else if (state === 'over' && performance.now() - gameStateRef.current.overAt < 500) {
      return;
    } else {
      g.reset();
      gameStateRef.current.state = 'play';
      if (g.press) g.press();
    }

    if (g.pointer && canvasRef.current) {
      const r = canvasRef.current.getBoundingClientRect();
      g.pointer(((e.clientX - r.left) / r.width) * g.W);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = games[selectedGameId || ''];
    if (!g) return;
    if (g.pointer && canvasRef.current) {
      const r = canvasRef.current.getBoundingClientRect();
      g.pointer(((e.clientX - r.left) / r.width) * g.W);
    }
    if (!touchStateRef.current.down || !g.dir || gameStateRef.current.state !== 'play') return;
    const dx = e.clientX - touchStateRef.current.sx;
    const dy = e.clientY - touchStateRef.current.sy;
    if (Math.hypot(dx, dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      g.dir(Math.sign(dx), 0);
    } else {
      g.dir(0, Math.sign(dy));
    }
    touchStateRef.current.sx = e.clientX;
    touchStateRef.current.sy = e.clientY;
  };

  const handlePointerUp = () => {
    touchStateRef.current.down = false;
  };

  const gameList = Object.values(games);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 bg-[#040b0d] text-teal-300">
      {!selectedGameId ? (
        /* Game Selection Menu Grid */
        <div className="w-full max-w-xl space-y-4 animate-fade-in">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-white tracking-wider flex items-center justify-center gap-2">
              <span>🕹️</span> 8-Bit Retro Suite
            </h3>
            <p className="text-xs text-slate-400">
              100% Offline classic arcade games powered by native pixel canvas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {gameList.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSelectGame(g.id)}
                className="group flex flex-col p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10 transition-all text-left active:scale-[0.98]"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <span className="text-xl">
                      {g.id === 'runner' ? '🏃' : g.id === 'snake' ? '🐍' : g.id === 'flappy' ? '🐦' : '🧱'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 border border-white/5 text-[10px] font-mono text-teal-400">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>HI {String(highScores[g.id] || 0).padStart(5, '0')}</span>
                  </div>
                </div>

                <h4 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors">
                  {g.name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{g.desc}</p>
                <span className="text-[10px] text-teal-400/80 mt-2 font-medium">
                  {g.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Active Game Canvas View */
        <div className="w-full max-w-xl flex-1 flex flex-col items-center justify-center gap-3 animate-zoom">
          {/* Controls Bar */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/70 border border-white/10">
            <button
              type="button"
              onClick={handleBackToMenu}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Games</span>
            </button>

            <span className="text-xs font-mono font-bold text-teal-300">
              {games[selectedGameId]?.hint}
            </span>

            <button
              type="button"
              onClick={() => {
                games[selectedGameId]?.reset();
                gameStateRef.current.state = 'play';
              }}
              title="Restart Game"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Stage */}
          <div
            ref={stageRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full flex-1 min-h-[360px] sm:min-h-[440px] flex items-center justify-center touch-none select-none cursor-pointer rounded-2xl bg-black border border-white/10 p-2 overflow-hidden shadow-2xl relative"
          >
            <canvas
              ref={canvasRef}
              className="block rounded-lg shadow-2xl border border-teal-500/20"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
