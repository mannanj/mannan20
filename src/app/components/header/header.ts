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
    <div class="flex justify-between items-center fixed top-0 w-screen bg-[#0b0b0b] border-b border-white h-[66px] z-[99]">
      <div class="flex items-center relative z-[-99] hover:cursor-pointer">
        <img src="mannan.jpg" width="48" height="48" class="rounded-full">
      </div>
      <div class="flex pr-[50px] pl-[15px]">
        <div *ngFor="let link of linksArray" class="pl-[15px]">
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
    a {
      color: white;
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
