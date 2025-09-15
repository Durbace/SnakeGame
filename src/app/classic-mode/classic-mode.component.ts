import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-classic-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './classic-mode.component.html',
  styleUrls: ['./classic-mode.component.css'],
})
export class ClassicModeComponent {
  @Output() next = new EventEmitter<void>();

  onNext() {
    // toată logica ta rămâne aici
    console.log('[Classic] Next pressed');
  }
}
