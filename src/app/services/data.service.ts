import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Experience {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string[];
  technologies?: string[];
}

export interface Education {
  degree: string;
  school: string;
  location: string;
  year: string;
  details?: string[];
}

export interface Skill {
  category: string;
  items: string[];
}

export interface AboutData {
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private mockAboutData: AboutData = {
    experiences: [
      {
        title: 'Senior Software Engineer',
        company: 'Capital One',
        location: 'McLean, VA',
        startDate: '2020',
        endDate: 'Present',
        description: [
          'Led development of critical banking features',
          'Improved application performance by 40%',
          'Mentored junior developers'
        ],
        technologies: ['Angular', 'TypeScript', 'AWS', 'Node.js']
      },
      {
        title: 'Software Engineer',
        company: 'Tech Company',
        location: 'San Francisco, CA',
        startDate: '2018',
        endDate: '2020',
        description: [
          'Built scalable web applications',
          'Collaborated with cross-functional teams',
          'Implemented CI/CD pipelines'
        ],
        technologies: ['React', 'JavaScript', 'Python', 'Docker']
      }
    ],
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        school: 'University Name',
        location: 'City, State',
        year: '2018',
        details: ['GPA: 3.8/4.0', 'Dean\'s List']
      }
    ],
    skills: [
      {
        category: 'Frontend',
        items: ['Angular', 'React', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'SCSS']
      },
      {
        category: 'Backend',
        items: ['Node.js', 'Python', 'Java', 'RESTful APIs']
      },
      {
        category: 'Tools & Technologies',
        items: ['Git', 'Docker', 'AWS', 'Firebase', 'CI/CD']
      }
    ]
  };

  constructor() { }

  getAboutData(): Observable<AboutData> {
    return of(this.mockAboutData);
  }
}
