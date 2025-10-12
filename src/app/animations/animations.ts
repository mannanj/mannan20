import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(30px)' }),
    animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-100px)' }),
    animate('800ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
  ])
]);

export const slideInRight = trigger('slideInRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(100px)' }),
    animate('800ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
  ])
]);

export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.8)' }),
    animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'scale(1)' }))
  ])
]);

export const bounceIn = trigger('bounceIn', [
  transition(':enter', [
    animate('1000ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', keyframes([
      style({ opacity: 0, transform: 'scale(0.3)', offset: 0 }),
      style({ opacity: 0.9, transform: 'scale(1.05)', offset: 0.7 }),
      style({ opacity: 1, transform: 'scale(1)', offset: 1 })
    ]))
  ])
]);

export const staggerFadeIn = trigger('staggerFadeIn', [
  transition('* => *', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);
