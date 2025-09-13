import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type ModalType = 'play' | 'howto' | 'settings' | 'classic' | 'speed' | 'endless' | null;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],          // ← Aici e magia pentru *ngIf / ngSwitch
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  isModalOpen = false;
  modalType: ModalType = null;

  modalTitleId = 'modal-title-' + Math.random().toString(36).slice(2, 8);

  get modalTitle(): string {
    switch (this.modalType) {
      case 'play': return 'Play';
      case 'howto': return 'How to Play';
      case 'settings': return 'Settings';
      case 'classic': return 'Classic Snake';
      case 'speed': return 'Speed Challenge';
      case 'endless': return 'Endless Mode';
      default: return 'Info';
    }
  }

  openModal(type: Exclude<ModalType, null>) { this.modalType = type; this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.modalType = null; }
  onOverlayClick(_: MouseEvent) { this.closeModal(); }
  startGame() { this.closeModal(); }

  @HostListener('document:keydown.escape') onEsc() { if (this.isModalOpen) this.closeModal(); }
}
