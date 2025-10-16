import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Links } from '../../models/models';
import { navigateTo } from '../../utils/help';
import { openContactModal } from '../../store/app.actions';

@Component({
  selector: 'contact',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pb-[100px]">
      <h1 class="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">Contact</h1>
      <hr class="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5">
      <div class="flex flex-col mt-[25px]">
        <div class="contact-grid">
          <div class="flex flex-col">
            <a class="text-base tracking-wide text-[#039be5] no-underline cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" (click)="openModal()" title="Request contact info">*****&#64;mannan.is</a>
            <a class="text-base tracking-wide text-[#039be5] no-underline cursor-pointer mt-2 transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" (click)="openModal()" title="Request contact info">+1 (***) *** 8302</a>
          </div>
          <div class="ripple-container" (click)="openModal()" title="Request contact info">
            <div class="circle"></div>
          </div>
        </div>
        <p class="m-0 mt-3 leading-[1.6] text-white">Alexandria, Virginia</p>
      </div>
      <button (click)="goToHome()" class="nav-button mt-[50px]">Back to Top</button>
    </div>
  `,
  styles: [`
    .contact-grid {
      display: grid;
      grid-template-columns: 2fr auto;
      align-items: center;
      gap: 24px;
    }

    .ripple-container {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      justify-self: center;
      align-self: center;
      position: relative;
      width: 90px;
      height: 90px;
      margin-top: 20px;
    }

    .circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(77, 184, 255, 1);
      position: relative;
      transition: all 0.3s ease;
    }

    .circle::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 200%;
      height: 200%;
      border-radius: 50%;
      border: 2px solid rgba(77, 184, 255, 0.75);
      transform: translate(-50%, -50%);
      transition: all 0.3s ease;
    }

    .circle::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 300%;
      height: 300%;
      border-radius: 50%;
      border: 2px solid rgba(77, 184, 255, 0.45);
      transform: translate(-50%, -50%);
      transition: all 0.3s ease;
    }

    .ripple-container:hover .circle {
      border-color: rgba(3, 155, 229, 1);
    }

    .ripple-container:hover .circle::before {
      border-color: rgba(3, 155, 229, 0.9);
      animation: pulse 1.5s ease-out infinite;
    }

    .ripple-container:hover .circle::after {
      border-color: rgba(3, 155, 229, 0.6);
      animation: pulse 1.5s ease-out infinite 0.3s;
    }

    @keyframes pulse {
      0% {
        opacity: 0.8;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1.3);
      }
    }
  `]
})
export class Contact {
  private store = inject(Store);

  openModal() {
    this.store.dispatch(openContactModal());
  }

  goToHome(): void {
    navigateTo(this.store, Links.home);
  }
}
