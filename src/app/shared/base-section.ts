import { AfterViewInit, Directive, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Links } from '../models/models';
import { createIntersectionObserver } from '../utils/help';

@Directive()
export abstract class BaseSection implements AfterViewInit, OnDestroy {
  @ViewChild('main') elementRef!: ElementRef;

  protected store = inject(Store);
  protected intersectionObserver!: IntersectionObserver;
  protected abstract sectionLink: Links;
  protected static intersectingSections = new Map<Links, IntersectionObserverEntry>();

  ngAfterViewInit(): void {
    this.intersectionObserver = createIntersectionObserver(
      this.store,
      this.sectionLink,
      BaseSection.intersectingSections
    );
    this.intersectionObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}
