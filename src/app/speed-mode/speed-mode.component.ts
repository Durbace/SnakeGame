import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-speed-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speed-mode.component.html',
  styleUrls: ['./speed-mode.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class SpeedModeComponent {}
