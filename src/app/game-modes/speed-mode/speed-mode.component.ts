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
  speedStart = 5;
  accelRate = 1.0;
  timeAttack = 120;

  obstaclesOn = false;
  obstaclePreset: ObstaclePreset = 'medium';
  obstacleDensity = 0.08; // default pt "medium" (8% din celule)

  constructor(private router: Router) {}

  onNext() {
    this.showSettings = true;
    this.settingsStateChange.emit(true);
  }

  // apelate de butoane
  setObstaclePreset(p: ObstaclePreset) {
  this.obstaclePreset = p;
  // Easy = aproape nimic, Medium = moderat, Hard = dens
  this.obstacleDensity =
    p === 'easy'   ? 0.02 :   // 0.2%
    p === 'medium' ? 0.05  :   // 5%
                     0.09;     // 12%
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
        obstaclePreset: this.obstaclePreset,                // 👈 trimitem presetul
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
}
