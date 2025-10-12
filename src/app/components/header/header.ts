import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/app.state';
import { Links } from '../../models/models';
import { selectSelectedLink } from '../../store/app.selectors';
import { NavigationService } from '../../services/navigation.service';

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
            (click)="navService.goTo(link)"
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
export class HeaderComponent {
  selectedLink$: Observable<Links>;
  linksArray: Links[];

  constructor(private store: Store<AppState>, public navService: NavigationService) {
    this.selectedLink$ = this.store.select(selectSelectedLink);
    this.linksArray = [Links.home, Links.about, Links.contact];
  }
}
