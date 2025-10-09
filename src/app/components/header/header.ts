import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="header">
      <div id="picture">
        <img src="mannan.jpg" width="48" height="48">
      </div>
      <div id="links" *ngIf="navService.selectedLink$ | async as link">
        <a id="home-link" [class.selected]="link === 'home'" class="link" (click)="navService.goTo(navService.Links.home)">Home</a>
        <a id="about-link" [class.selected]="link === 'about'" class="link" (click)="navService.goTo(navService.Links.about)">About</a>
        <a id="resume-link" [class.selected]="link === 'resume'" class="link" (click)="navService.goTo(navService.Links.resume)">Resume</a>
        <a id="contact-link" [class.selected]="link === 'contact'" class="link" (click)="navService.goTo(navService.Links.contact)">Contact</a>
      </div>
    </div>
  `,
  styles: [`
    #header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: fixed;
      top: 0;
      width: 100vw;
      border-bottom: 1px solid white;
      height: 66px;
      z-index: 99;
    }

    a {
      color: white;
    }

    #picture {
      display: flex;
      align-items: center;
      position: relative;
      z-index: -99;
    }

    #picture:hover {
      cursor: pointer;
    }

    img {
      border-radius: 50%;
    }

    #links {
      display: flex;
      padding: 0 50px 0 15px;
    }
    #links > * {
      padding-left: 15px;
    }
    .link {
      cursor: pointer;
      position: relative;
    }

    .link::after {
      content: '';
      position: absolute;
      width: 0;
      height: 2px;
      bottom: -19px;
      left: 0;
      background-color: #4fc3f7;
      transition: width 0.3s ease;
    }

    .link:hover::after {
      width: 100%;
    }

    .selected::after {
      width: 100%;
      background-color: #039be5;
    }
  `]
})
export class HeaderComponent {
  constructor(public navService: NavigationService) {}
}
