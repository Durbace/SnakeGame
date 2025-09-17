import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-speed-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './speed-mode.component.html',
  styleUrls: ['./speed-mode.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class SpeedModeComponent {
  @Output() settingsStateChange = new EventEmitter<boolean>();

  showSettings = false;

  speedStart = 5;
  accelRate = 1.0;
  timeAttack = 120;
  obstaclesOn = false;

  onNext() {
    this.showSettings = true;
    this.settingsStateChange.emit(true);
  }

  onStartSpeed() {
    console.log('[Speed] start with:', {
      speedStart: this.speedStart,
      accelRate: this.accelRate,
      timeAttack: this.timeAttack,
      obstaclesOn: this.obstaclesOn,
    });
  }

  get isInSettings(): boolean {
    return this.showSettings;
  }
}
