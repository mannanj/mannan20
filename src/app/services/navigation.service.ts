import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as help from '../utils/help';
import { Links } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  selectedLink$ = new BehaviorSubject(Links.home);
  visibleComponent$ = new BehaviorSubject(Links.home);

  get Links () {
    return Links; 
  }

  goTo(link: Links): any {
    this.selectedLink$.next(link);
    help.scrollToSection(link);
  }

  setComponentIsVisible(link: Links): void {
    this.visibleComponent$.next(link);
  }

  makeIntersectionObsAndSetFlags(component: Links, threshold: number): IntersectionObserver {
    return new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  this.setComponentIsVisible(component);
                  this.selectedLink$.next(component);
                }
            });
        },
        { threshold }
    );
  }
}
