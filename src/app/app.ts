import { Component, OnInit, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Header } from "./components/header/header";
import { Home } from "./components/home/home";
import { About } from "./components/about/about";
import { Contact } from "./components/contact/contact";
import { ContactModal } from "./components/contact/contact-modal";
import { LastUpdated } from "./shared/last-updated";
import { ViewerStats } from "./shared/viewer-stats";
import { KeyboardCommandsModal } from "./shared/keyboard-commands-modal";
import { DevStats } from "./shared/dev-stats";
import { DevStatsModal } from "./shared/dev-stats-modal";
import { selectDevCommits } from './store/app.selectors';

@Component({
  selector: 'app-root',
  imports: [Header, Home, About, Contact, ContactModal, LastUpdated, ViewerStats, KeyboardCommandsModal, DevStats, DevStatsModal],
  template: `
    <div class="font-[Lucida_Grande]">
      <div id="header">
        <header></header>
      </div>

      <div id="body" class="my-[20vh] md:my-[10vh] w-full max-w-[321px] mx-auto px-5">
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

      <viewer-stats />
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
      <contact-modal />
      <dev-stats-modal />
    </div>
  `
})
export class App implements OnInit {
  title = 'mannan';
  private store = inject(Store);
  protected hasDevCommits = signal(false);

  ngOnInit() {
    this.store.select(selectDevCommits).subscribe(commits => {
      this.hasDevCommits.set(commits.length > 0);
    });
  }
}
