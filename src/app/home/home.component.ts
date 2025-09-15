import { Component, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SettingsComponent } from '../settings/settings.component';
import { HowToPlayComponent } from '../how-to-play/how-to-play.component';
import { ClassicModeComponent } from '../classic-mode/classic-mode.component';
import { SpeedModeComponent } from '../speed-mode/speed-mode.component';
import { ChallengeModeComponent } from '../challenge-mode/challenge-mode.component';
import { PlayStartComponent } from '../play-start/play-start.component';

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

  private readonly nextSupported = new Set<Exclude<ModalType, null>>([
    'classic',
    'speed',
    'challenge',
  ]);

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
    this.getActiveNextAware()?.onNext();
  }
}
