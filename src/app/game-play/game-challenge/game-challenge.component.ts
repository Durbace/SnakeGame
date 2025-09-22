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
type FruitType = 'normal' | 'toxic' | 'golden' | 'fake';

export interface ChallengeSettings {
  gridSize: number;
  wrapEdges: boolean;
  startingLength: number;
  startingSpeed: number;
}

@Component({
  selector: 'app-game-challenge',
  imports: [],
  templateUrl: './game-challenge.component.html',
  styleUrl: './game-challenge.component.css'
})
export class GameChallengeComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() mode: 'classic' | 'speed' | 'challenge' | null = null;
  @Input() classicSettings: ChallengeSettings | null = null;

  @Input() paused = false;
  @Input() gameSpeed = 1;

  @Output() scoreChange = new EventEmitter<number>();
  @Output() highScoreChange = new EventEmitter<number>();
  @Output() speedChange = new EventEmitter<number>();
  @Output() gameOver = new EventEmitter<void>();
  @Output() requestRestart = new EventEmitter<void>();
  @Output() resumeRequested = new EventEmitter<void>();

  @ViewChild('screen', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  // === Game state ===
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

  // fruit
  private food!: Cell;
  private foodType: FruitType = 'normal';
  private foodExpiresAt: number | null = null; // doar pentru golden

  // obstacles
  private obstacles: Cell[] = [];

  private over = false;
  private snakeInitLen = 5;

  // === Spawn chances (poți regla ușor) ===
  // Totalul nu trebuie să fie 100; logica e pe “roulette wheel”.
  private CHANCE_NORMAL = 0.70;
  private CHANCE_TOXIC  = 0.12;
  private CHANCE_GOLDEN = 0.10;
  private CHANCE_FAKE   = 0.08;

  // Golden durează 2s
  private GOLDEN_LIFETIME_MS = 2000;
  // Fake: +2 obstacole
  private FAKE_OBSTACLES_ON_PICKUP = 2;

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
      this.vx = -1; this.vy = 0;
    } else if ((k === 'ArrowUp' || k.toLowerCase() === 'w') && !goingDown) {
      this.vx = 0; this.vy = -1;
    } else if ((k === 'ArrowRight' || k.toLowerCase() === 'd') && !goingLeft) {
      this.vx = 1; this.vy = 0;
    } else if ((k === 'ArrowDown' || k.toLowerCase() === 's') && !goingUp) {
      this.vx = 0; this.vy = 1;
    }
  }

  private applyClassicSettings(s: ChallengeSettings) {
    if (Number.isFinite(s.gridSize) && s.gridSize >= 8 && s.gridSize <= 120) {
      this.cols = Math.floor(s.gridSize);
    }
    this.rows = this.fixedRows;

    this.wrapEdges = !!s.wrapEdges;

    const sp = Math.min(10, Math.max(1, Math.floor(s.startingSpeed)));
    const MAX = 240, MIN = 60;
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
    this.vx = 1; this.vy = 0;

    this.score = 0;
    this.over = false;
    this.obstacles = [];
    this.foodExpiresAt = null;

    this.spawnFood(); // alege și tipul
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
    // Golden despawn check
    if (this.foodType === 'golden' && this.foodExpiresAt !== null) {
      if (Date.now() >= this.foodExpiresAt) {
        // expiră golden-ul
        this.spawnFood();
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

    const ateFood = (head.x === this.food.x && head.y === this.food.y);

    if (ateFood) {
      // Efecte în funcție de tipul fructului:
      switch (this.foodType) {
        case 'normal':
          this.incrementScore(1);
          break;
        case 'toxic':
          this.shrinkSnake(1);
          // Toxic NU dă scor, doar scurtează
          break;
        case 'golden':
          this.incrementScore(3);
          break;
        case 'fake':
          this.addObstacles(this.FAKE_OBSTACLES_ON_PICKUP);
          // Fake NU dă scor
          break;
      }
      this.spawnFood();
    } else {
      // nu a mâncat: se mișcă normal
      this.snake.pop();
    }

    // Borders (dacă nu e wrap)
    if (!this.wrapEdges &&
      (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows)) {
      this.finishGame();
      return;
    }

    // Self collision
    for (let i = 1; i < this.snake.length; i++) {
      const p = this.snake[i];
      if (p.x === head.x && p.y === head.y) {
        this.finishGame();
        return;
      }
    }

    // Obstacles collision
    if (this.obstacles.some(o => o.x === head.x && o.y === head.y)) {
      this.finishGame();
      return;
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
    this.ctx.fillRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);
    this.ctx.restore();

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over', (this.cols * this.cellSize) / 2, (this.rows * this.cellSize) / 2);
    this.ctx.font = '14px monospace';
    this.ctx.fillText('Click to Restart', (this.cols * this.cellSize) / 2, (this.rows * this.cellSize) / 2 + 28);

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
    // alege o celulă care nu e pe șarpe, nu e mâncare și nu e obstacol
    const used = new Set<string>();
    for (const s of this.snake) used.add(`${s.x},${s.y}`);
    for (const o of this.obstacles) used.add(`${o.x},${o.y}`);
    if (this.food) used.add(`${this.food.x},${this.food.y}`);

    const freeCount = this.cols * this.rows - used.size;
    if (freeCount <= 0) return null;

    // încercări random limitate
    for (let tries = 0; tries < 200; tries++) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      if (!used.has(`${x},${y}`)) return { x, y };
    }
    // fallback: scan
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!used.has(`${x},${y}`)) return { x, y };
      }
    }
    return null;
  }

  private spawnFood() {
    // alege tipul
    const r = Math.random();
    const t = this.pickFruitType(r);
    this.foodType = t;

    // plasare pe celulă liberă
    const cell = this.randomFreeCell();
    if (!cell) {
      // dacă nu mai e spațiu liber, jocul e practic complet — forțăm normal pe capul șarpelui (fail-safe)
      this.food = { x: 0, y: 0 };
    } else {
      this.food = cell;
    }

    // setează/desetează expirarea pt golden
    if (t === 'golden') {
      this.foodExpiresAt = Date.now() + this.GOLDEN_LIFETIME_MS;
    } else {
      this.foodExpiresAt = null;
    }
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
    // background
    this.ctx.fillStyle = '#f3f3f3';
    this.ctx.fillRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);

    // food
    // culori implicite: normal=red, toxic=purple, golden=gold, fake=orange
    const colorMap: Record<FruitType, string> = {
      normal: '#ef4444',
      toxic: '#7e22ce',
      golden: '#eab308',
      fake: '#f97316',
    };

    // golden: mic efect “blink” când e pe ducă (ultimele 600ms)
    if (this.foodType === 'golden' && this.foodExpiresAt) {
      const remaining = this.foodExpiresAt - Date.now();
      if (remaining < 600 && remaining > 0) {
        // 50% vizibilitate ca blink
        if (Math.floor(remaining / 100) % 2 === 0) {
          // săr peste desenare ca să clipească
        } else {
          this.ctx.fillStyle = colorMap[this.foodType];
          this.ctx.fillRect(this.food.x * this.cellSize, this.food.y * this.cellSize, this.cellSize, this.cellSize);
        }
      } else {
        this.ctx.fillStyle = colorMap[this.foodType];
        this.ctx.fillRect(this.food.x * this.cellSize, this.food.y * this.cellSize, this.cellSize, this.cellSize);
      }
    } else {
      this.ctx.fillStyle = colorMap[this.foodType];
      this.ctx.fillRect(this.food.x * this.cellSize, this.food.y * this.cellSize, this.cellSize, this.cellSize);
    }

    // obstacles
    this.ctx.fillStyle = '#334155';
    for (const o of this.obstacles) {
      this.ctx.fillRect(o.x * this.cellSize, o.y * this.cellSize, this.cellSize, this.cellSize);
    }

    // snake
    this.ctx.fillStyle = '#111';
    for (const part of this.snake) {
      this.ctx.fillRect(part.x * this.cellSize, part.y * this.cellSize, this.cellSize, this.cellSize);
    }
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
    this.ctx.fillRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);
    this.ctx.restore();

    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.fillText('Paused', (this.cols * this.cellSize) / 2, (this.rows * this.cellSize) / 2);
    this.ctx.font = '14px monospace';
    this.ctx.fillText('Click to resume', (this.cols * this.cellSize) / 2, (this.rows * this.cellSize) / 2 + 28);
  }
}
