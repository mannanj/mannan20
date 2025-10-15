import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Header } from "./components/header/header";
import { Home } from "./components/home/home";
import { About } from "./components/about/about";
import { Contact } from "./components/contact/contact";
import { LastUpdated } from "./shared/last-updated";
import { ViewerStats } from "./shared/viewer-stats";
import { KeyboardCommandsModal } from "./shared/keyboard-commands-modal";
import { DevStats } from "./shared/dev-stats";
import { selectIsCursorPartyConnected } from './store/cursor.selectors';
import { selectDevCommits } from './store/app.selectors';

@Component({
  selector: 'app-root',
  imports: [CommonModule, Header, Home, About, Contact, LastUpdated, ViewerStats, KeyboardCommandsModal, DevStats],
  template: `
    <div class="font-[Lucida_Grande]">
      <div id="header">
        <header></header>
      </div>

      <div id="body" class="my-[20vh] mx-[28vw] md:my-[10vh] md:mx-[14vw]">
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
        <viewer-stats />
      }
      <div class="fixed bottom-0 right-0 z-50 flex items-end gap-2">
        @if (hasDevCommits()) {
          <dev-stats />
        }
        <last-updated />
      </div>
      <keyboard-commands-modal />
    </div>
  `,
  styles: []
})
export class App implements OnInit {
  title = 'mannan';
  private store = inject(Store);
  protected isConnected = signal(false);
  protected hasDevCommits = signal(false);

  ngOnInit() {
    this.store.select(selectIsCursorPartyConnected).subscribe(connected => {
      this.isConnected.set(connected);
    });

    this.store.select(selectDevCommits).subscribe(commits => {
      this.hasDevCommits.set(commits.length > 0);
    });
  }
}
