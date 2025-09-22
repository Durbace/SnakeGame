import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface ClassicSettings {
  gridSize: number;
  wrapEdges: boolean;
  startingLength: number;
  startingSpeed: number;
}

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
  wallsAllowed = false;

  gridSize = 24;
  wrapEdges = false;
  startingLength = 4;
  startingSpeed = 5;

  showSettings = false;

  constructor(private router: Router) {}

  onNext() {
    this.showSettings = true;
  }

  onStartChallenge() {
    const settings: ClassicSettings = {
      gridSize: this.gridSize,
      wrapEdges: this.wrapEdges,
      startingLength: this.startingLength,
      startingSpeed: this.startingSpeed,
    };

    const goals = {
      targetFruits: this.targetFruits,
      targetTime: this.targetTime,
      wallsAllowed: this.wallsAllowed,
    };

    this.router.navigateByUrl('/play', {
      state: { mode: 'challenge', settings, goals },
    });
  }

  clampGrid() {
    this.gridSize = Math.min(60, Math.max(10, Math.floor(this.gridSize || 24)));
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
