import { Component, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { SettingsComponent, SnakeSkin } from '../settings/settings.component';
import { HowToPlayComponent } from '../how-to-play/how-to-play.component';
import { ClassicModeComponent } from '../game-modes/classic-mode/classic-mode.component';
import { SpeedModeComponent } from '../game-modes/speed-mode/speed-mode.component';
import { ChallengeModeComponent } from '../game-modes/challenge-mode/challenge-mode.component';
import { PlayStartComponent } from '../play-start/play-start.component';
import { SnakeSkinStore } from '../services/snake-skin.store';
import { SfxService } from '../services/sfx.service';
import { Subscription } from 'rxjs';
import { PrefsStore } from '../services/prefs.store';

type ModalType =
  | 'play'
  | 'howto'
  | 'settings'
  | 'classic'
  | 'speed'
  | 'challenge'
  | null;

interface NextAware {
  onNext(): void;
}
function isNextAware(obj: unknown): obj is NextAware {
  return !!obj && typeof (obj as any).onNext === 'function';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HowToPlayComponent,
    SettingsComponent,
    ClassicModeComponent,
    SpeedModeComponent,
    ChallengeModeComponent,
    PlayStartComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  @ViewChild('classicCmp') classicRef?: ClassicModeComponent;
  @ViewChild('speedCmp') speedRef?: SpeedModeComponent;
  @ViewChild('challengeCmp') challengeRef?: ChallengeModeComponent;

  isModalOpen = false;
  modalType: ModalType = null;
  modalTitleId = 'modal-title-' + Math.random().toString(36).slice(2, 8);
  snakeSkin!: SnakeSkin;
  sfxEnabled = true;
  musicVolume = 50;

  private readonly nextSupported = new Set<Exclude<ModalType, null>>([
    'classic',
    'speed',
    'challenge',
  ]);

  private skinSub?: Subscription;

  constructor(
    private router: Router,
    private skinStore: SnakeSkinStore,
    private sfx: SfxService,
    private prefs: PrefsStore
  ) {
    this.snakeSkin = this.skinStore.get();
    this.skinSub = this.skinStore.skin$.subscribe((s) => {
      this.snakeSkin = s;
    });

    const a = this.prefs.getAudio();
    this.sfxEnabled = a.sfxEnabled;
    this.musicVolume = a.musicVolume;
    this.sfx.setEnabled(this.sfxEnabled);
    this.sfx.setMusicVolume(this.musicVolume / 100);
  }

  ngOnDestroy() {
    this.skinSub?.unsubscribe();
  }

  onSkinChanged(s: SnakeSkin) {
    this.skinStore.set(s);
    this.snakeSkin = { ...s };
  }

  private goToPlay(
    mode: 'classic' | 'speed' | 'challenge',
    extraState: Record<string, any> = {}
  ) {
    this.sfx.playButton();
    this.closeModal();

    if (mode === 'classic' && this.classicRef?.isInSettings) {
      this.prefs.setClassic({
        gridSize: this.classicRef.gridSize,
        wrapEdges: this.classicRef.wrapEdges,
        startingLength: this.classicRef.startingLength,
        startingSpeed: this.classicRef.startingSpeed,
      });
    }
    if (mode === 'speed' && this.speedRef?.isInSettings) {
      const startingSpeedVal =
        typeof (this.speedRef as any)?.startingSpeed === 'number'
          ? (this.speedRef as any).startingSpeed
          : typeof (this.speedRef as any)?.onStartSpeed === 'number'
          ? (this.speedRef as any).onStartSpeed
          : 5;

      this.prefs.setSpeed({
        startingSpeed: startingSpeedVal,
        accelRate: this.speedRef.accelRate,
        timeAttackSec: this.speedRef.timeAttack,
        obstaclesOn: this.speedRef.obstaclesOn,
        obstaclePreset: this.speedRef.obstaclePreset,
        obstacleDensity: this.speedRef.obstaclesOn
          ? this.speedRef.obstacleDensity
          : undefined,
        gridSize: this.speedRef.gridSize,
        wrapEdges: this.speedRef.wrapEdges,
        startingLength: this.speedRef.startingLength,
      });
    }

    if (mode === 'challenge' && this.challengeRef?.isInSettings) {
      this.prefs.setChallenge({
        settings: {
          gridSize: this.challengeRef.gridSize,
          wrapEdges: this.challengeRef.wrapEdges,
          startingLength: this.challengeRef.startingLength,
          startingSpeed: this.challengeRef.startingSpeed,
        },
        goals: {
          targetFruits: this.challengeRef.targetFruits,
          targetTime: this.challengeRef.targetTime,
          wallsAllowed: this.challengeRef.wallsAllowed,
        },
      });
    }

    this.prefs.setLastMode(mode);

    this.router.navigate(['/play'], {
      state: { mode, ...extraState },
    });
  }

  onToggleSfx(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.sfx.setEnabled(enabled);
    this.prefs.setAudio({ sfxEnabled: enabled, musicVolume: this.musicVolume });
  }

  onMusicVolChanged(vol: number) {
    this.musicVolume = vol;
    this.sfx.setMusicVolume(vol / 100);
    this.prefs.setAudio({ sfxEnabled: this.sfxEnabled, musicVolume: vol });
  }

  get modalTitle(): string {
    switch (this.modalType) {
      case 'play':
        return 'Play';
      case 'howto':
        return 'How to Play';
      case 'settings':
        return 'Settings';
      case 'classic':
        return 'Classic Snake';
      case 'speed':
        return 'Speed Challenge';
      case 'challenge':
        return 'Challenge Mode';
      default:
        return 'Info';
    }
  }

  openModal(type: Exclude<ModalType, null>) {
    this.sfx.playButton();
    this.modalType = type;
    this.isModalOpen = true;
  }
  closeModal() {
    this.sfx.playButton();
    this.isModalOpen = false;
    this.modalType = null;
  }
  onOverlayClick(_: MouseEvent) {
    this.sfx.playButton();
    this.closeModal();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isModalOpen) {
      this.sfx.playButton();
      this.closeModal();
    }
  }

  get showsNext(): boolean {
    return this.modalType !== null && this.nextSupported.has(this.modalType);
  }

  private getActiveNextAware(): NextAware | null {
    let ref: unknown = null;
    switch (this.modalType) {
      case 'classic':
        ref = this.classicRef;
        break;
      case 'speed':
        ref = this.speedRef;
        break;
      case 'challenge':
        ref = this.challengeRef;
        break;
      default:
        ref = null;
    }
    return isNextAware(ref) ? ref : null;
  }

  onNextClick() {
    this.sfx.playButton();
    if (this.modalType === 'classic' && this.classicRef) {
      if (this.classicRef.isInSettings) {
        this.goToPlay('classic', {
          settings: {
            gridSize: this.classicRef.gridSize,
            wrapEdges: this.classicRef.wrapEdges,
            startingLength: this.classicRef.startingLength,
            startingSpeed: this.classicRef.startingSpeed,
          },
        });
      } else {
        this.classicRef.onNext();
      }
      return;
    }

    if (this.modalType === 'speed' && this.speedRef) {
      if (this.speedRef.isInSettings) {
        this.goToPlay('speed', {
          speedSettings: {
            accelRate: this.speedRef.accelRate,
            timeAttackSec: this.speedRef.timeAttack,
            obstaclesOn: this.speedRef.obstaclesOn,

            obstaclePreset: this.speedRef.obstaclePreset,
            obstacleDensity: this.speedRef.obstaclesOn
              ? this.speedRef.obstacleDensity
              : undefined,

            gridSize: this.speedRef.gridSize,
            wrapEdges: this.speedRef.wrapEdges,
            startingLength: this.speedRef.startingLength,
          },
        });
      } else {
        this.speedRef.onNext();
      }
      return;
    }

    if (this.modalType === 'challenge' && this.challengeRef) {
      if (this.challengeRef.isInSettings) {
        this.goToPlay('challenge', {
          settings: {
            gridSize: this.challengeRef.gridSize,
            wrapEdges: this.challengeRef.wrapEdges,
            startingLength: this.challengeRef.startingLength,
            startingSpeed: this.challengeRef.startingSpeed,
          },
          goals: {
            targetFruits: this.challengeRef.targetFruits,
            targetTime: this.challengeRef.targetTime,
            wallsAllowed: this.challengeRef.wallsAllowed,
          },
        });
      } else {
        this.challengeRef.onNext();
      }
      return;
    }

    this.getActiveNextAware()?.onNext();
  }

  onPlayPicked(mode: 'classic' | 'speed' | 'challenge') {
    this.sfx.playButton();
    this.modalType = mode;
  }
}
