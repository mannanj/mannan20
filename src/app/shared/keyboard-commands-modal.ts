import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectCommandsModalVisible } from '../store/app.selectors';
import { toggleCommandsModal, setSelectedLink, openContactModal } from '../store/app.actions';
import { toggleCursorsVisible } from '../store/cursor.actions';
import { Links } from '../models/models';
import { navigateTo } from '../utils/help';

interface CommandOption {
  id: string;
  label: string;
  description: string;
  action?: () => void;
  keywords: string[];
}

@Component({
  selector: 'keyboard-commands-modal',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
      <div class="fixed inset-0 z-[1000] flex items-start justify-center pt-[20vh] px-4">
        <div class="absolute inset-0 bg-black/75" (click)="close()"></div>

        <div class="relative w-full max-w-2xl bg-[#1a1a1a] border border-[#333] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <input
            #searchInput
            type="text"
            [value]="searchQuery()"
            (input)="onSearchChange($event)"
            placeholder="Search commands..."
            class="w-full px-6 py-4 text-lg border-b border-[#333] focus:outline-none bg-transparent text-gray-100 placeholder-gray-500"
            (keydown)="handleInputKeydown($event)"
          />

          <div class="max-h-[400px] overflow-y-auto">
            @if (filteredOptions().length === 0) {
              <div class="px-6 py-8 text-center text-gray-500">
                No results found
              </div>
            } @else {
              <div class="py-2">
                @for (option of filteredOptions(); track option.id; let index = $index) {
                  <button
                    (click)="handleSelect(option)"
                    [class]="'w-full px-6 py-3 text-left transition-colors ' + (index === selectedIndex() ? 'bg-[#039be5]/20' : 'hover:bg-white/5')"
                  >
                    <div class="font-medium text-gray-100">{{ option.label }}</div>
                    <div class="text-sm text-gray-400">{{ option.description }}</div>
                  </button>
                }
              </div>
            }
          </div>

          <div class="px-6 py-3 border-t border-[#333] text-xs text-gray-500 flex items-center justify-between">
            <div class="flex gap-3">
              <div>
                <kbd class="px-2 py-1 bg-[#039be5]/20 border border-[#039be5]/40 rounded text-[#4fc3f7]">↑↓</kbd>
                <span class="ml-1.5">Navigate</span>
              </div>
              <div>
                <kbd class="px-2 py-1 bg-[#039be5]/20 border border-[#039be5]/40 rounded text-[#4fc3f7]">Enter</kbd>
                <span class="ml-1.5">Select</span>
              </div>
            </div>
            <div>
              <kbd class="px-2 py-1 bg-[#039be5]/20 border border-[#039be5]/40 rounded text-[#4fc3f7]">Esc</kbd>
              <span class="ml-1.5">Close</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  host: {
    '(document:keydown)': 'handleGlobalKeydown($event)'
  }
})
export class KeyboardCommandsModal {
  private store = inject(Store);
  protected isVisible = this.store.selectSignal(selectCommandsModalVisible);
  protected searchQuery = signal('');
  protected selectedIndex = signal(0);

  protected commandOptions: CommandOption[] = [
    {
      id: 'home',
      label: 'Home',
      description: 'Navigate to home section',
      action: () => this.navigateToSection(Links.home),
      keywords: ['home', 'main', 'start']
    },
    {
      id: 'about',
      label: 'About',
      description: 'Navigate to about section',
      action: () => this.navigateToSection(Links.about),
      keywords: ['about', 'info', 'information']
    },
    {
      id: 'contact',
      label: 'Contact',
      description: 'Navigate to contact section',
      action: () => this.navigateToSection(Links.contact),
      keywords: ['contact', 'email', 'reach']
    },
    {
      id: 'toggle-cursors',
      label: 'Hide/show cursors',
      description: 'Toggle live cursors of users browsing this site',
      action: () => this.toggleCursors(),
      keywords: ['cursor', 'cursors', 'hide', 'show', 'toggle', 'live', 'users', 'esc']
    },
    {
      id: 'contact-modal',
      label: 'Request contact information',
      description: 'Ready to collaborate',
      action: () => this.openContact(),
      keywords: ['contact', 'collaborate', 'reach out', 'email', 'form']
    }
  ];

  protected filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      return this.commandOptions;
    }
    return this.commandOptions.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.keywords.some(keyword => keyword.includes(query))
    );
  });

  handleGlobalKeydown(event: KeyboardEvent) {
    const isInInput = (event.target as HTMLElement)?.tagName === 'INPUT' ||
                      (event.target as HTMLElement)?.tagName === 'TEXTAREA';

    if (event.key === '/' && !this.isVisible() && !isInInput) {
      event.preventDefault();
      this.open();
      return;
    }

    if (event.key === 'Escape') {
      if (this.isVisible()) {
        event.preventDefault();
        this.close();
      } else if (!isInInput) {
        this.toggleCursors();
      }
    }
  }

  handleInputKeydown(event: KeyboardEvent) {
    const options = this.filteredOptions();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' && options.length > 0) {
      event.preventDefault();
      this.handleSelect(options[this.selectedIndex()]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.selectedIndex.set(0);
  }

  handleSelect(option: CommandOption) {
    if (option.action) {
      option.action();
    }
    this.resetAndClose();
  }

  navigateToSection(link: Links) {
    navigateTo(this.store, link);
    this.resetAndClose();
  }

  openContact() {
    this.store.dispatch(openContactModal());
    this.resetAndClose();
  }

  toggleCursors() {
    this.store.dispatch(toggleCursorsVisible());
  }

  open() {
    this.store.dispatch(toggleCommandsModal());
  }

  toggle() {
    this.store.dispatch(toggleCommandsModal());
  }

  close() {
    if (this.isVisible()) {
      this.store.dispatch(toggleCommandsModal());
      this.resetState();
    }
  }

  resetAndClose() {
    this.close();
  }

  resetState() {
    this.searchQuery.set('');
    this.selectedIndex.set(0);
  }
}
