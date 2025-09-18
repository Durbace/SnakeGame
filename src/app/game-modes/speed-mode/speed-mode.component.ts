import {
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  gridSize = 24;
  wrapEdges = false;
  startingLength = 5;
  speedStart = 5;
  accelRate = 1.0;
  timeAttack = 120;
  obstaclesOn = false;

  constructor(private router: Router) {}

  onNext() {
    this.showSettings = true;
    this.settingsStateChange.emit(true);
  }

  onStartSpeed() {
    this.router.navigateByUrl('/play', {
      state: {
        mode: 'speed',
        speedSettings: {
          startingSpeed: this.speedStart,
          accelRate: this.accelRate,
          timeAttackSec: this.timeAttack,
          obstaclesOn: this.obstaclesOn,
          gridSize: this.gridSize,
          wrapEdges: this.wrapEdges,
          startingLength: this.startingLength,
        },
      },
    });
  }

  get isInSettings(): boolean {
    return this.showSettings;
  }
}
