import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  EventEmitter,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { SfxService } from '../../services/sfx.service';

type Cell = { x: number; y: number };
type FruitType = 'normal' | 'toxic' | 'golden' | 'fake';
type Fruit = { pos: Cell; type: FruitType; expiresAt: number | null };
type SnakeSkin = {
  style: 'solid' | 'stripes' | 'gradient';
  base: string;
  accent: string;
  stripeWidth: number;
};

export interface ChallengeSettings {
  gridSize: number;
  wrapEdges: boolean;
  startingLength: number;
  startingSpeed: number;
}

@Component({
  selector: 'app-game-challenge',
  standalone: true,
  imports: [],
  templateUrl: './game-challenge.component.html',
  styleUrl: './game-challenge.component.css',
})
export class GameChallengeComponent
  implements AfterViewInit, OnDestroy, OnChanges
{
  @Input() mode: 'classic' | 'speed' | 'challenge' | null = null;
  @Input() classicSettings: ChallengeSettings | null = null;

  @Input() paused = false;
  @Input() gameSpeed = 1;

  @Input() timeLimitSec: number | null = null;
  @Input() targetFruits: number | null = null;

  @Input() snakeSkin: SnakeSkin = {
    style: 'stripes',
    base: '#22c55e',
    accent: '#065f46',
    stripeWidth: 6,
  };
  @Output() timeLeftChange = new EventEmitter<number>();
  @Output() scoreChange = new EventEmitter<number>();
  @Output() highScoreChange = new EventEmitter<number>();
  @Output() speedChange = new EventEmitter<number>();
  @Output() gameOver = new EventEmitter<void>();
  @Output() requestRestart = new EventEmitter<void>();
  @Output() resumeRequested = new EventEmitter<void>();
  @Output() fruitsCollectedChange = new EventEmitter<number>();

  @ViewChild('screen', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  score = 0;
  private highScore = 0;

  readonly cellSize = 20;
  readonly fixedRows = 26;
  rows = this.fixedRows;
  cols = 20;

  tickMs = 120;
  private baseTickMs = 120;
  private wrapEdges = false;

  private deviceScale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  private ctx!: CanvasRenderingContext2D;
  private intervalId: any;
  private viewInited = false;

  private snake: Cell[] = [];
  private vx = 1;
  private vy = 0;

  private foods: Fruit[] = [];

  private obstacles: Cell[] = [];

  private over = false;
  private snakeInitLen = 5;

  private CHANCE_NORMAL = 0.7;
  private CHANCE_TOXIC = 0.12;
  private CHANCE_GOLDEN = 0.1;
  private CHANCE_FAKE = 0.08;

  private GOLDEN_LIFETIME_MS = 3500;
  private GOLDEN_BLINK_WINDOW_MS = 900;
  private FAKE_OBSTACLES_ON_PICKUP = 2;

  private MIN_FOODS = 1;
  private MAX_FOODS_RANGE = 5;
  private desiredFoods = 3;

  private timeLeft = 0;
  private secondTimerId: any = null;
  private fruitsCollected = 0;

  constructor(private sfx: SfxService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['classicSettings'] && this.classicSettings) {
      this.applyClassicSettings(this.classicSettings);
      if (this.viewInited) {
        this.setupCanvas();
        this.resetGame();
      }
    }
    if (changes['paused'] && this.viewInited) {
      this.setPaused(this.paused);
    }
    if (changes['gameSpeed'] && !changes['gameSpeed'].firstChange) {
      this.recomputeTickFromGameSpeed();
      this.restartInterval();
      this.speedChange.emit(this.gameSpeed);
    }
    if (changes['snakeSkin'] && this.viewInited) {
      this.drawAll();
    }
  }

  ngAfterViewInit(): void {
    this.viewInited = true;
    if (this.classicSettings) this.applyClassicSettings(this.classicSettings);
    this.recomputeTickFromGameSpeed();
    this.setupCanvas();
    this.resetGame();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.intervalId);
    window.clearInterval(this.secondTimerId);
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (this.paused && !this.over) {
      this.drawAll();
      this.drawPauseOverlay();
    }
    if (!this.paused && !this.over) {
      this.drawAll();
    }
  }

  public restart(): void {
    this.resetGame();
  }

  public handleKey(key: string): void {
    const k = key;
    const goingUp = this.vy === -1;
    const goingDown = this.vy === 1;
    const goingRight = this.vx === 1;
    const goingLeft = this.vx === -1;

    if ((k === 'ArrowLeft' || k.toLowerCase() === 'a') && !goingRight) {
      this.vx = -1;
      this.vy = 0;
    } else if ((k === 'ArrowUp' || k.toLowerCase() === 'w') && !goingDown) {
      this.vx = 0;
      this.vy = -1;
    } else if ((k === 'ArrowRight' || k.toLowerCase() === 'd') && !goingLeft) {
      this.vx = 1;
      this.vy = 0;
    } else if ((k === 'ArrowDown' || k.toLowerCase() === 's') && !goingUp) {
      this.vx = 0;
      this.vy = 1;
    }
  }

  private applyClassicSettings(s: ChallengeSettings) {
    if (Number.isFinite(s.gridSize) && s.gridSize >= 8 && s.gridSize <= 120) {
      this.cols = Math.floor(s.gridSize);
    }
    this.rows = this.fixedRows;

    this.wrapEdges = !!s.wrapEdges;

    const sp = Math.min(10, Math.max(1, Math.floor(s.startingSpeed)));
    const MAX = 240,
      MIN = 60;
    const tick = Math.round(MAX - (sp - 1) * ((MAX - MIN) / 9));

    this.baseTickMs = tick;
    this.tickMs = tick;
    this.gameSpeed = sp;

    this.snakeInitLen = Math.min(50, Math.max(1, Math.floor(s.startingLength)));
  }

  private recomputeTickFromGameSpeed() {
    this.tickMs = this.baseTickMs;
  }

  private setupCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const cssW = this.cols * this.cellSize;
    const cssH = this.fixedRows * this.cellSize;

    canvas.width = cssW * this.deviceScale;
    canvas.height = cssH * this.deviceScale;

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;

    this.ctx.setTransform(this.deviceScale, 0, 0, this.deviceScale, 0, 0);
  }

  private resetGame() {
    window.clearInterval(this.intervalId);

    const midY = Math.floor(this.rows / 2);
    this.snake = Array.from({ length: this.snakeInitLen }, (_, i) => ({
      x: this.snakeInitLen - 1 - i,
      y: midY,
    }));
    this.vx = 1;
    this.vy = 0;

    this.score = 0;
    this.over = false;
    this.obstacles = [];
    this.foods = [];
    this.fruitsCollected = 0;
    this.fruitsCollectedChange.emit(this.fruitsCollected);

    this.desiredFoods = this.rollDesiredFoods();
    this.adjustFruitsToDesired();

    if (this.timeLimitSec && this.timeLimitSec > 0) {
      this.startSecondTimer(this.timeLimitSec);
    } else {
      this.timeLeft = 0;
      this.timeLeftChange.emit(0);
      window.clearInterval(this.secondTimerId);
    }

    this.drawAll();
    this.restartInterval();

    this.emitInitialStats();
  }

  private emitInitialStats() {
    Promise.resolve().then(() => {
      this.scoreChange.emit(this.score);
      this.highScoreChange.emit(this.highScore);
      this.speedChange.emit(this.gameSpeed);
    });
  }

  private restartInterval() {
    window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      if (!this.over && !this.paused) this.tick();
    }, this.tickMs);
  }

  private tick() {
    const now = Date.now();
    let needRespawn = false;
    this.foods = this.foods.filter((f) => {
      if (f.expiresAt !== null && now >= f.expiresAt) {
        needRespawn = true;
        return false;
      }
      return true;
    });
    if (needRespawn) this.rerollAndAdjustFruits();

    const head = { x: this.snake[0].x + this.vx, y: this.snake[0].y + this.vy };

    if (this.wrapEdges) {
      if (head.x < 0) head.x = this.cols - 1;
      else if (head.x >= this.cols) head.x = 0;
      if (head.y < 0) head.y = this.rows - 1;
      else if (head.y >= this.rows) head.y = 0;
    }

    this.snake.unshift(head);

    let ateIndex = -1;
    for (let i = 0; i < this.foods.length; i++) {
      const f = this.foods[i];
      if (f.pos.x === head.x && f.pos.y === head.y) {
        ateIndex = i;
        break;
      }
    }

    if (ateIndex >= 0) {
      const f = this.foods[ateIndex];
      this.sfx.playFood();

      let counted = false;

      let delta = 0;
      switch (f.type) {
        case 'normal':
          this.incrementScore(1);
          delta = 1;
          break;
        case 'toxic':
          this.shrinkSnake(1);
          delta = 0;
          break;
        case 'golden':
          this.incrementScore(3);
          delta = 3; // ⬅️ important
          break;
        case 'fake':
          this.addObstacles(this.FAKE_OBSTACLES_ON_PICKUP);
          delta = 0;
          break;
      }

      if (delta > 0) {
        this.fruitsCollected += delta; // ⬅️ adună punctele
        this.fruitsCollectedChange.emit(this.fruitsCollected);

        const target = Math.max(0, this.targetFruits ?? 0);
        if (target > 0 && this.fruitsCollected >= target) {
          this.finishGame('win');
          return;
        }
      }

      if (counted) {
        this.fruitsCollected++;
        this.fruitsCollectedChange.emit(this.fruitsCollected);

        const target = Math.max(0, this.targetFruits ?? 0);
        if (target > 0 && this.fruitsCollected >= target) {
          this.finishGame('win');
          return;
        }
      }

      this.foods.splice(ateIndex, 1);
      this.rerollAndAdjustFruits();
    } else {
      this.snake.pop();
    }

    if (
      !this.wrapEdges &&
      (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows)
    ) {
      this.finishGame('lose');
      return;
    }

    for (let i = 1; i < this.snake.length; i++) {
      const p = this.snake[i];
      if (p.x === head.x && p.y === head.y) {
        this.finishGame('lose');
        return;
      }
    }

    if (this.obstacles.some((o) => o.x === head.x && o.y === head.y)) {
      this.finishGame('lose');
      return;
    }

    this.drawAll();
  }

  private finishGame(reason: 'win' | 'lose' | 'finish') {
    this.over = true;
    window.clearInterval(this.intervalId);
    window.clearInterval(this.secondTimerId);

    if (reason === 'win') this.sfx.playWin();
    else this.sfx.playLose();

    this.drawAll();

    this.ctx.save();
    this.ctx.globalAlpha = 0.75;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(
      0,
      0,
      this.cols * this.cellSize,
      this.rows * this.cellSize
    );
    this.ctx.restore();

    let title = 'Game Over';
    let titleColor = '#ffffff';
    if (reason === 'win') {
      title = 'You Win!';
      titleColor = '#22c55e';
    } else if (reason === 'finish') {
      title = "Time's Up!";
      titleColor = '#38bdf8';
    }

    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = titleColor;
    this.ctx.font = 'bold 28px monospace';
    this.ctx.fillText(
      title,
      (this.cols * this.cellSize) / 2,
      (this.rows * this.cellSize) / 2 - 10
    );

    this.ctx.fillStyle = '#e5e7eb';
    this.ctx.font = '14px monospace';
    const cx = (this.cols * this.cellSize) / 2;
    const cy = (this.rows * this.cellSize) / 2 + 16;

    const lines: string[] = [
      `Score: ${this.score}`,
      this.targetFruits
        ? `Fruits: ${this.fruitsCollected}/${this.targetFruits}`
        : '',
      this.timeLimitSec ? `Time: ${Math.max(0, this.timeLeft)}s` : '',
      'Click to Restart',
    ].filter(Boolean);

    lines.forEach((t, i) => this.ctx.fillText(t, cx, cy + i * 20));

    this.gameOver.emit();
  }

  private incrementScore(by: number) {
    this.score += by;
    this.scoreChange.emit(this.score);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreChange.emit(this.highScore);
    }
  }

  private shrinkSnake(n: number) {
    const minLen = 1;
    for (let i = 0; i < n; i++) {
      if (this.snake.length > minLen) this.snake.pop();
    }
  }

  private addObstacles(count: number) {
    let added = 0;
    let guard = 0;
    while (added < count && guard < 1000) {
      guard++;
      const c = this.randomFreeCell();
      if (!c) break;
      this.obstacles.push(c);
      added++;
    }
  }

  private randomFreeCell(): Cell | null {
    const used = new Set<string>();
    for (const s of this.snake) used.add(`${s.x},${s.y}`);
    for (const o of this.obstacles) used.add(`${o.x},${o.y}`);
    for (const f of this.foods) used.add(`${f.pos.x},${f.pos.y}`);

    const freeCount = this.cols * this.rows - used.size;
    if (freeCount <= 0) return null;

    for (let tries = 0; tries < 200; tries++) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      if (!used.has(`${x},${y}`)) return { x, y };
    }
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!used.has(`${x},${y}`)) return { x, y };
      }
    }
    return null;
  }

  private adjustFruitsToDesired() {
    while (this.foods.length < this.desiredFoods) {
      const f = this.createOneFruit();
      if (!f) break;
      this.foods.push(f);
    }
    while (this.foods.length > this.desiredFoods) {
      const idx = Math.floor(Math.random() * this.foods.length);
      this.foods.splice(idx, 1);
    }
  }

  private rerollAndAdjustFruits() {
    this.desiredFoods = this.rollDesiredFoods();
    this.adjustFruitsToDesired();
  }

  private createOneFruit(): Fruit | null {
    const cell = this.randomFreeCell();
    if (!cell) return null;

    const t = this.pickFruitType(Math.random());
    const expiresAt =
      t === 'golden' ? Date.now() + this.GOLDEN_LIFETIME_MS : null;

    return { pos: cell, type: t, expiresAt };
  }

  private pickFruitType(r: number): FruitType {
    const n = this.CHANCE_NORMAL;
    const tox = n + this.CHANCE_TOXIC;
    const gold = tox + this.CHANCE_GOLDEN;
    if (r < n) return 'normal';
    if (r < tox) return 'toxic';
    if (r < gold) return 'golden';
    return 'fake';
  }

  private drawAll() {
    this.ctx.fillStyle = '#f3f3f3';
    this.ctx.fillRect(
      0,
      0,
      this.cols * this.cellSize,
      this.rows * this.cellSize
    );

    const colorMap: Record<FruitType, string> = {
      normal: '#ef4444',
      toxic: '#7e22ce',
      golden: '#eab308',
      fake: '#f97316',
    };

    for (const f of this.foods) {
      let draw = true;
      if (f.type === 'golden' && f.expiresAt) {
        const remaining = f.expiresAt - Date.now();
        if (remaining < this.GOLDEN_BLINK_WINDOW_MS && remaining > 0) {
          draw = Math.floor(remaining / 120) % 2 === 0 ? false : true;
        }
      }
      if (!draw) continue;

      this.ctx.fillStyle = colorMap[f.type];
      this.ctx.fillRect(
        f.pos.x * this.cellSize,
        f.pos.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }

    this.ctx.fillStyle = '#334155';
    for (const o of this.obstacles) {
      this.ctx.fillRect(
        o.x * this.cellSize,
        o.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }

    this.drawSnakeOnePiece(this.ctx, this.snake, this.cellSize, this.snakeSkin);
  }

  private drawSnakeOnePiece(
    ctx: CanvasRenderingContext2D,
    snakeCells: { x: number; y: number }[],
    tile: number,
    skin: SnakeSkin
  ) {
    if (snakeCells.length === 0) return;

    if (snakeCells.length === 1) {
      ctx.fillStyle =
        skin.style === 'solid'
          ? skin.base
          : skin.style === 'gradient'
          ? this.linearGradientForRect(ctx, snakeCells[0], tile, skin)
          : (this.makeStripePattern(ctx, skin) as any);
      ctx.fillRect(snakeCells[0].x * tile, snakeCells[0].y * tile, tile, tile);
      return;
    }

    const pts = snakeCells.map((c) => ({
      x: c.x * tile + tile / 2,
      y: c.y * tile + tile / 2,
    }));

    const p0 = pts[0],
      pN = pts[pts.length - 1];
    this.setStrokeForSkin(ctx, skin, p0.x, p0.y, pN.x, pN.y);

    ctx.lineWidth = tile;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 3;

    const snap = (v: number) => Math.round(v) + 0.5;

    ctx.beginPath();
    ctx.moveTo(snap(pts[0].x), snap(pts[0].y));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(snap(pts[i].x), snap(pts[i].y));
    }
    ctx.stroke();
  }

  private setStrokeForSkin(
    ctx: CanvasRenderingContext2D,
    skin: SnakeSkin,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    if (skin.style === 'solid') {
      ctx.strokeStyle = skin.base;
      return;
    }
    if (skin.style === 'gradient') {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, skin.base);
      g.addColorStop(1, skin.accent);
      ctx.strokeStyle = g;
      return;
    }
    ctx.strokeStyle = this.makeStripePattern(ctx, skin);
  }

  private makeStripePattern(
    ctx: CanvasRenderingContext2D,
    s: SnakeSkin
  ): CanvasPattern {
    const size = Math.max(4, s.stripeWidth) * 2;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const o = off.getContext('2d')!;
    o.fillStyle = s.base;
    o.fillRect(0, 0, size, size);
    o.strokeStyle = s.accent;
    o.lineWidth = s.stripeWidth;
    o.beginPath();
    o.moveTo(-size, size * 0.6);
    o.lineTo(size * 2, -size * 0.4);
    o.moveTo(-size, size * 1.6);
    o.lineTo(size * 2, size * 0.6);
    o.stroke();
    return ctx.createPattern(off, 'repeat')!;
  }

  private linearGradientForRect(
    ctx: CanvasRenderingContext2D,
    c: Cell,
    tile: number,
    s: SnakeSkin
  ) {
    const x1 = c.x * tile,
      y1 = c.y * tile;
    const g = ctx.createLinearGradient(x1, y1, x1 + tile, y1 + tile);
    g.addColorStop(0, s.base);
    g.addColorStop(1, s.accent);
    return g;
  }

  public onCanvasClick(): void {
    this.sfx.playButton();
    if (this.over) {
      this.requestRestart.emit();
      return;
    }
    if (this.paused) {
      this.resumeRequested.emit();
    }
  }

  private drawPauseOverlay() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.7;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(
      0,
      0,
      this.cols * this.cellSize,
      this.rows * this.cellSize
    );
    this.ctx.restore();

    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.fillText(
      'Paused',
      (this.cols * this.cellSize) / 2,
      (this.rows * this.cellSize) / 2
    );
    this.ctx.font = '14px monospace';
    this.ctx.fillText(
      'Click to resume',
      (this.cols * this.cellSize) / 2,
      (this.rows * this.cellSize) / 2 + 28
    );
  }

  private startSecondTimer(seconds: number) {
    this.timeLeft = Math.max(0, Math.floor(seconds || 0));
    this.timeLeftChange.emit(this.timeLeft);

    window.clearInterval(this.secondTimerId);
    this.secondTimerId = window.setInterval(() => {
      if (this.over || this.paused) return;
      if (this.timeLeft > 0) {
        this.timeLeft -= 1;
        this.timeLeftChange.emit(this.timeLeft);
        if (this.timeLeft === 0) {
          this.finishGame('finish');
        }
      }
    }, 1000);
  }

  private rollDesiredFoods(): number {
    const a = Math.max(1, Math.floor(this.MIN_FOODS));
    const b = Math.max(a, Math.floor(this.MAX_FOODS_RANGE));
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }
}
