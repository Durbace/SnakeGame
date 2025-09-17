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
  selector: 'app-classic-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classic-mode.component.html',
  styleUrls: ['./classic-mode.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class ClassicModeComponent {
  showSettings = false;

  gridSize = 24;
  wrapEdges = false;
  startingLength = 4;
  startingSpeed = 5;

  constructor(private router: Router) {}

  onNext() {
    this.showSettings = true;
  }

  onStartClassic() {
    const settings: ClassicSettings = {
      gridSize: this.gridSize,
      wrapEdges: this.wrapEdges,
      startingLength: this.startingLength,
      startingSpeed: this.startingSpeed,
    };

    this.router.navigateByUrl('/play', {
      state: {
        mode: 'classic',
        settings,
      },
    });
  }

  get isInSettings(): boolean {
    return this.showSettings;
  }
}
