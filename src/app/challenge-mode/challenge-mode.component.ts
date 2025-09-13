import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-challenge-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './challenge-mode.component.html',
  styleUrls: ['./challenge-mode.component.css'],
})
export class ChallengeModeComponent {
  @Input() targetFruits = 10;
  @Input() targetTime = 90;
  @Input() powerUpsOn = true;
  @Input() wallsAllowed = false;

  @Output() start = new EventEmitter<{
    targetFruits: number;
    targetTime: number;
    powerUpsOn: boolean;
    wallsAllowed: boolean;
  }>();

  get starHint(): string {
    const s =
      (this.targetFruits >= 20 ? 1 : 0) +
      (this.targetTime <= 90 ? 1 : 0) +
      (!this.wallsAllowed ? 1 : 0);
    return `${'★'.repeat(s)}${'☆'.repeat(3 - s)}`;
  }

  onStart() {
    this.start.emit({
      targetFruits: this.targetFruits,
      targetTime: this.targetTime,
      powerUpsOn: this.powerUpsOn,
      wallsAllowed: this.wallsAllowed,
    });
  }
}
