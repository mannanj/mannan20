import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState, Links } from '../../models/models';
import { selectSelectedLink } from '../../store/app.selectors';
import { navigateTo } from '../../utils/help';

@Component({
  selector: 'header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="main">
      <div id="picture">
        <img src="mannan.jpg" width="48" height="48">
      </div>
      <div id="links">
        <div *ngFor="let link of linksArray">
          <a
            [id]="link + '-link'"
            [class.selected]="(selectedLink$ | async) === link"
            class="link"
            (click)="goTo(link)"
          >
            {{ link | titlecase }}
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    #main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: fixed;
      top: 0;
      width: 100vw;
      background-color: #0b0b0b;
      border-bottom: 1px solid white;
      height: 66px;
      z-index: 99;
    }

    a {
      color: white;
    }

    #picture {
      display: flex;
      align-items: center;
      position: relative;
      z-index: -99;
    }

    #picture:hover {
      cursor: pointer;
    }

    img {
      border-radius: 50%;
    }

    #links {
      display: flex;
      padding: 0 50px 0 15px;
    }
    #links > * {
      padding-left: 15px;
    }
    .link {
      cursor: pointer;
      position: relative;
    }

    .link::after {
      content: '';
      position: absolute;
      width: 0;
      height: 2px;
      bottom: -25px;
      left: 0;
      background-color: #4fc3f7;
      transition: width 0.3s ease;
    }

    .link:hover::after {
      width: 100%;
    }

    .selected::after {
      width: 100%;
      background-color: #039be5;
    }
  `]
})
export class Header {
  private store = inject(Store<AppState>);
  selectedLink$: Observable<Links> = this.store.select(selectSelectedLink);
  linksArray: Links[] = [Links.home, Links.about, Links.contact];

  goTo(link: Links): void {
    navigateTo(this.store, link);
  }
}
