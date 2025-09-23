import {
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type ObstaclePreset = 'easy' | 'medium' | 'hard';

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
  accelRate = 1.0;
  timeAttack = 120;

  obstaclesOn = false;
  obstaclePreset: ObstaclePreset = 'medium';
  obstacleDensity = 0.08;

  constructor(private router: Router) {}

  onNext() {
    this.showSettings = true;
    this.settingsStateChange.emit(true);
  }

  setObstaclePreset(p: ObstaclePreset) {
    if (!this.obstaclesOn) return;
    this.obstaclePreset = p;
    this.obstacleDensity = p === 'easy' ? 0.02 : p === 'medium' ? 0.05 : 0.09;
  }

  onStartSpeed() {
    this.router.navigateByUrl('/play', {
      state: {
        mode: 'speed',
        speedSettings: {
          accelRate: this.accelRate,
          timeAttackSec: this.timeAttack,
          obstaclesOn: this.obstaclesOn,
          obstaclePreset: this.obstaclePreset,
          obstacleDensity: this.obstaclesOn ? this.obstacleDensity : undefined,
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

  onObstaclesToggled() {
    setTimeout(() => window.getSelection?.()?.removeAllRanges?.(), 0);
  }
}
