import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-challenge-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './challenge-mode.component.html',
  styleUrls: ['./challenge-mode.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class ChallengeModeComponent {
  targetFruits = 10;
  targetTime = 90;
  powerUpsOn = true;
  wallsAllowed = false;

  get starHint(): string {
    const s =
      (this.targetFruits >= 20 ? 1 : 0) +
      (this.targetTime <= 90 ? 1 : 0) +
      (!this.wallsAllowed ? 1 : 0);
    return `${'★'.repeat(s)}${'☆'.repeat(3 - s)}`;
  }
}
