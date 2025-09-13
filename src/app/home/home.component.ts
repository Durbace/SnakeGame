import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SettingsComponent } from '../settings/settings.component';
import { HowToPlayComponent } from '../how-to-play/how-to-play.component';
import { ClassicModeComponent } from '../classic-mode/classic-mode.component';
import { SpeedModeComponent } from '../speed-mode/speed-mode.component';
import { ChallengeModeComponent } from '../challenge-mode/challenge-mode.component';
import { PlayStartComponent } from '../play-start/play-start.component';
import type { PlayDifficulty } from '../play-start/play-start.component';

type ModalType =
  | 'play'
  | 'howto'
  | 'settings'
  | 'classic'
  | 'speed'
  | 'challenge'
  | null;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
  isModalOpen = false;
  modalType: ModalType = null;
  modalTitleId = 'modal-title-' + Math.random().toString(36).slice(2, 8);

  playDifficulty: PlayDifficulty = 'normal';
  wrapEdges = false;
  gridSize = 24;
  startingLength = 4;
  startingSpeed = 5;

  speedStart = 5;
  accelRate = 1.0;
  timeAttack = 120;
  obstaclesOn = false;

  targetFruits = 10;
  targetTime = 90;
  powerUpsOn = true;
  wallsAllowed = false;

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
    this.modalType = type;
    this.isModalOpen = true;
  }
  closeModal() {
    this.isModalOpen = false;
    this.modalType = null;
  }
  onOverlayClick(_: MouseEvent) {
    this.closeModal();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isModalOpen) this.closeModal();
  }

  sfxEnabled = true;
  musicVolume = 50;
  toggleSfx(evt: Event) {
    this.sfxEnabled = (evt.target as HTMLInputElement).checked;
    console.log('Sound effects enabled:', this.sfxEnabled);
  }
  changeMusicVol(evt: Event) {
    this.musicVolume = +(evt.target as HTMLInputElement).value;
    console.log('Music volume:', this.musicVolume);
  }

  startPlay(payload: {
    difficulty: PlayDifficulty;
    wrapEdges: boolean;
    gridSize: number;
    startingLength: number;
    startingSpeed: number;
  }) {
    console.log('Start Play', payload);
    // TODO: pornește jocul standard (navighează la /play sau pasează setările în engine)
    this.closeModal();
  }

  startSpeed(payload: {
    speedStart: number;
    accelRate: number;
    timeAttack: number;
    obstaclesOn: boolean;
  }) {
    console.log('Start Speed', payload);
    // TODO: pornește modul Speed
    this.closeModal();
  }

  startChallenge(payload: {
    targetFruits: number;
    targetTime: number;
    powerUpsOn: boolean;
    wallsAllowed: boolean;
  }) {
    console.log('Start Challenge', payload);
    // TODO: pornește modul Challenge
    this.closeModal();
  }
}
