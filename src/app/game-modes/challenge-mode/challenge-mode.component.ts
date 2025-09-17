import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-challenge-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './challenge-mode.component.html',
  styleUrls: ['./challenge-mode.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class ChallengeModeComponent {
  targetFruits = 10;
  targetTime = 90;
  powerUpsOn = true;
  wallsAllowed = false;

  showSettings = false;

  onNext() {
    this.showSettings = true;
  }

  onStartChallenge() {
    console.log('[Challenge] Start with:', {
      targetFruits: this.targetFruits,
      targetTime: this.targetTime,
      powerUpsOn: this.powerUpsOn,
      wallsAllowed: this.wallsAllowed,
    });
  }

  get isInSettings(): boolean {
    return this.showSettings;
  }

  get starHint(): string {
    const s =
      (this.targetFruits >= 20 ? 1 : 0) +
      (this.targetTime <= 90 ? 1 : 0) +
      (!this.wallsAllowed ? 1 : 0);
    return `${'★'.repeat(s)}${'☆'.repeat(3 - s)}`;
  }
}

