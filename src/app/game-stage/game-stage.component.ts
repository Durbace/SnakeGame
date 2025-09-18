import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { GameClassicComponent } from '../game-play/game-classic/game-classic.component';
import { GameSpeedComponent, SpeedModeSettings } from '../game-play/game-speed/game-speed.component';
import { HowToPlayComponent } from '../how-to-play/how-to-play.component';

@Component({
  selector: 'app-game-stage',
  standalone: true,
  imports: [CommonModule, GameClassicComponent, GameSpeedComponent, HowToPlayComponent],
  templateUrl: './game-stage.component.html',
  styleUrls: ['./game-stage.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class GameStageComponent implements OnInit {
  // Header / HUD inputs (pot fi suprascrise din parent dacă vrei)
  @Input() title = 'Retro Snake';
  @Input() score = 0;
  @Input() highScore = 0;
  @Input() difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  @Input() gameSpeed = 1;
  @Input() paused = false;

  @Output() howTo = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() pauseToggle = new EventEmitter<void>();

  mode: 'classic' | 'speed' | 'challenge' | null = null;

  // Setări Classic (exact ca înainte)
  settings: any = null;

  // Setări Speed (venite din SpeedModeComponent)
  speedSettings: SpeedModeSettings = {
    startingSpeed: 5,
    accelRate: 1.0,
    timeAttackSec: 120,
    obstaclesOn: false,
    gridSize: 20,
    wrapEdges: false,
    startingLength: 5,
  };

  // HUD suplimentar pentru Speed Mode
  timeLeft = 0; // secunde rămase (actualizat de game-speed)

  // Referințe la board
  @ViewChild(GameClassicComponent) classicRef?: GameClassicComponent;
  @ViewChild(GameSpeedComponent) speedRef?: GameSpeedComponent;

  showHowTo = false;
  private wasPausedBeforeHowTo = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Preluăm state din router (mode + setări)
    const st = this.router.getCurrentNavigation()?.extras?.state ?? window.history.state;

    this.mode = st?.mode ?? this.mode ?? null;
    this.settings = st?.settings ?? this.settings ?? null;

    // dacă vin setări de speed din alt ecran (SpeedModeComponent)
    const s = st?.speedSettings as Partial<SpeedModeSettings> | undefined;
    if (s) this.speedSettings = { ...this.speedSettings, ...s };
  }

  // ——— Helpers ———
  private activeGame() {
    // întoarce componenta activă, în funcție de mod
    if (this.mode === 'speed') return this.speedRef;
    return this.classicRef;
  }

  // ——— Top bar actions ———
  onClickHome() {
    this.router.navigate(['/']);
  }

  onClickHowTo() {
    this.wasPausedBeforeHowTo = this.paused;
    if (!this.paused) {
      this.paused = true;
      this.pauseToggle.emit();
      this.activeGame()?.setPaused(true);
    }
    this.showHowTo = true;
    this.howTo.emit();
  }

  closeHowTo() {
    this.showHowTo = false;
    // dacă nu era pauzat înainte, revenim la gameplay
    if (!this.wasPausedBeforeHowTo) {
      this.paused = false;
      this.activeGame()?.setPaused(false);
    }
  }

  onClickRestart() {
    this.paused = false;
    this.activeGame()?.setPaused(false);
    this.restart.emit();
    this.activeGame()?.restart();
    this.score = 0;
    if (this.mode === 'speed') this.timeLeft = this.speedSettings.timeAttackSec || 0;
  }

  onClickPauseToggle() {
    if (this.showHowTo) return;
    this.paused = !this.paused;
    this.pauseToggle.emit();
    this.activeGame()?.setPaused(this.paused);
  }

  // ——— Event handlers din board ———
  handleScoreChange(val: number) {
    this.score = val;
    if (this.score > this.highScore) this.highScore = this.score;
  }
  handleHighScoreChange(val: number) { this.highScore = val; }
  handleSpeedChange(val: number) { this.gameSpeed = val; }

  handleGameOver() {
    this.paused = true;
    this.activeGame()?.setPaused(true);
  }

  handleRequestedRestart() {
    this.onClickRestart();
  }

  handleResumeRequested() {
    if (this.showHowTo) return;
    if (this.paused) this.onClickPauseToggle();
  }

  // Doar în Speed Mode: primește timpul rămas
  handleTimeLeftChange(sec: number) {
    this.timeLeft = sec;
  }

  // ——— Keyboard ———
  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (this.showHowTo) {
      if (key === 'escape') this.closeHowTo();
      e.preventDefault();
      return;
    }

    // prevenim scroll arrow/space
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    if (key === ' ') { this.onClickPauseToggle(); return; }
    if (key === 'r') { this.onClickRestart(); return; }

    this.activeGame()?.handleKey(e.key);
  }
}
