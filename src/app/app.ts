import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { HeaderComponent } from "./components/header/header";
import { HomeComponent } from "./components/home/home";
import { AboutComponent } from "./components/about/about";
import { ContactComponent } from "./components/contact/contact";
import { LastUpdated } from "./shared/last-updated";
import { ViewerStats } from "./shared/viewer-stats";
import { KeyboardCommandsModal } from "./shared/keyboard-commands-modal";
import { selectCursorChatPlaceholder, selectCursorUsername } from './store/app.selectors';

@Component({
  selector: 'app-root',
  imports: [CommonModule, HeaderComponent, HomeComponent, AboutComponent, ContactComponent, LastUpdated, ViewerStats, KeyboardCommandsModal],
  template: `
    <div id="page">
      <div id="header">
        <header></header>
      </div>

      <div id="body">
        <div id="home">
          <home></home>
        </div>

        <div id="about">
          <about></about>
        </div>

        <div id="contact">
          <contact></contact>
        </div>
      </div>

      <viewer-stats />
      <last-updated />
      <keyboard-commands-modal />
    </div>
  `,
  styles: [`
    #page {
      font-family: Lucida Grande;
    }

    #body {
      margin: 20vh 28vw;
    }

    @media only screen and (max-width: 768px) {
      #body {
        margin: 10vh 14vw;
      }
    }

    #home,
    #contact {
      margin-top: 33vh;
    }

    #about {
      margin-top: 66vh;
    }

    #contact {
      height: 44vh;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'mannan';
  private store = inject(Store);

  ngOnInit() {
    this.store.select(selectCursorChatPlaceholder).subscribe(placeholder => {
      (window as any).cursorChatPlaceholder = placeholder;
    });

    this.store.select(selectCursorUsername).subscribe(username => {
      (window as any).cursorUsername = username;
    });
  }
}
