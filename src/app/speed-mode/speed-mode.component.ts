import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-speed-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './speed-mode.component.html',
  styleUrls: ['./speed-mode.component.css'],
})
export class SpeedModeComponent {
  @Input() speedStart = 5;
  @Input() accelRate = 1.0;
  @Input() timeAttack = 120;
  @Input() obstaclesOn = false;

  @Output() start = new EventEmitter<{
    speedStart: number;
    accelRate: number;
    timeAttack: number;
    obstaclesOn: boolean;
  }>();

  get needleDeg(): string {
    const clamped = Math.max(1, Math.min(10, this.speedStart));
    const deg = -50 + clamped * 10;
    return `rotate(${deg}deg)`;
  }

  onStart() {
    this.start.emit({
      speedStart: this.speedStart,
      accelRate: this.accelRate,
      timeAttack: this.timeAttack,
      obstaclesOn: this.obstaclesOn,
    });
  }
}
