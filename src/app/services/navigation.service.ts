import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as help from '../utils/help';
import { Links, AppState } from '../models/models';
import { setSelectedLink } from '../store/app.actions';
import { selectSelectedLink } from '../store/app.selectors';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  selectedLink$: Observable<Links>;
  private intersectingSections = new Map<Links, IntersectionObserverEntry>();
  private readonly sectionOrder = [Links.home, Links.about, Links.contact];

  get Links() {
    return Links;
  }

  constructor(private store: Store<AppState>) {
    this.selectedLink$ = this.store.select(selectSelectedLink);
  }

  goTo(link: Links): void {
    this.store.dispatch(setSelectedLink({ link }));
    help.scrollToSection(link);
  }

  makeIntersectionObsAndSetFlags(component: Links, threshold: number): IntersectionObserver {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.intersectingSections.set(component, entry);
          } else {
            this.intersectingSections.delete(component);
          }
        });
        this.setActiveSection();
      },
      { threshold }
    );
  }

  private setActiveSection(): void {
    if (this.intersectingSections.size === 0) return;

    for (const section of this.sectionOrder) {
      if (this.intersectingSections.has(section)) {
        this.store.dispatch(setSelectedLink({ link: section }));
        break;
      }
    }
  }
}
