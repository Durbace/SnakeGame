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


@Component({
  selector: 'app-game-classic',
  standalone: true,
  imports: [],
  templateUrl: './game-classic.component.html',
  styleUrls: ['./game-classic.component.css'],
})
export class GameClassicComponent
  implements AfterViewInit, OnDestroy, OnChanges
{
  @Input() mode: 'classic' | 'speed' | 'challenge' | null = null;
  @Input() classicSettings: ClassicSettings | null = null;

  @Input() paused = false;
  @Input() gameSpeed = 1;

  @Input() snakeSkin: SnakeSkin = {
  style: 'stripes',
  base: '#22c55e',
  accent: '#065f46',
  stripeWidth: 6,
};

  @Output() scoreChange = new EventEmitter<number>();
  @Output() highScoreChange = new EventEmitter<number>();
  @Output() speedChange = new EventEmitter<number>();
  @Output() gameOver = new EventEmitter<void>();
  @Output() requestRestart = new EventEmitter<void>();
  @Output() resumeRequested = new EventEmitter<void>();

  @ViewChild('screen', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  score = 0;
  private highScore = 0;

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
  private baseTickMs = 120;

  private snakeInitLen = 5;

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

  private applyClassicSettings(s: ClassicSettings) {
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

    this.spawnFood();
    this.drawAll();

    this.restartInterval();

    this.scoreChange.emit(this.score);
    this.highScoreChange.emit(this.highScore);
    this.speedChange.emit(this.gameSpeed);
  }

  private restartInterval() {
    window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      if (!this.over && !this.paused) this.tick();
    }, this.tickMs);
  }

  private tick() {
    const head = { x: this.snake[0].x + this.vx, y: this.snake[0].y + this.vy };

    if (this.wrapEdges) {
      if (head.x < 0) head.x = this.cols - 1;
      else if (head.x >= this.cols) head.x = 0;
      if (head.y < 0) head.y = this.rows - 1;
      else if (head.y >= this.rows) head.y = 0;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.scoreChange.emit(this.score);
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.highScoreChange.emit(this.highScore);
      }
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    if (
      !this.wrapEdges &&
      (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows)
    ) {
      this.finishGame();
      return;
    }

    for (let i = 1; i < this.snake.length; i++) {
      const p = this.snake[i];
      if (p.x === head.x && p.y === head.y) {
        this.finishGame();
        return;
      }
    }

    this.drawAll();
  }

  private finishGame() {
    this.over = true;
    window.clearInterval(this.intervalId);
    this.drawAll();

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
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'Game Over',
      (this.cols * this.cellSize) / 2,
      (this.rows * this.cellSize) / 2
    );
    this.ctx.font = '14px monospace';
    this.ctx.fillText(
      'Click to Restart',
      (this.cols * this.cellSize) / 2,
      (this.rows * this.cellSize) / 2 + 28
    );

    this.gameOver.emit();
  }

  private spawnFood() {
    while (true) {
      const fx = Math.floor(Math.random() * this.cols);
      const fy = Math.floor(Math.random() * this.rows);
      const onSnake = this.snake.some((p) => p.x === fx && p.y === fy);
      if (!onSnake) {
        this.food = { x: fx, y: fy };
        return;
      }
    }
  }

  private drawAll() {
  this.ctx.fillStyle = '#f3f3f3';
  this.ctx.fillRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);

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
  snakeCells: {x:number,y:number}[],
  tile: number,
  skin: SnakeSkin
) {
  if (snakeCells.length === 0) return;

  if (snakeCells.length === 1) {
    this.setStrokeForSkin(ctx, skin, 0, 0, 1, 0); 
    ctx.fillStyle = (skin.style === 'solid') ? skin.base :
                    (skin.style === 'gradient')
                      ? this.linearGradientForRect(ctx, snakeCells[0], tile, skin)
                      : this.makeStripePattern(ctx, skin) as any;
    ctx.fillRect(snakeCells[0].x * tile, snakeCells[0].y * tile, tile, tile);
    return;
  }

  const pts = snakeCells.map(c => ({
    x: c.x * tile + tile / 2,
    y: c.y * tile + tile / 2,
  }));

  const p0 = pts[0], pN = pts[pts.length - 1];
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
  x1: number, y1: number, x2: number, y2: number
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

private makeStripePattern(ctx: CanvasRenderingContext2D, s: SnakeSkin): CanvasPattern {
  const size = Math.max(4, s.stripeWidth) * 2;
  const off = document.createElement('canvas');
  off.width = size; off.height = size;
  const o = off.getContext('2d')!;
  o.fillStyle = s.base;
  o.fillRect(0, 0, size, size);
  o.strokeStyle = s.accent;
  o.lineWidth = s.stripeWidth;
  o.beginPath();
  o.moveTo(-size, size * 0.6); o.lineTo(size * 2, -size * 0.4);
  o.moveTo(-size, size * 1.6); o.lineTo(size * 2,  size * 0.6);
  o.stroke();
  return ctx.createPattern(off, 'repeat')!;
}

private linearGradientForRect(ctx: CanvasRenderingContext2D, c: Cell, tile: number, s: SnakeSkin) {
  const x1 = c.x * tile, y1 = c.y * tile;
  const g = ctx.createLinearGradient(x1, y1, x1 + tile, y1 + tile);
  g.addColorStop(0, s.base);
  g.addColorStop(1, s.accent);
  return g;
}

  public onCanvasClick(): void {
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
}
