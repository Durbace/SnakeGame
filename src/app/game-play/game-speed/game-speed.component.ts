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

type SnakeSkin = {
  style: 'solid' | 'stripes' | 'gradient';
  base: string;
  accent: string;
  stripeWidth: number;
};

export interface ClassicSettings {
  gridSize: number;
  wrapEdges: boolean;
  startingLength: number;
  startingSpeed: number;
}

export interface SpeedModeSettings {
  gridSize?: number;
  wrapEdges?: boolean;
  startingLength?: number;
  startingSpeed: number;
  accelRate: number;
  timeAttackSec: number;
  obstaclesOn: boolean;
  obstacleDensity?: number;
}

@Component({
  selector: 'app-game-speed',
  standalone: true,
  imports: [],
  templateUrl: './game-speed.component.html',
  styleUrls: ['./game-speed.component.css'],
})
export class GameSpeedComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() mode: 'classic' | 'speed' | 'challenge' | null = null;

  @Input() classicSettings: ClassicSettings | null = null;

  @Input() speedSettings: SpeedModeSettings | null = null;

  @Input() paused = false;
  @Input() gameSpeed = 1;

  @Input() autoResetOnDeath = false;
  @Input() targetFruits: number | null = null;

  @Input() snakeSkin: SnakeSkin = {
    style: 'stripes',
    base: '#22c55e',
    accent: '#065f46',
    stripeWidth: 6,
  };

  @Output() scoreChange = new EventEmitter<number>();
  @Output() highScoreChange = new EventEmitter<number>();
  @Output() speedChange = new EventEmitter<number>();
  @Output() timeLeftChange = new EventEmitter<number>();
  @Output() gameOver = new EventEmitter<void>();
  @Output() requestRestart = new EventEmitter<void>();
  @Output() resumeRequested = new EventEmitter<void>();

  @ViewChild('screen', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  score = 0;
  @Input() highScore = 0;  

  readonly cellSize = 20;
  readonly fixedRows = 26;
  rows = this.fixedRows;
  cols = 20;

  tickMs = 120;

  private wrapEdges = false;
  private deviceScale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  private ctx!: CanvasRenderingContext2D;
  private intervalId: any;
  private viewInited = false;

  private snake: Cell[] = [];
  private vx = 1;
  private vy = 0;
  private food!: Cell;
  private over = false;

  private snakeInitLen = 5;

  private isSpeedMode = false;
  private timeLeftMs = 0;
  private accelPerSecond = 0;
  private lastTickAt = 0;
  private obstacles: Set<string> = new Set();
  private obstaclesOn = false;

  private BASE_TICK_MS = 120;
  private MIN_TICK_MS = 70;
  private MAX_SPEED_MULT = Number.POSITIVE_INFINITY;
  private ACCEL_SCALE = 0.08;
  private accelBuffer = 0;
  private APPLY_STEP = 0.04;
  private fruitsCollected = 0;

  private celebratedHighScore = false;

  private keyOf(c: Cell) {
    return `${c.x},${c.y}`;
  }

   constructor(private sfx: SfxService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['classicSettings'] ||
        changes['speedSettings'] ||
        changes['mode']) &&
      this.viewInited
    ) {
      this.applySettings();
      this.setupCanvas();
      this.resetGame();
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
    this.applySettings();
    this.recomputeTickFromGameSpeed();
    this.setupCanvas();
    this.resetGame();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.intervalId);
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (this.paused && !this.over) {
      this.drawAll();
      this.drawPauseOverlay();
    }
    if (!this.paused && !this.over) {
      this.lastTickAt = performance.now();
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

  private applySettings() {
    this.isSpeedMode = this.mode === 'speed';

    if (this.isSpeedMode && this.speedSettings) {
      const s = this.speedSettings;
      if (
        Number.isFinite(s.gridSize) &&
        (s.gridSize as number) >= 8 &&
        (s.gridSize as number) <= 120
      ) {
        this.cols = Math.floor(s.gridSize as number);
      } else {
        this.cols = 20;
      }
      this.rows = this.fixedRows;

      this.wrapEdges = !!s.wrapEdges;
      this.snakeInitLen = Math.min(
        50,
        Math.max(1, Math.floor(s.startingLength ?? 5))
      );

      if (Number.isFinite(s.startingSpeed)) {
        const sp = Math.min(10, Math.max(1, Math.floor(s.startingSpeed)));
        const MAX = 240,
          MIN = 60;
        this.tickMs = Math.round(MAX - (sp - 1) * ((MAX - MIN) / 9));
      } else {
        this.tickMs = 120;
      }

      const rate = Number(s.accelRate);
      this.accelPerSecond = Number.isFinite(rate) ? Math.max(0, rate) : 0;

      const ta = Number(s.timeAttackSec);
      this.timeLeftMs =
        Number.isFinite(ta) && ta > 0 ? Math.floor(ta * 1000) : 0;

      this.obstaclesOn = !!s.obstaclesOn;
    } else {
      if (this.classicSettings) {
        this.applyClassicSettings(this.classicSettings);
      } else {
        this.cols = 20;
        this.rows = this.fixedRows;
        this.wrapEdges = false;
        this.snakeInitLen = 5;
        this.tickMs = 120;
      }
      this.accelPerSecond = 0;
      this.timeLeftMs = 0;
      this.obstaclesOn = false;
    }

    this.BASE_TICK_MS = this.tickMs;
  }

  private applyClassicSettings(s: ClassicSettings) {
    if (Number.isFinite(s.gridSize) && s.gridSize >= 8 && s.gridSize <= 120) {
      this.cols = Math.floor(s.gridSize);
    } else {
      this.cols = 20;
    }
    this.rows = this.fixedRows;
    this.wrapEdges = !!s.wrapEdges;

    if (Number.isFinite(s.startingSpeed)) {
      const sp = Math.min(10, Math.max(1, Math.floor(s.startingSpeed)));
      const MAX = 240,
        MIN = 60;
      this.tickMs = Math.round(MAX - (sp - 1) * ((MAX - MIN) / 9));
    } else {
      this.tickMs = 120;
    }
    this.snakeInitLen = Math.min(50, Math.max(1, Math.floor(s.startingLength)));
  }

  private recomputeTickFromGameSpeed() {
    const factor = Math.max(0.2, Number(this.gameSpeed) || 1);
    const next = Math.floor(this.BASE_TICK_MS / factor);
    this.tickMs = Math.max(this.MIN_TICK_MS, next);
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

    this.resetRoundRuntime();

    const midY = Math.floor(this.rows / 2);
    this.snake = Array.from({ length: this.snakeInitLen }, (_, i) => ({
      x: this.snakeInitLen - 1 - i,
      y: midY,
    }));

    this.vx = 1;
    this.vy = 0;
    this.score = 0;
    this.fruitsCollected = 0;
    this.over = false;

    this.celebratedHighScore = false;

    this.generateObstacles();

    this.spawnFood();
    this.drawAll();

    this.restartInterval();

    this.emitInitialStats();

    if (this.isSpeedMode) {
      const secs = Math.ceil(this.timeLeftMs / 1000);
      Promise.resolve().then(() => this.timeLeftChange.emit(secs));
    }
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
    const now = performance.now();
    const dtMs = Math.max(0, now - this.lastTickAt);
    this.lastTickAt = now;

    if (this.isSpeedMode) {
      if (this.timeLeftMs > 0) {
        this.timeLeftMs = Math.max(0, this.timeLeftMs - this.tickMs);
        this.timeLeftChange.emit(Math.ceil(this.timeLeftMs / 1000));
        if (this.timeLeftMs <= 0) {
          this.finishGame('finish');
          return;
        }
      }

      if (this.accelPerSecond > 0) {
        const accel = this.accelPerSecond * this.ACCEL_SCALE;
        this.accelBuffer += (accel * dtMs) / 1000;

        if (this.accelBuffer >= this.APPLY_STEP) {
          const steps = Math.floor(this.accelBuffer / this.APPLY_STEP);
          this.accelBuffer -= steps * this.APPLY_STEP;

          const before = this.gameSpeed;
          this.gameSpeed = this.gameSpeed + steps * this.APPLY_STEP;

          if (this.gameSpeed !== before) {
            this.recomputeTickFromGameSpeed();
            window.clearInterval(this.intervalId);
            this.intervalId = window.setInterval(() => {
              if (!this.over && !this.paused) this.tick();
            }, this.tickMs);

            this.speedChange.emit(this.gameSpeed);
          }
        }
      }
    }

    const head = { x: this.snake[0].x + this.vx, y: this.snake[0].y + this.vy };

    if (this.wrapEdges) {
      if (head.x < 0) head.x = this.cols - 1;
      else if (head.x >= this.cols) head.x = 0;
      if (head.y < 0) head.y = this.rows - 1;
      else if (head.y >= this.rows) head.y = 0;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.sfx.playFood();
      this.score++;
      this.scoreChange.emit(this.score);
      if (this.score > this.highScore) {
        if (!this.celebratedHighScore) {
          this.sfx.playWin(); 
          this.celebratedHighScore = true;
        }
        this.highScore = this.score;
        this.highScoreChange.emit(this.highScore);
      }

      this.fruitsCollected++;
      const target = Number(this.targetFruits ?? 0);
      if (target > 0 && this.fruitsCollected >= target) {
        this.finishGame('win');
        return;
      }

      this.spawnFood();
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

    if (this.obstaclesOn && this.obstacles.has(this.keyOf(head))) {
      this.finishGame('lose');
      return;
    }

    this.drawAll();
  }

  private finishGame(reason: 'win' | 'lose' | 'finish') {
  this.over = true;
  window.clearInterval(this.intervalId);

  if (reason === 'win' || reason === 'finish') this.sfx.playWin();
  else this.sfx.playLose();

  this.drawAll();

  this.ctx.save();
  this.ctx.globalAlpha = 0.75;
  this.ctx.fillStyle = '#000';
  this.ctx.fillRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);
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
  this.ctx.fillText(title, (this.cols * this.cellSize) / 2, (this.rows * this.cellSize) / 2 - 10);

  this.ctx.fillStyle = '#e5e7eb';
  this.ctx.font = '14px monospace';
  const cx = (this.cols * this.cellSize) / 2;
  const cy = (this.rows * this.cellSize) / 2 + 16;
  const lines: string[] = [
    `Score: ${this.score}`,
    `Speed: ${this.gameSpeed.toFixed(2)}x`,
    this.targetFruits ? `Fruits: ${this.fruitsCollected}/${this.targetFruits}` : '',
    'Click to Restart',
  ].filter(Boolean);
  lines.forEach((t, i) => this.ctx.fillText(t, cx, cy + i * 20));

  this.gameOver.emit();
}


  private generateObstacles() {
    this.obstacles.clear();
    if (!this.isSpeedMode || !this.obstaclesOn) return;

    const candidateCells: Cell[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) candidateCells.push({ x, y });
    }

    const midY = Math.floor(this.rows / 2);
    const reserved = new Set<string>();
    for (let i = 0; i < this.snakeInitLen + 3; i++) {
      reserved.add(this.keyOf({ x: i, y: midY }));
    }

    const total = candidateCells.length;

    const preset =
      ((this.speedSettings as any)?.obstaclePreset as
        | 'easy'
        | 'medium'
        | 'hard') ?? 'medium';
    const d = Math.max(
      0,
      Math.min(0.25, this.speedSettings?.obstacleDensity ?? 0.02)
    );

    let target: number;
    if (preset === 'easy') {
      const approx = Math.floor(total * d);
      target = Math.max(4, Math.min(approx, 10));
    } else if (preset === 'medium') {
      target = Math.max(10, Math.floor(total * 0.03));
    } else {
      target = Math.floor(total * d);
    }

    let added = 0;
    while (added < target) {
      const idx = Math.floor(Math.random() * candidateCells.length);
      const c = candidateCells[idx];
      const k = this.keyOf(c);
      if (!reserved.has(k) && !this.obstacles.has(k)) {
        this.obstacles.add(k);
        added++;
      }
    }
  }

  private spawnFood() {
    while (true) {
      const fx = Math.floor(Math.random() * this.cols);
      const fy = Math.floor(Math.random() * this.rows);
      const onSnake = this.snake.some((p) => p.x === fx && p.y === fy);
      const onObstacle = this.obstaclesOn && this.obstacles.has(`${fx},${fy}`);
      if (!onSnake && !onObstacle) {
        this.food = { x: fx, y: fy };
        return;
      }
    }
  }

  private drawAll() {
  this.ctx.fillStyle = '#f3f3f3';
  this.ctx.fillRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);

  if (this.obstaclesOn) {
    this.ctx.fillStyle = '#555';
    for (const key of this.obstacles) {
      const [xStr, yStr] = key.split(',');
      const x = Number(xStr), y = Number(yStr);
      this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
    }
  }

  this.ctx.fillStyle = 'red';
  this.ctx.fillRect(
    this.food.x * this.cellSize,
    this.food.y * this.cellSize,
    this.cellSize,
    this.cellSize
  );

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

  const cx = (gx: number) => gx * tile + tile / 2;
  const cy = (gy: number) => gy * tile + tile / 2;

  const p0 = { x: cx(snakeCells[0].x), y: cy(snakeCells[0].y) };
  const pN = { x: cx(snakeCells[snakeCells.length - 1].x), y: cy(snakeCells[snakeCells.length - 1].y) };
  this.setStrokeForSkin(ctx, skin, p0.x, p0.y, pN.x, pN.y);

  ctx.lineWidth = tile;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 3;

  const snap = (v: number) => Math.round(v) + 0.5;

  ctx.beginPath();
  ctx.moveTo(snap(p0.x), snap(p0.y));

  for (let i = 1; i < snakeCells.length; i++) {
    const a = snakeCells[i - 1];
    const b = snakeCells[i];

    const ax = cx(a.x), ay = cy(a.y);
    const bx = cx(b.x), by = cy(b.y);

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const horizontalWrap = this.wrapEdges && Math.abs(dx) > 1;
    const verticalWrap   = this.wrapEdges && Math.abs(dy) > 1;

    if (horizontalWrap) {
      const leftEdgeX  = 0; 
      const rightEdgeX = this.cols * tile; 

      const jumpedLeftToRight = a.x < b.x;
      const edgeFrom = jumpedLeftToRight ? leftEdgeX  : rightEdgeX;
      const edgeTo   = jumpedLeftToRight ? rightEdgeX : leftEdgeX;

      ctx.lineTo(snap(edgeFrom), snap(ay));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(snap(edgeTo), snap(by));
      ctx.lineTo(snap(bx), snap(by));
      continue;
    }

    if (verticalWrap) {
      const topEdgeY    = 0;
      const bottomEdgeY = this.rows * tile;

      const jumpedTopToBottom = a.y < b.y;
      const edgeFrom = jumpedTopToBottom ? topEdgeY    : bottomEdgeY;
      const edgeTo   = jumpedTopToBottom ? bottomEdgeY : topEdgeY;

      ctx.lineTo(snap(ax), snap(edgeFrom));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(snap(bx), snap(edgeTo));
      ctx.lineTo(snap(bx), snap(by));
      continue;
    }

    ctx.lineTo(snap(bx), snap(by));
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
    if (this.paused) this.resumeRequested.emit();
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

  private resetRoundRuntime() {
    if (this.isSpeedMode) {
      const ta = Number(this.speedSettings?.timeAttackSec);
      this.timeLeftMs =
        Number.isFinite(ta) && ta > 0 ? Math.floor(ta * 1000) : 0;

      this.gameSpeed = 1;
      this.recomputeTickFromGameSpeed();
      this.speedChange.emit(this.gameSpeed);
    }
    this.lastTickAt = performance.now();
    this.accelBuffer = 0;
    this.BASE_TICK_MS = this.tickMs;
  }
}
