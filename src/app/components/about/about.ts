import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Links } from '../../models/models';
import { NavigationService } from '../../services/navigation.service';
import { DataService, AboutData } from '../../services/data.service';
import { fadeIn, scaleIn, slideInLeft, slideInRight } from '../../animations/animations';
import { BaseSectionComponent } from '../../shared/base-section.component';

@Component({
  selector: 'about',
  standalone: true,
  imports: [CommonModule],
  animations: [fadeIn, scaleIn, slideInLeft, slideInRight],
  template: `
    <div #main>
      <h1 class="text-end" @scaleIn>About</h1>
      <hr @fadeIn>
      <p class="margin-0 margin-top-25" style="font-size: 14px;" @slideInRight>
        I am a multi-disciplinary engineer, leader, and student. I'm passionate about success through effective practice, strong communication, and asymmetric risk taking.
      </p>

      <div id="more-about">
        <div *ngIf="displayMoreAbout" @fadeIn>
          <p style="font-size: 14px; margin-top: 12px;">
            I grew through a career of tight teams in fast-paced initiatives. I've had experience building unique products in a range of environments, from non-profits to government and commercial.
          </p>

          <p style="font-size: 14px; margin-top: 12px;">
            I measure my success by the strength of those around me. My greatest passion is to distill the simple from the complex, and to find flow and trust within my teams.
          </p>
        </div>

        <button *ngIf="!displayMoreAbout" type="button" class="collapsible" (click)="toggleDisplayMoreAbout()">more</button>
        <button *ngIf="displayMoreAbout" type="button" class="collapsible" (click)="toggleDisplayNoMoreAbout()">less</button>
      </div>

      <h2 @slideInLeft>Employment History</h2>
      <div class="section margin-top">
        <a href="https://www.capitalone.com/" target="_blank"><b>Capital One</b></a>
        <p>2024-2025, 2021-2022</p>
        <p>Principal Software Engineer</p>
        <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Security, Splunk, New Relic, PagerDuty, Springboot, Astro, SolidJS, Node.js, DevSecOps</p>
        <p style="font-size: 12px; margin-top: 6px;">Led security operations, remediation, and engineering for high-scale applications serving 3m+ DAU, achieving zero security incidents while delivering secure microservices and customer-facing features.</p>

        <div id="more-capital-one">
          <div *ngIf="displayMoreCapitalOne" class="content" @fadeIn>
            <p style="font-size: 12px; margin-top: 6px;">
            ▸ Engineered high-traffic microservices and customer-facing features (Trade-In, Auto Loan Rates, SEO) using modern frameworks (Astro, SolidJS, Node.js), architecting scalable solutions serving millions of daily users with robust performance and zero production vulnerabilities.<br>
            ▸ Led production security monitoring and incident response operations using Splunk and New Relic, creating custom SPL queries for threat detection, building real-time alerting dashboards, and providing 24/7 on-call support via PagerDuty to ensure rapid response to security events.<br>
            ▸ Drove platform reliability and security remediation initiatives across 3M+ DAU applications, leading Springboot upgrades and vulnerability patching programs, enhancing CI/CD pipelines to strengthen cloud security posture, and reducing API failures by 100K through systematic infrastructure improvements.<br>
            </p>
          </div>
          <button *ngIf="!displayMoreCapitalOne" type="button" class="collapsible" (click)="toggleDisplayMoreCapitalOne()">more</button>
          <button *ngIf="displayMoreCapitalOne" type="button" class="collapsible" (click)="toggleDisplayNoMoreCapitalOne()">less</button>
        </div>
      </div>

      <div class="section margin-top">
        <a href="https://www.publicissapient.com/" target="_blank"><b>Publicis Sapient</b></a>
        <p>2022-2023</p>
        <p>Senior Software Engineer</p>
        <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Javascript, Typescript, Angular, ArcGIS, AWS, Java, leadership</p>
        <p style="font-size: 12px; margin-top: 6px;">Led implementation and oversight of developers to deliver features ahead of schedule and improve company-wide velocity. Initiated and introduced major feature rewrites.</p>
      </div>

      <div class="section margin-top">
        <a href="https://www.maxar.com/" target="_blank"><b>Radiant (now Maxar)</b></a>
        <p>2018-2022</p>
        <p>Software Engineer II</p>
        <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Javascript, Typescript, Angular, Cesium, LeafletJS, ArcGIS, AWS, culture</p>
        <p style="font-size: 12px; margin-top: 6px;">Mid-level frontend engineer on mapping systems that informed national security needs. Champion and advocate for company culture.</p>
      </div>

      <div id="more-jobs">
        <div *ngIf="displayMoreJobs" @fadeIn>
          <div class="section margin-top">
            <a href="https://www.mitre.org/" target="_blank"><b>MITRE Corporation</b></a>
            <p>2016-2018</p>
            <p>Software Engineer I</p>
            <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Javascript, Typescript, Angular, Python, Python Django, AWS, research</p>
            <p style="font-size: 12px; margin-top: 6px;">Engineer, researcher and experimenter in national initiatives addressing cloud, cyber security, and tax system shortages.</p>
          </div>

          <div *ngIf="moreJobsSectionsShown >=1" class="section margin-top">
            <a href="https://www.electric.coop/" target="_blank"><b>America's Electric Cooperatives</b></a>
            <p>2014-2016 (contract)</p>
            <p>Software Engineer</p>
            <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Javascript, jQuery, Python, Python-Flask, research</p>
            <p style="font-size: 12px; margin-top: 6px;">Fullstack engineer for America's cooperatives. Committed to stewarding sustainability in energy generation and <a href="assets/data/documents/OMF-DR.pdf" download="OMF-Energy-Demand-Response" style="color: #039be5;">cutting edge research.</a></p>
          </div>

          <div *ngIf="moreJobsSectionsShown == 2" class="section margin-top">
            <a href="https://meal-fairy-ce3bf.web.app/" target="_blank"><b>Meal Fairy, LLC</b></a>
            <p>2018 (self-employed)</p>
            <p>Founder</p>
            <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Javascript, Typescript, Angular, Firebase, Stripe, startup, marketing</p>
            <p style="font-size: 12px; margin-top: 6px;">Founder for a plate to door food delivery startup in the greater Washington DC area.</p>
          </div>
        </div>

        <button *ngIf="moreJobsSectionsShown < 2" type="button" class="collapsible" (click)="toggleDisplayMoreJobs()">more</button>
        <button *ngIf="moreJobsSectionsShown === 2" type="button" class="collapsible" (click)="toggleDisplayNoMoreJobs()">less</button>
      </div>

      <h2 @slideInLeft>Extracurriculars</h2>

      <div class="section margin-top">
        <b>Substitute Teacher</b>
        <p>2024</p>
        <p style="font-size: 12px; margin-top: 6px;">Public school teacher and instructional assistant for elementary, middle and high schools across Fairfax County and Southern Bethesda in Maryland and Virginia across English, Math, for emotionally limited and special needs students.</p>
      </div>

      <div id="more-ec">
        <div *ngIf="displayMoreEC" @fadeIn>
          <div *ngIf="moreECSectionsShown >=1" class="section margin-top">
            <b>Volunteering</b>
            <p>2013-present</p>
            <p style="font-size: 12px; margin-top: 6px;">
              Volunteering and service across a variety of initiatives including: Food distribution and drives, STEM Students Lego Mindstorm & ARCHR robotics demo, Local community initiatives for the underserved and more.
            </p>
          </div>

          <div *ngIf="moreECSectionsShown >=1" class="section margin-top">
            <b>Nomadic Travel</b>
            <p>2020-2023</p>
            <p style="font-size: 12px; margin-top: 6px;">Travel and living in a variety of locations from the West Coast, California, stewarding sustainability in ecovillages in California and Hawaii, to car camping across national parks across Washington, Oregon and California,</p>
          </div>

          <div *ngIf="moreECSectionsShown == 2" class="section margin-top">
            <a href="https://appliedjung.com" target="_blank"><b>Applied Jung,</b></a>
            <br>
            <b>Community Building</b>
            <p>2021-present</p>
            <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Analytical psychology, community men's work, embodiment & mindfulness</p>
            <p style="font-size: 12px; margin-top: 6px;">Training and application of community building and Jungian individuation techniques, holding <a href="https://thebeingman.com" target="_blank">a community space</a> for men to learn healthy models of masculinity.</p>
          </div>

          <div *ngIf="moreECSectionsShown == 2" class="section margin-top">
            <b>Published Works</b>
            <p style="font-size: 14px;">&#x2022; <a href="assets/data/documents/GMU-ARCHR.pdf" download="ARCHR-Apparatus-for-Remote-Control of-Humanoid-Robot" style="color: #039be5;">Apparatus for Remote Control of Humanoid Robots</a></p>
            <p style="font-size: 14px;">&#x2022; <a href="assets/data/documents/OMF-DR.pdf" download="OMF-Energy-Demand-Response" style="color: #039be5;">Open Modeling Framework Demand Response</a></p>
          </div>
        </div>

        <button *ngIf="moreECSectionsShown < 2" type="button" class="collapsible" (click)="toggleDisplayMoreEC()">more</button>
        <button *ngIf="moreECSectionsShown === 2" type="button" class="collapsible" (click)="toggleDisplayNoMoreEC()">less</button>
      </div>

      <h2 class="margin-top-60" @slideInLeft>Education</h2>
      <div class="section">
        <b>George Mason University</b>
        <p>2009-2015</p>
        <p>Electrical Engineering, B.S.</p>

        <div id="more-education">
          <div *ngIf="displayMoreEd" class="content" @fadeIn>
            <div *ngIf="moreEdSectionsShown >=1" class="section">
              <a href="https://www.youtube.com/watch?v=GSx22ggePHw" target="_blank"><b>ARCHR Humanoid Robot</b></a>
              <p>2013-2014</p>
              <p>Lead Developer</p>
              <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Javascript, Typescript, Angular, AWS, Java, innovation</p>
              <p style="font-size: 12px; margin-top: 6px;">Humanoid robot <span><a href="assets/data/documents/GMU-ARCHR.pdf" download="ARCHR - Apparatus for Remote Control of Humanoid Robot" style="color: #039be5;">published</a></span>, taken to DARPA robotics challenge, and designed to address Daiichi Nuclear disaster response. Simplistic one-to-one hand-puppetered mimickry with Oculus VR streaming, controllers for ARCHR, Mini-Hubo, and Baxter robots.</p>
            </div>

            <div *ngIf="moreEdSectionsShown >=1" class="section margin-top-12">
              <a><b>Solar Collaborative Workspace</b></a>
              <p>2013-2014</p>
              <p>Lead Developer</p>
              <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Solidworks, wiring schematics, sustainability and clean energy</p>
              <p style="font-size: 12px; margin-top: 6px;">Contributor who designed mechanics in solidworks 3D and wire drawings.</p>
            </div>

            <div *ngIf="moreEdSectionsShown == 2" class="section margin-top-12">
              <a><b>DC Dome Light (family)</b></a>
              <p>2014</p>
              <p>CAD Designer</p>
              <p style="font-size: 12px; font-style: italic; margin-top: 6px;">Solidworks, wiring schematics, sustainability and clean energy</p>
              <p style="font-size: 12px; margin-top: 6px;">Designed dome light in 3D for use for external vendors outsourcing. Design was too complex to be used.</p>
            </div>
          </div>
          <button *ngIf="moreEdSectionsShown < 2" type="button" class="collapsible" (click)="toggleDisplayMoreEd()">more</button>
          <button *ngIf="moreEdSectionsShown === 2" type="button" class="collapsible" (click)="toggleDisplayNoMoreEd()">less</button>
        </div>
      </div>

      <button (click)="navService.goTo(navService.Links.contact)" class="margin-top-60">Get In Touch</button>
    </div>
  `,
  styles: [`
    #main a:not([href]) {
      color: inherit;
      cursor: default;
      pointer-events: none;
    }

    #main a:not([href]):hover {
      color: inherit;
      transform: none;
    }

    .download-link {
      display: block;
      text-align: end;
      color: #039be5;
      cursor: pointer;
      font-size: 14px;
      margin-top: 8px;
      text-decoration: underline;
    }

    .download-link:hover {
      color: #0277bd;
    }

    .collapsible {
      background-color: #eee;
      color: #444;
      cursor: pointer;
      border: none;
      text-align: left;
      font-size: 9px;
      border: 1px solid white;
      border-radius: 5px;
      text-transform: lowercase;
      padding: 1px 6px;
      margin-top: 5px;
    }

    .active,
    .collapsible:hover {
      background-color: #ccc;
    }

    .content {
      background-color: #f1f1f1;
      color: black;
      padding: 6px;
      border-radius: 6px;
    }

    .content .section {
      color: black;
      font-size: 80%;
    }

    .content .margin-top-12 {
      margin-top: 12px;
    }

    .content p {
      color: black;
    }

    .content b {
      color: black;
    }

    .content a {
      color: #039be5;
    }
  `]
})
export class AboutComponent extends BaseSectionComponent {
  protected sectionLink = Links.about;
  protected observerThreshold = 0.33;

  aboutData: AboutData | null = null;

  private sections = new Map([
    ['About', { display: false, count: 0 }],
    ['CapitalOne', { display: false, count: 0 }],
    ['Jobs', { display: false, count: 0 }],
    ['EC', { display: false, count: 0 }],
    ['Ed', { display: false, count: 0 }]
  ]);

  get displayMoreAbout() { return this.sections.get('About')!.display; }
  get displayMoreCapitalOne() { return this.sections.get('CapitalOne')!.display; }
  get moreCapitalOneSectionsShown() { return this.sections.get('CapitalOne')!.count; }
  get displayMoreJobs() { return this.sections.get('Jobs')!.display; }
  get moreJobsSectionsShown() { return this.sections.get('Jobs')!.count; }
  get displayMoreEC() { return this.sections.get('EC')!.display; }
  get moreECSectionsShown() { return this.sections.get('EC')!.count; }
  get displayMoreEd() { return this.sections.get('Ed')!.display; }
  get moreEdSectionsShown() { return this.sections.get('Ed')!.count; }

  constructor(
    navService: NavigationService,
    private dataService: DataService
  ) {
    super(navService);
    this.dataService.getAboutData().subscribe(data => {
      this.aboutData = data;
    });
  }

  toggleSection(sectionName: string, expand: boolean): void {
    const section = this.sections.get(sectionName);
    if (section) {
      section.display = expand;
      if (expand) {
        section.count += 1;
      } else {
        section.count = 0;
      }
    }
  }

  toggleDisplayMoreAbout(): void {
    this.toggleSection('About', true);
  }

  toggleDisplayNoMoreAbout(): void {
    this.toggleSection('About', false);
  }

  toggleDisplayMoreEd(): void {
    this.toggleSection('Ed', true);
  }

  toggleDisplayNoMoreEd(): void {
    this.toggleSection('Ed', false);
  }

  toggleDisplayMoreJobs(): void {
    this.toggleSection('Jobs', true);
  }

  toggleDisplayNoMoreJobs(): void {
    this.toggleSection('Jobs', false);
  }

  toggleDisplayMoreEC(): void {
    this.toggleSection('EC', true);
  }

  toggleDisplayNoMoreEC(): void {
    this.toggleSection('EC', false);
  }

  toggleDisplayMoreCapitalOne(): void {
    this.toggleSection('CapitalOne', true);
  }

  toggleDisplayNoMoreCapitalOne(): void {
    this.toggleSection('CapitalOne', false);
  }
}
