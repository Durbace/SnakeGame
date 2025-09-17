import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  onNext() {
    this.showSettings = true;
  }

  onStartClassic() {
    console.log('[Classic] Start with:', {
      gridSize: this.gridSize,
      wrapEdges: this.wrapEdges,
      startingLength: this.startingLength,
      startingSpeed: this.startingSpeed,
    });
  }

  get isInSettings(): boolean {
    return this.showSettings;
  }
}
