import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from './store/app.state';
import { selectSelectedLink } from './store/app.selectors';
import { HeaderComponent } from "./components/header/header";
import { HomeComponent } from "./components/home/home";
import { AboutComponent } from "./components/about/about";
import { ResumeComponent } from "./components/resume/resume";
import { ContactComponent } from "./components/contact/contact";
import { Links } from './models/models';

@Component({
  selector: 'app-root',
  imports: [CommonModule, HeaderComponent, HomeComponent, AboutComponent, ResumeComponent, ContactComponent],
  template: `
    <div id="page">
      <div id="header">
        <header></header>
      </div>

      <div id="body" *ngIf="selectedLink$ | async">
        <div id="home">
          <home></home>
        </div>

        <div id="about">
          <about></about>
        </div>

        <div id="resume">
          <resume></resume>
        </div>

        <div id="contact">
          <contact></contact>
        </div>
      </div>
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
    #resume,
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
export class AppComponent {
  title = 'mannan';
  selectedLink$: Observable<Links>;

  constructor(private store: Store<AppState>) {
    this.selectedLink$ = this.store.select(selectSelectedLink);
  }
}
