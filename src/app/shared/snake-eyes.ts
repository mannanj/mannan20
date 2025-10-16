import { Component, OnInit, OnDestroy, ElementRef, ChangeDetectionStrategy, inject, effect, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectSnakeEyesEnabled } from '../store/app.selectors';
import { toSignal } from '@angular/core/rxjs-interop';

const ITEM_SIZE = 30;
const GAP_SIZE = 20;
const CIRCLE_DIAMETER = 6;
const MAX_CIRCLE_TRANSLATE = ITEM_SIZE / 2 - CIRCLE_DIAMETER / 2;
const DISPLACEMENT_PROPORTIONALITY_CONSTANT = 1000;
const DELAY_FACTOR = 0.75;

interface CircleElement extends HTMLDivElement {
  dataset: DOMStringMap & {
    centerX: string;
    centerY: string;
  };
}

@Component({
  selector: 'snake-eyes',
  template: `
    @if (isEnabled()) {
      <div class="snake-eyes-container">
        <div #gridContainer class="grid-container"></div>
      </div>
    }
  `,
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .snake-eyes-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .grid-container {
      display: grid;
      width: 100%;
      height: 100%;
      gap: 20px;
      box-sizing: border-box;
      padding: 20px;
      justify-content: center;
      align-content: center;
    }

    .square {
      width: 30px;
      height: 30px;
      background-color: rgba(0, 0, 0, 0.15);
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      border-radius: 4px;
    }

    .circle {
      width: 6px;
      height: 6px;
      background-color: rgba(255, 255, 255, 0.8);
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      transition: transform 0.1s ease-out;
      filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
      animation: shimmer 3s ease-in-out infinite;
    }

    @keyframes shimmer {
      0%, 100% {
        opacity: 0.4;
        filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.4));
      }
      50% {
        opacity: 1;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, 1));
      }
    }

    .circle:nth-child(2n) {
      animation-delay: 0.5s;
    }

    .circle:nth-child(3n) {
      animation-delay: 1s;
    }

    .circle:nth-child(5n) {
      animation-delay: 1.5s;
    }

    .circle:nth-child(7n) {
      animation-delay: 2s;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnakeEyes implements OnInit, OnDestroy {
  private store = inject(Store);
  private elementRef = inject(ElementRef);
  protected isEnabled = toSignal(this.store.select(selectSnakeEyesEnabled), { initialValue: false });

  private animatableCircles: CircleElement[] = [];
  private isAnimationFrameRequested = false;
  private currentMouseX = 0;
  private currentMouseY = 0;
  private resizeObserver?: ResizeObserver;
  private mouseMoveListener?: (event: MouseEvent) => void;
  private clickListener?: (event: MouseEvent) => void;
  private touchStartListener?: (event: TouchEvent) => void;
  private touchMoveListener?: (event: TouchEvent) => void;

  private colorSequence = [
    'rgba(255, 107, 107, 0.8)',
    'rgba(78, 205, 196, 0.8)',
    'rgba(255, 185, 0, 0.8)',
    'rgba(129, 236, 236, 0.8)',
    'rgba(255, 121, 198, 0.8)',
    'rgba(160, 196, 255, 0.8)',
    'rgba(187, 255, 102, 0.8)',
    'rgba(255, 159, 243, 0.8)',
    'rgba(255, 206, 84, 0.8)',
    'rgba(108, 92, 231, 0.8)',
    'rgba(255, 154, 162, 0.8)',
    'rgba(69, 183, 255, 0.8)',
  ];

  private currentColorIndex = Math.floor(Math.random() * this.colorSequence.length);

  constructor() {
    effect(() => {
      const enabled = this.isEnabled();
      if (enabled) {
        setTimeout(() => {
          const gridContainer = this.elementRef.nativeElement.querySelector('.grid-container');
          if (gridContainer) {
            this.createGrid(gridContainer);
            if (!this.mouseMoveListener) {
              this.setupEventListeners();
            }
          }
        }, 0);
      } else {
        this.cleanup();
      }
    });
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.cleanup();
  }

  private getNextColor(): string {
    const color = this.colorSequence[this.currentColorIndex];
    this.currentColorIndex = (this.currentColorIndex + 1) % this.colorSequence.length;
    return color;
  }

  private createComponent(): HTMLElement {
    const container = document.createElement('div');
    const square = document.createElement('div');
    square.classList.add('square');

    const circle = document.createElement('div');
    circle.classList.add('circle');

    this.animatableCircles.push(circle as any as CircleElement);

    square.appendChild(circle);
    container.appendChild(square);

    return container;
  }

  private calculateElementPositions() {
    this.animatableCircles.forEach((circle) => {
      const rect = circle.getBoundingClientRect();
      circle.dataset.centerX = (rect.left + rect.width / 2 + window.scrollX).toString();
      circle.dataset.centerY = (rect.top + rect.height / 2 + window.scrollY).toString();
    });
  }

  private updateCirclePositions = () => {
    const mouseX = this.currentMouseX;
    const mouseY = this.currentMouseY;

    this.animatableCircles.forEach((circle) => {
      const centerX = parseFloat(circle.dataset.centerX);
      const centerY = parseFloat(circle.dataset.centerY);

      const deltaX = mouseX - centerX;
      const deltaY = mouseY - centerY;
      let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < 1) {
        distance = 1;
      }

      const normalizedDeltaX = deltaX / distance;
      const normalizedDeltaY = deltaY / distance;

      let rawDisplacementMagnitude = DISPLACEMENT_PROPORTIONALITY_CONSTANT / distance;
      let actualDisplacementMagnitude = Math.min(rawDisplacementMagnitude, MAX_CIRCLE_TRANSLATE);

      const targetTranslateX = normalizedDeltaX * actualDisplacementMagnitude;
      const targetTranslateY = normalizedDeltaY * actualDisplacementMagnitude;

      const currentTransform = circle.style.transform || '';
      const scaleMatch = currentTransform.match(/scale\([^)]+\)/);
      const scaleStr = scaleMatch ? ` ${scaleMatch[0]}` : '';

      circle.style.transform = `translate(${targetTranslateX}px, ${targetTranslateY}px)${scaleStr}`;
    });

    this.isAnimationFrameRequested = false;
  };

  private createGrid(gridContainer: HTMLElement) {
    this.animatableCircles = [];
    gridContainer.innerHTML = '';

    const containerWidth = gridContainer.clientWidth;
    const containerHeight = gridContainer.clientHeight;
    const numCols = Math.floor((containerWidth + GAP_SIZE) / (ITEM_SIZE + GAP_SIZE));
    const numRows = Math.floor((containerHeight + GAP_SIZE) / (ITEM_SIZE + GAP_SIZE));

    gridContainer.style.gridTemplateColumns = `repeat(${numCols}, ${ITEM_SIZE}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${numRows}, ${ITEM_SIZE}px)`;

    for (let i = 0; i < numRows * numCols; i++) {
      const component = this.createComponent();
      gridContainer.appendChild(component);
    }
    this.calculateElementPositions();
  }

  private triggerInteractionEffects(mouseX: number, mouseY: number) {
    this.currentMouseX = mouseX;
    this.currentMouseY = mouseY;

    const circleDistances = this.animatableCircles.map((circle) => {
      const centerX = parseFloat(circle.dataset.centerX);
      const centerY = parseFloat(circle.dataset.centerY);
      const deltaX = mouseX - centerX;
      const deltaY = mouseY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      return { circle, distance };
    });

    this.updateCirclePositions();

    const sharedBrightColor = this.getNextColor();

    circleDistances.forEach(({ circle, distance }) => {
      const animationDelay = distance * DELAY_FACTOR;

      setTimeout(() => {
        circle.style.transition = 'transform 0.2s ease-out-expo, background-color 0.15s ease-out';
        circle.style.transform = circle.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(1.4)';

        setTimeout(() => {
          circle.style.backgroundColor = sharedBrightColor;
        }, 200);

        setTimeout(() => {
          circle.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), background-color 0.15s ease-out';
          circle.style.transform = circle.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(1)';
        }, 200);
      }, animationDelay);
    });
  }

  private setupEventListeners() {
    const gridContainer = this.elementRef.nativeElement.querySelector('.grid-container');
    if (!gridContainer) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.createGrid(gridContainer);
    });
    this.resizeObserver.observe(gridContainer);

    this.mouseMoveListener = (event: MouseEvent) => {
      this.currentMouseX = event.clientX;
      this.currentMouseY = event.clientY;

      if (!this.isAnimationFrameRequested) {
        this.isAnimationFrameRequested = true;
        requestAnimationFrame(this.updateCirclePositions);
      }
    };
    window.addEventListener('mousemove', this.mouseMoveListener);

    this.clickListener = (event: MouseEvent) => {
      this.triggerInteractionEffects(event.clientX, event.clientY);
    };
    window.addEventListener('click', this.clickListener);

    this.touchStartListener = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        this.triggerInteractionEffects(touch.clientX, touch.clientY);
      }
    };
    window.addEventListener('touchstart', this.touchStartListener);

    this.touchMoveListener = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        this.currentMouseX = touch.clientX;
        this.currentMouseY = touch.clientY;

        if (!this.isAnimationFrameRequested) {
          this.isAnimationFrameRequested = true;
          requestAnimationFrame(this.updateCirclePositions);
        }
      }
    };
    window.addEventListener('touchmove', this.touchMoveListener);
  }

  private cleanup() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.clickListener) {
      window.removeEventListener('click', this.clickListener);
    }
    if (this.touchStartListener) {
      window.removeEventListener('touchstart', this.touchStartListener);
    }
    if (this.touchMoveListener) {
      window.removeEventListener('touchmove', this.touchMoveListener);
    }
  }
}
