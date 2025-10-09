import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="main">
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
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  constructor(public navService: NavigationService) {}
}
