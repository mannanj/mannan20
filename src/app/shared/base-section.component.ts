import { AfterViewInit, Directive, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Links } from '../models/models';
import { NavigationService } from '../services/navigation.service';

@Directive()
export abstract class BaseSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('main') elementRef!: ElementRef;

  protected intersectionObserver!: IntersectionObserver;
  protected abstract sectionLink: Links;
  protected abstract observerThreshold: number;

  constructor(protected navService: NavigationService) {}

  ngAfterViewInit(): void {
    this.intersectionObserver = this.navService.makeIntersectionObsAndSetFlags(
      this.sectionLink,
      this.observerThreshold
    );
    this.intersectionObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}
