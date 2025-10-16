import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Header } from "./components/header/header";
import { Home } from "./components/home/home";
import { About } from "./components/about/about";
import { Contact } from "./components/contact/contact";
import { ContactForm } from "./components/contact/contact-form";
import { ContactResult } from "./components/contact/contact-result";
import { LastUpdated } from "./shared/last-updated";
import { ViewerStats } from "./shared/viewer-stats";
import { KeyboardCommandsModal } from "./shared/keyboard-commands-modal";
import { DevStats } from "./shared/dev-stats";
import { TasksContainer } from "./shared/tasks-container";
import { CommitsGrid } from "./shared/commits-grid";
import { ServicesPlaceholderIcon } from "./components/icons/services-placeholder-icon";
import { Modal } from "./shared/modal";
import { selectIsCursorPartyConnected } from './store/cursor.selectors';
import { selectDevCommits, selectTasks, selectContactModalOpen, selectContactShowResult, selectContactResult, selectDevStatsModalOpen, selectDevStatsActiveTab } from './store/app.selectors';
import { closeContactModal, setContactResult, toggleDevStatsModal, setDevStatsTab } from './store/app.actions';
import { ContactResult as ContactResultData } from './models/models';
import { toSignal } from '@angular/core/rxjs-interop';

const FORM_SUBMIT_DELAY_MS = 2000;

@Component({
  selector: 'app-root',
  imports: [CommonModule, Header, Home, About, Contact, ContactForm, ContactResult, Modal, TasksContainer, CommitsGrid, ServicesPlaceholderIcon, LastUpdated, ViewerStats, KeyboardCommandsModal, DevStats],
  template: `
    <div class="font-[Lucida_Grande]">
      <div id="header">
        <header></header>
      </div>

      <div id="body" class="my-[20vh] md:my-[10vh] px-5 w-full max-w-[720px] mx-auto">
        <div id="home" class="mt-[33vh]">
          <home></home>
        </div>

        <div id="about" class="mt-[66vh]">
          <about></about>
        </div>

        <div id="contact" class="mt-[33vh] h-[44vh]">
          <contact></contact>
        </div>
      </div>

      @if (isConnected()) {
        @defer (on immediate) {
          <viewer-stats />
        }
      }
      <div class="fixed bottom-0 right-0 flex items-end gap-2">
        @if (hasDevCommits()) {
          @defer (on immediate) {
            <dev-stats />
          }
        }
        <last-updated />
      </div>
      @defer (on immediate) {
        <keyboard-commands-modal />
      }
      <modal [isOpen]="contactModalOpen()" (close)="closeContactModal()">
        <contact-form *ngIf="!contactShowResult()" (submitForm)="onContactFormSubmit($event)"></contact-form>
        <contact-result *ngIf="contactShowResult()" [result]="contactResult()"></contact-result>
      </modal>
      <modal [isOpen]="devStatsModalOpen()" [widthStyle]="'large'" (close)="toggleDevStatsModal()">
        <div class="tabs-container">
          <div class="tabs-header">
            <button
              [class.active]="devStatsActiveTab() === 'commits'"
              (click)="setActiveTab('commits')"
              class="tab-button">
              Git Commits
            </button>
            <button
              [class.active]="devStatsActiveTab() === 'services'"
              (click)="setActiveTab('services')"
              class="tab-button">
              Services Status
            </button>
            <button
              [class.active]="devStatsActiveTab() === 'tasks'"
              (click)="setActiveTab('tasks')"
              class="tab-button">
              Tasks
            </button>
          </div>

          <div class="tab-content">
            <div [style.display]="devStatsActiveTab() === 'commits' ? 'block' : 'none'">
              @defer (on immediate) {
                <commits-grid [commits]="filteredCommits()" />
              } @placeholder {
                <div class="text-center py-8 text-gray-400">Loading...</div>
              }
            </div>

            @if (devStatsActiveTab() === 'services') {
              <div class="services-placeholder">
                <div class="text-center text-gray-400 py-8">
                  <services-placeholder-icon class="mx-auto mb-4" />
                  <p class="text-sm">Services Status</p>
                  <p class="text-xs text-gray-500 mt-2">Coming soon...</p>
                </div>
              </div>
            }

            <div [style.display]="devStatsActiveTab() === 'tasks' ? 'block' : 'none'">
              @defer (on immediate) {
                <tasks-container [tasks]="tasks()" />
              }
            </div>
          </div>
        </div>
      </modal>
    </div>
  `,
  styles: [`
    .tabs-container {
      min-height: 300px;
    }

    .tabs-header {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #333;
      margin-bottom: 16px;
    }

    .tab-button {
      background: none !important;
      border: none !important;
      color: #888;
      padding: 8px 16px !important;
      cursor: pointer;
      font-size: 14px;
      border-bottom: 2px solid transparent !important;
      transition: all 0.2s;
      position: relative;
      top: 1px;
      box-shadow: none !important;
      text-transform: none !important;
      margin-top: 0 !important;
      transform: none !important;
    }

    .tab-button:hover {
      color: #4dd8ff;
      transform: none !important;
      box-shadow: none !important;
      border-color: transparent !important;
    }

    .tab-button.active {
      color: #039be5;
      border-bottom-color: #039be5 !important;
    }

    .tab-content {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class App implements OnInit {
  title = 'mannan';
  private store = inject(Store);
  protected isConnected = signal(false);
  protected hasDevCommits = signal(false);
  protected contactModalOpen = toSignal(this.store.select(selectContactModalOpen), { initialValue: false });
  protected contactShowResult = toSignal(this.store.select(selectContactShowResult), { initialValue: false });
  protected contactResult = toSignal(this.store.select(selectContactResult), { initialValue: null });
  protected devStatsModalOpen = toSignal(this.store.select(selectDevStatsModalOpen), { initialValue: false });
  protected devStatsActiveTab = toSignal(this.store.select(selectDevStatsActiveTab), { initialValue: 'commits' as 'commits' | 'services' | 'tasks' });
  protected tasks = toSignal(this.store.select(selectTasks), { initialValue: [] });
  private allCommits = toSignal(this.store.select(selectDevCommits), { initialValue: [] });
  protected filteredCommits = computed(() =>
    this.allCommits().filter(commit => commit.subject !== 'Update dev data files')
  );

  ngOnInit() {
    this.store.select(selectIsCursorPartyConnected).subscribe(connected => {
      this.isConnected.set(connected);
    });

    this.store.select(selectDevCommits).subscribe(commits => {
      this.hasDevCommits.set(commits.length > 0);
    });
  }

  closeContactModal() {
    this.store.dispatch(closeContactModal());
  }

  onContactFormSubmit(userInput: string) {
    console.log('Contact request submitted:', userInput);

    setTimeout(() => {
      const result: ContactResultData = {
        email: 'hello@mannan.is',
        phone: '+1 (571) 228-8302'
      };
      this.store.dispatch(setContactResult({ result }));
    }, FORM_SUBMIT_DELAY_MS);
  }

  toggleDevStatsModal() {
    this.store.dispatch(toggleDevStatsModal());
  }

  setActiveTab(tab: 'commits' | 'services' | 'tasks') {
    this.store.dispatch(setDevStatsTab({ tab }));
  }
}
