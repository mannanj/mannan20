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

  /**
   * Sets that the component is visible, they use the
   * Link for name for consistency & simplicity.
   * @param link 
   * @param threshold % of the element in view
   */
  setComponentIsVisible(link: Links): void {
    this.visibleComponent$.next(link);
  }

  /**
   * 
   * Creates an IntersectionObserver to check if a component became
   * visible in the page, and if so, then sets our flags accordingly
   * and emits an update to the link subject.
   * 
   * @param component component to observe
   * @param threshold number corresponding to top-level document viewport
   * @returns 
   */

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
