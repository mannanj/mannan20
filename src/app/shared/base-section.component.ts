import { AfterViewInit, Directive, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Links } from '../models/models';
import { createIntersectionObserver } from '../utils/help';

@Directive()
export abstract class BaseSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('main') elementRef!: ElementRef;

  protected store = inject(Store);
  protected intersectionObserver!: IntersectionObserver;
  protected abstract sectionLink: Links;
  protected abstract observerThreshold: number;
  protected static intersectingSections = new Map<Links, IntersectionObserverEntry>();

  ngAfterViewInit(): void {
    this.intersectionObserver = createIntersectionObserver(
      this.store,
      this.sectionLink,
      this.observerThreshold,
      BaseSectionComponent.intersectingSections
    );
    this.intersectionObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}
