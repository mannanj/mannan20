import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { HeaderComponent } from "./components/header/header";
import { HomeComponent } from "./components/home/home";
import { AboutComponent } from "./components/about/about";
import { ContactComponent } from "./components/contact/contact";
import { LastUpdated } from "./shared/last-updated";
import { selectCursorChatPlaceholder, selectCursorUsernames } from './store/app.selectors';

@Component({
  selector: 'app-root',
  imports: [CommonModule, HeaderComponent, HomeComponent, AboutComponent, ContactComponent, LastUpdated],
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

      <last-updated />
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

  constructor(private store: Store) {}

  ngOnInit() {
    this.store.select(selectCursorChatPlaceholder).subscribe(placeholder => {
      (window as any).cursorChatPlaceholder = placeholder;
    });

    this.store.select(selectCursorUsernames).subscribe(usernames => {
      (window as any).cursorUsernames = usernames;
    });
  }
}
