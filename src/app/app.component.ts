import { Component, ViewChild, ElementRef, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';

type Cell = { x: number; y: number };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  score = 0;

  @ViewChild('screen', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly cellSize = 20;
  readonly cols = 20; 
  readonly rows = 20; 
  readonly tickMs = 120;
  private deviceScale = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  private ctx!: CanvasRenderingContext2D;
  private intervalId: any;

  private snake: Cell[] = [];
  private vx = 1; 
  private vy = 0;
  private food!: Cell;
  private gameOver = false;
  paused = false;

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.resetGame();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.intervalId);
  }

  private setupCanvas() {
    const canvas = this.canvasRef.nativeElement;

    const cssW = 400;
    const cssH = 400;
    canvas.width = cssW * this.deviceScale;
    canvas.height = cssH * this.deviceScale;

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;

    this.ctx.setTransform(this.deviceScale, 0, 0, this.deviceScale, 0, 0);
  }

  resetGame() {
    window.clearInterval(this.intervalId);

    this.snake = [
      { x: 4, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ];
    this.vx = 1; this.vy = 0;
    this.score = 0;
    this.gameOver = false;
    this.paused = false;

    this.spawnFood();
    this.drawAll();

    this.intervalId = window.setInterval(() => {
      if (!this.gameOver && !this.paused) {
        this.tick();
      }
    }, this.tickMs);
  }

  togglePause() { this.paused = !this.paused; }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    const goingUp = this.vy === -1;
    const goingDown = this.vy === 1;
    const goingRight = this.vx === 1;
    const goingLeft = this.vx === -1;

    if (e.key === 'ArrowLeft' && !goingRight) { this.vx = -1; this.vy = 0; }
    else if (e.key === 'ArrowUp' && !goingDown) { this.vx = 0; this.vy = -1; }
    else if (e.key === 'ArrowRight' && !goingLeft) { this.vx = 1; this.vy = 0; }
    else if (e.key === 'ArrowDown' && !goingUp) { this.vx = 0; this.vy = 1; }
  }

  private tick() {
    const head = { x: this.snake[0].x + this.vx, y: this.snake[0].y + this.vy };
    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
      this.endGame();
      return;
    }

    for (let i = 1; i < this.snake.length; i++) {
      const p = this.snake[i];
      if (p.x === head.x && p.y === head.y) {
        this.endGame();
        return;
      }
    }

    this.drawAll();
  }

  private endGame() {
    this.gameOver = true;
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
    this.ctx.fillText('Press Restart', (this.cols * this.cellSize) / 2, (this.rows * this.cellSize) / 2 + 28);
  }

  private spawnFood() {
    while (true) {
      const fx = Math.floor(Math.random() * this.cols);
      const fy = Math.floor(Math.random() * this.rows);
      const onSnake = this.snake.some(p => p.x === fx && p.y === fy);
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

    this.ctx.fillStyle = '#111';
    for (const part of this.snake) {
      this.ctx.fillRect(
        part.x * this.cellSize,
        part.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }
  }
}
