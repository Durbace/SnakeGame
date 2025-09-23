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
import {
  GameSpeedComponent,
  SpeedModeSettings,
} from '../game-play/game-speed/game-speed.component';
import { GameChallengeComponent } from '../game-play/game-challenge/game-challenge.component';
import { SnakeSkin } from '../settings/settings.component';
import { SnakeSkinStore } from '../services/snake-skin.store';

interface ChallengeGoals {
  targetFruits: number;
  targetTime: number;
  powerUpsOn: boolean;
  wallsAllowed: boolean;
}

@Component({
  selector: 'app-game-stage',
  standalone: true,
  imports: [
    CommonModule,
    GameClassicComponent,
    GameSpeedComponent,
    GameChallengeComponent,
  ],
  templateUrl: './game-stage.component.html',
  styleUrls: ['./game-stage.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class GameStageComponent implements OnInit {
  @Input() title = 'Retro Snake';
  @Input() score = 0;
  @Input() highScore = 0;
  @Input() difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  @Input() gameSpeed = 1;
  @Input() paused = false;

  @Output() restart = new EventEmitter<void>();
  @Output() pauseToggle = new EventEmitter<void>();

  mode: 'classic' | 'speed' | 'challenge' | null = null;

  settings: any = null;

  fruitsRemaining: number | null = null;

  speedSettings: SpeedModeSettings = {
    startingSpeed: 5,
    accelRate: 1.0,
    timeAttackSec: 120,
    obstaclesOn: false,
    gridSize: 20,
    wrapEdges: false,
    startingLength: 5,
  };

  goals: ChallengeGoals | null = null;

  timeLeft = 0;

  snakeSkin: SnakeSkin;

  @ViewChild(GameClassicComponent) classicRef?: GameClassicComponent;
  @ViewChild(GameSpeedComponent) speedRef?: GameSpeedComponent;
  @ViewChild(GameChallengeComponent) challengeRef?: GameChallengeComponent;

  constructor(
    private router: Router,
    private skinStore: SnakeSkinStore 
  ) {
    this.snakeSkin = this.skinStore.get();
  }

   ngOnInit() {
    const st = this.router.getCurrentNavigation()?.extras?.state ?? window.history.state;

    this.mode = st?.mode ?? this.mode ?? null;
    this.settings = st?.settings ?? this.settings ?? null;
    this.goals = st?.goals ?? this.goals ?? null;

    const incoming = st?.snakeSkin as SnakeSkin | undefined;
    this.snakeSkin = incoming ?? this.skinStore.get();

    const s = st?.speedSettings as Partial<SpeedModeSettings> | undefined;
    if (s) this.speedSettings = { ...this.speedSettings, ...s };

    if (this.mode === 'speed') this.timeLeft = this.speedSettings.timeAttackSec ?? 0;
    if (this.mode === 'challenge') {
      this.timeLeft = this.goals?.targetTime ?? 0;
      this.fruitsRemaining = this.goals?.targetFruits ?? null;
    }
  }

  private activeGame() {
    if (this.mode === 'speed') return this.speedRef;
    if (this.mode === 'challenge') return this.challengeRef;
    return this.classicRef;
  }

  onClickHome() {
    this.router.navigate(['/']);
  }

  onClickRestart() {
    this.paused = false;
    this.activeGame()?.setPaused(false);
    this.restart.emit();
    this.activeGame()?.restart();
    this.score = 0;

    if (this.mode === 'speed')
      this.timeLeft = this.speedSettings.timeAttackSec || 0;

    if (this.mode === 'challenge') {
      this.timeLeft = this.goals?.targetTime || 0;
      this.fruitsRemaining = this.goals?.targetFruits ?? null;
    }
  }

  onClickPauseToggle() {
    this.paused = !this.paused;
    this.pauseToggle.emit();
    this.activeGame()?.setPaused(this.paused);
  }

  handleScoreChange(val: number) {
    this.score = val;
    if (this.mode !== 'challenge' && this.score > this.highScore) {
      this.highScore = this.score;
    }
    if (this.mode === 'challenge' && this.goals?.targetFruits != null) {
      const total = this.goals.targetFruits;
      this.fruitsRemaining = Math.max(0, total - this.score);
    }
  }
  handleHighScoreChange(val: number) {
    this.highScore = val;
  }
  handleSpeedChange(val: number) {
    this.gameSpeed = val;
  }

  handleGameOver() {
    this.paused = true;
    this.activeGame()?.setPaused(true);
  }

  handleRequestedRestart() {
    this.onClickRestart();
  }

  handleResumeRequested() {
    if (this.paused) this.onClickPauseToggle();
  }

  handleTimeLeftChange(sec: number) {
    this.timeLeft = sec;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (
      ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(
        e.key.toLowerCase()
      )
    ) {
      e.preventDefault();
    }

    if (key === ' ') {
      this.onClickPauseToggle();
      return;
    }
    if (key === 'r') {
      this.onClickRestart();
      return;
    }

    this.activeGame()?.handleKey(e.key);
  }

  onSnakeSkinChange(skin: typeof this.snakeSkin) {
    this.snakeSkin = { ...skin };
  }
}
