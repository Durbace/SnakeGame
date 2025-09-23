import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type SnakeSkin = {
  style: 'solid' | 'stripes' | 'gradient';
  base: string; 
  accent: string; 
  stripeWidth: number; 
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements AfterViewInit, OnChanges {
  public Math = Math;
  @Input() sfxEnabled = true;
  @Input() musicVolume = 50;
  @Output() sfxToggled = new EventEmitter<boolean>();
  @Output() musicVolumeChange = new EventEmitter<number>();

  @Input() snakeSkin: SnakeSkin = {
    style: 'stripes',
    base: '#22c55e',
    accent: '#065f46',
    stripeWidth: 6,
  };
  @Output() snakeSkinChange = new EventEmitter<SnakeSkin>();

  @ViewChild('previewCanvas') previewCanvas!: ElementRef<HTMLCanvasElement>;

  onToggleSfx(evt: Event) {
    const checked = (evt.target as HTMLInputElement).checked;
    this.sfxToggled.emit(checked);
  }
  onChangeMusicVol(evt: Event) {
    const vol = +(evt.target as HTMLInputElement).value;
    this.musicVolumeChange.emit(vol);
  }

  onChangeStyle(style: SnakeSkin['style']) {
  this.snakeSkin = { ...this.snakeSkin, style };
  this.snakeSkinChange.emit(this.snakeSkin);
  this.drawPreview();
}

  onChangeBase(evt: Event) {
    const base = (evt.target as HTMLInputElement).value;
    this.snakeSkin = { ...this.snakeSkin, base };
    this.snakeSkinChange.emit(this.snakeSkin);
    this.drawPreview();
  }
  onChangeAccent(evt: Event) {
    const accent = (evt.target as HTMLInputElement).value;
    this.snakeSkin = { ...this.snakeSkin, accent };
    this.snakeSkinChange.emit(this.snakeSkin);
    this.drawPreview();
  }
  onChangeStripeWidth(evt: Event) {
    const stripeWidth = +(evt.target as HTMLInputElement).value;
    this.snakeSkin = { ...this.snakeSkin, stripeWidth };
    this.snakeSkinChange.emit(this.snakeSkin);
    this.drawPreview();
  }

  ngAfterViewInit(): void {
    this.drawPreview();
  }
  ngOnChanges(_: SimpleChanges): void {
    this.drawPreview();
  }

  @HostListener('window:resize')
  onResize() {
    this.drawPreview();
  }

  private getCtx(): CanvasRenderingContext2D | null {
    const canvas = this.previewCanvas?.nativeElement;
    if (!canvas) return null;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = canvas.parentElement ? canvas.parentElement.clientWidth : 360;
    const cssH = 220;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  private drawPreview() {
  const ctx = this.getCtx();
  if (!ctx) return;

  const canvas = this.previewCanvas.nativeElement;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  const tile = 18; 
  const barLen = 140;  
  const cx = W / 2;
  const y  = H - 40;  

  this.applyStroke(ctx, cx - barLen/2, y, cx + barLen/2, y);

  ctx.lineWidth = tile;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'bevel';

  ctx.beginPath();
  ctx.moveTo(cx - barLen/2, y);
  ctx.lineTo(cx + barLen/2, y);
  ctx.stroke();
}

private applyStroke(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const s = this.snakeSkin;

  if (s.style === 'solid') {
    ctx.strokeStyle = s.base;
    return;
  }

  if (s.style === 'gradient') {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, s.base);
    g.addColorStop(1, s.accent);
    ctx.strokeStyle = g;
    return;
  }

  const pattern = this.makeStripePattern(ctx, s);
  ctx.strokeStyle = pattern;
}

  private drawHead(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tile: number,
    angle: number
  ) {
    ctx.save();
    this.applyFill(ctx);
    ctx.fillRect(x, y, tile, tile); 

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + tile * 0.7, y + tile * 0.25, 3, 3);
    ctx.fillRect(x + tile * 0.7, y + tile * 0.65, 3, 3);

    ctx.restore();
  }

  private drawTail(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tile: number,
    angle: number
  ) {
    ctx.save();
    this.applyFill(ctx);
    ctx.fillRect(x, y, tile, tile); 
    ctx.restore();
  }

  private drawSegment(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tile: number
  ) {
    ctx.save();
    this.applyFill(ctx);
    ctx.fillRect(x, y, tile, tile); 
    ctx.restore();
  }

  private applyFill(ctx: CanvasRenderingContext2D) {
    const s = this.snakeSkin;
    if (s.style === 'solid') {
      ctx.fillStyle = s.base;
      return;
    }
    if (s.style === 'gradient') {
      const g = ctx.createRadialGradient(0, 0, 6, 0, 0, 18);
      g.addColorStop(0, s.base);
      g.addColorStop(1, s.accent);
      ctx.fillStyle = g;
      return;
    }
    ctx.fillStyle = this.makeStripePattern(ctx, s);
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

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
}
