import { Component } from '@angular/core';

@Component({
  selector: 'snake-icon',
  template: `
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 4C8.477 4 4 8.477 4 14C4 19.523 8.477 24 14 24C16.5 24 18.8 23.1 20.6 21.6"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        fill="none"
      />
      <path
        d="M20.6 21.6C22.4 20.1 24 17.2 24 14C24 10.8 22.4 7.9 20.6 6.4"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        fill="none"
      />
      <circle cx="17" cy="21" r="2.5" fill="currentColor"/>
      <path
        d="M17 21L20.6 21.6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <circle cx="10" cy="12" r="1.2" fill="currentColor"/>
      <path
        d="M7 8C7.5 7 8.5 6.5 9.5 6.5C10.5 6.5 11.5 7 12 8"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
  `
})
export class SnakeIcon {}
