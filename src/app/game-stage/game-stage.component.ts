import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
  OnInit,
  HostListener,
  OnDestroy,
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
import { SfxService } from '../services/sfx.service';
import { SettingsComponent } from '../settings/settings.component';

import { HighScoreStore } from '../services/high-score.store';
import { PrefsStore } from '../services/prefs.store';
import { Subscription } from 'rxjs';

interface ChallengeGoals {
  targetFruits: number;
  targetTime: number;
  wallsAllowed: boolean;
  powerUpsOn?: boolean;
}

@Component({
  selector: 'app-game-stage',
  standalone: true,
  imports: [
    CommonModule,
    GameClassicComponent,
    GameSpeedComponent,
    GameChallengeComponent,
    SettingsComponent,
  ],
  templateUrl: './game-stage.component.html',
  styleUrls: ['./game-stage.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class GameStageComponent implements OnInit, OnDestroy {
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

  isSettingsOpen = false;
  wasPausedBeforeSettings = false;
  sfxEnabledUi = true;
  musicVolumeUi = 50;

  @ViewChild(GameClassicComponent) classicRef?: GameClassicComponent;
  @ViewChild(GameSpeedComponent) speedRef?: GameSpeedComponent;
  @ViewChild(GameChallengeComponent) challengeRef?: GameChallengeComponent;

  private skinSub?: Subscription;

  constructor(
    private router: Router,
    private skinStore: SnakeSkinStore,
    private sfx: SfxService,
    private hs: HighScoreStore,
    private prefs: PrefsStore
  ) {
    this.snakeSkin = this.skinStore.get();
    this.skinSub = this.skinStore.skin$.subscribe((s) => {
      this.snakeSkin = s;
    });
  }

  private unlockMusic = () => {
    this.sfx.startMusic();
  };

  ngOnInit() {
    const st =
      this.router.getCurrentNavigation()?.extras?.state ?? window.history.state;

    this.mode = st?.mode ?? this.prefs.getLastMode() ?? this.mode ?? null;

    this.settings = st?.settings ?? this.settings ?? null;
    this.goals = st?.goals ?? this.goals ?? null;

    const incomingSpeed = st?.speedSettings as
      | Partial<SpeedModeSettings>
      | undefined;
    if (incomingSpeed) {
      this.speedSettings = { ...this.speedSettings, ...incomingSpeed };
    }

    if (!this.settings && this.mode === 'classic') {
      const savedClassic = this.prefs.getClassic();
      if (savedClassic) this.settings = savedClassic;
    }
    if (this.mode === 'speed' && !incomingSpeed) {
      const savedSpeed = this.prefs.getSpeed();
      if (savedSpeed)
        this.speedSettings = { ...this.speedSettings, ...savedSpeed };
    }
    if (this.mode === 'challenge' && (!this.settings || !this.goals)) {
      const savedChallenge = this.prefs.getChallenge();
      if (savedChallenge) {
        this.settings = savedChallenge.settings;
        this.goals = savedChallenge.goals;
      }
    }

    const audio = this.prefs.getAudio();
    this.sfxEnabledUi = audio.sfxEnabled;
    this.musicVolumeUi = audio.musicVolume;
    this.sfx.setEnabled(this.sfxEnabledUi);
    this.sfx.setMusicVolume(this.musicVolumeUi / 100);
    this.snakeSkin = this.skinStore.get();

    if (this.mode) {
      this.highScore = this.hs.get(this.mode);
    }

    if (this.mode === 'speed')
      this.timeLeft = this.speedSettings.timeAttackSec ?? 0;
    if (this.mode === 'challenge') {
      this.timeLeft = this.goals?.targetTime ?? 0;
      this.fruitsRemaining = this.goals?.targetFruits ?? null;
    }

    window.addEventListener('pointerdown', this.unlockMusic, {
      once: true,
      capture: true,
      passive: true,
    });
    window.addEventListener('keydown', this.unlockMusic, {
      once: true,
      capture: true,
    });
    window.addEventListener('touchstart', this.unlockMusic, {
      once: true,
      capture: true,
      passive: true,
    });

    const initialSpeed =
      (this.mode === 'speed'
        ? this.speedSettings?.startingSpeed
        : this.settings?.startingSpeed) ?? this.gameSpeed;
    this.gameSpeed = initialSpeed;

    this.sfx.startMusic();
  }

  ngOnDestroy() {
    this.skinSub?.unsubscribe();
    this.persistCurrentModeSettings();
    this.persistAudioPrefs();

    this.sfx.stopMusic();
    window.removeEventListener('pointerdown', this.unlockMusic, true as any);
    window.removeEventListener('keydown', this.unlockMusic, true as any);
    window.removeEventListener('touchstart', this.unlockMusic, true as any);
  }

  private activeGame() {
    if (this.mode === 'speed') return this.speedRef;
    if (this.mode === 'challenge') return this.challengeRef;
    return this.classicRef;
  }

  onClickHome() {
    this.sfx.playButton();
    this.sfx.stopMusic();
    this.persistCurrentModeSettings();
    this.persistAudioPrefs();
    this.router.navigate(['/']);
  }

  async onClickRestart() {
    const wasPaused = this.paused;

    this.paused = false;
    this.activeGame()?.setPaused(false);
    this.restart.emit();
    this.activeGame()?.restart();
    this.score = 0;

    if (this.mode === 'speed') {
      this.timeLeft = this.speedSettings.timeAttackSec || 0;
    }
    if (this.mode === 'challenge') {
      this.timeLeft = this.goals?.targetTime || 0;
      this.fruitsRemaining = this.goals?.targetFruits ?? null;
    }

    if (wasPaused) {
      await this.sfx.playMusic();
      await Promise.resolve();
    }

    this.sfx.playButton();

    this.persistCurrentModeSettings();
  }

  async onClickPauseToggle() {
    const goingToPause = !this.paused;

    this.paused = goingToPause;
    this.pauseToggle.emit();
    this.activeGame()?.setPaused(this.paused);

    if (this.paused) {
      this.sfx.pauseMusic();
      this.sfx.playButton();
    } else {
      await this.sfx.playMusic();

      await Promise.resolve();

      this.sfx.playButton();
    }
  }

  handleScoreChange(val: number) {
    this.score = val;
    if (this.mode && this.mode !== 'challenge' && this.score > this.highScore) {
      this.highScore = this.score;
      this.hs.set(this.mode, this.highScore);
    }
  }

  handleHighScoreChange(val: number) {
    if (val > this.highScore) {
      this.highScore = val;
      if (this.mode) this.hs.set(this.mode, val);
    }
  }

  handleSpeedChange(val: number) {
    this.gameSpeed = val;
  }

  handleGameOver() {
    this.sfx.playLose();
    this.paused = true;
    this.activeGame()?.setPaused(true);
    this.persistCurrentModeSettings();
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

  handleFruitsCollectedChange(val: number) {
    const total = this.goals?.targetFruits ?? null;
    this.fruitsRemaining = total != null ? Math.max(0, total - val) : null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (
      ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
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

  onSnakeSkinChange(skin: SnakeSkin) {
    this.snakeSkin = { ...skin };
    this.skinStore.set(this.snakeSkin);
  }

  openSettings() {
    this.sfx.playButton();
    if (this.isSettingsOpen) return;
    this.wasPausedBeforeSettings = this.paused;
    this.isSettingsOpen = true;

    this.paused = true;
    this.activeGame()?.setPaused(true);
    this.sfx.pauseMusic();
  }

  closeSettings() {
  this.sfx.playButton();
  this.isSettingsOpen = false;

  this.paused = true;
  this.activeGame()?.setPaused(true);

  (this.activeGame() as any)?.showPauseOverlay?.();

  this.sfx.pauseMusic();

  this.persistCurrentModeSettings();
  this.persistAudioPrefs();
}


  onSettingsOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this.closeSettings();
  }

  onSettingsSfxToggled(enabled: boolean) {
    this.sfxEnabledUi = enabled;
    this.sfx.setEnabled(enabled);
    this.persistAudioPrefs();
  }

  onSettingsMusicChanged(vol: number) {
    this.musicVolumeUi = vol;
    this.sfx.setMusicVolume(vol / 100);
    this.persistAudioPrefs();
  }

  @HostListener('document:keydown.escape', ['$event'])
  @HostListener('document:keydown.escape', ['$event'])
onEsc(e?: KeyboardEvent) {
  e?.preventDefault();

  if (this.isSettingsOpen) {
    this.closeSettings();
    return;
  }

  this.onClickPauseToggle();
}

  private persistAudioPrefs() {
    try {
      this.prefs.setAudio({
        sfxEnabled: this.sfxEnabledUi,
        musicVolume: this.musicVolumeUi,
      });
    } catch {}
  }

  private persistCurrentModeSettings() {
    try {
      if (this.mode === 'classic' && this.settings) {
        this.prefs.setClassic({
          gridSize: this.settings.gridSize,
          wrapEdges: !!this.settings.wrapEdges,
          startingLength: this.settings.startingLength,
          startingSpeed: this.settings.startingSpeed,
        });
      }

      if (this.mode === 'speed') {
        const s = this.speedSettings;
        this.prefs.setSpeed({
          startingSpeed: s.startingSpeed ?? 5,
          accelRate: s.accelRate ?? 1.0,
          timeAttackSec: s.timeAttackSec ?? 120,
          obstaclesOn: !!s.obstaclesOn,
          obstaclePreset: (s as any).obstaclePreset,
          obstacleDensity: (s as any).obstacleDensity,
          gridSize: s.gridSize ?? 20,
          wrapEdges: s.wrapEdges ?? false,
          startingLength: s.startingLength ?? 5,
        });
      }

      if (this.mode === 'challenge' && this.settings && this.goals) {
        this.prefs.setChallenge({
          settings: {
            gridSize: this.settings.gridSize,
            wrapEdges: !!this.settings.wrapEdges,
            startingLength: this.settings.startingLength,
            startingSpeed: this.settings.startingSpeed,
          },
          goals: {
            targetFruits: this.goals.targetFruits,
            targetTime: this.goals.targetTime,
            wallsAllowed: this.goals.wallsAllowed,
          },
        });
      }
    } catch {}
  }
}
