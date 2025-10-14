import { Component, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ModalComponent } from './modal';

interface Command {
  key: string;
  description: string;
}

@Component({
  selector: 'keyboard-commands-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <modal [isOpen]="isVisible()" (close)="close()">
      <div class="space-y-2">
        @for (command of commands; track command.key) {
          <div class="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors">
            <kbd class="px-2 py-1 bg-[#039be5]/20 border border-[#039be5]/40 rounded text-xs font-mono text-[#4fc3f7] min-w-[2.5rem] text-center">
              {{ command.key }}
            </kbd>
            <span class="text-gray-300 text-xs">{{ command.description }}</span>
          </div>
        }
      </div>
    </modal>
  `,
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:keydown)': 'handleKeydown($event)'
  }
})
export class KeyboardCommandsModal implements OnInit, OnDestroy {
  protected isVisible = signal(false);
  private toggleListener: (() => void) | null = null;

  protected commands: Command[] = [
    { key: '/', description: 'Send message to others' },
    { key: 'Esc', description: 'Hide/show cursors' },
    { key: 'H', description: 'Show/hide this help' }
  ];

  ngOnInit() {
    this.toggleListener = () => this.toggle();
    window.addEventListener('toggleCommandsModal', this.toggleListener);
  }

  ngOnDestroy() {
    if (this.toggleListener) {
      window.removeEventListener('toggleCommandsModal', this.toggleListener);
    }
  }

  handleKeydown(event: KeyboardEvent) {
    if ((event.key === 'h' || event.key === 'H') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      event.preventDefault();
      this.toggle();
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  toggle() {
    this.isVisible.update(v => !v);
  }

  close() {
    this.isVisible.set(false);
  }
}
