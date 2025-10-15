import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ModalComponent } from './modal';
import { selectCommandsModalVisible } from '../store/app.selectors';
import { toggleCommandsModal } from '../store/app.actions';
import { toggleCursorsVisible } from '../store/cursor.actions';

interface Command {
  key: string;
  description: string;
  action: () => void;
}

@Component({
  selector: 'keyboard-commands-modal',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <modal [isOpen]="isVisible()" (close)="close()">
      <div class="space-y-2">
        @for (command of commands; track command.key) {
          <div class="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
               (click)="executeCommand(command)">
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
export class KeyboardCommandsModal {
  private store = inject(Store);
  protected isVisible = this.store.selectSignal(selectCommandsModalVisible);

  protected commands: Command[] = [
    {
      key: '/',
      description: 'Send message to others',
      action: () => this.openChat()
    },
    {
      key: 'Esc',
      description: 'Hide/show cursors',
      action: () => this.toggleCursors()
    },
    {
      key: 'H',
      description: 'Show/hide this help',
      action: () => this.toggle()
    }
  ];

  handleKeydown(event: KeyboardEvent) {
    if ((event.key === 'h' || event.key === 'H') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      event.preventDefault();
      this.toggle();
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  executeCommand(command: Command) {
    command.action();
  }

  openChat() {
    const event = new KeyboardEvent('keydown', {
      key: '/',
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  toggleCursors() {
    this.store.dispatch(toggleCursorsVisible());
  }

  toggle() {
    this.store.dispatch(toggleCommandsModal());
  }

  close() {
    if (this.isVisible()) {
      this.store.dispatch(toggleCommandsModal());
    }
  }
}
