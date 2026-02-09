export type Section = 'home' | 'about' | 'contact';

export interface ProfileItem {
  title?: string;
  link?: string;
  dates?: string;
  position?: string;
  skills?: string;
  description?: string;
  expandedContent?: string;
  additionalContent?: string;
  downloadLink?: string;
  downloadLabel?: string;
  downloadFilename?: string;
}

export interface AboutIntro {
  primary: string;
}

export interface PublishedWork {
  title: string;
  downloadPath: string;
  downloadFilename: string;
}

export interface EducationInfo {
  institution: string;
  dates: string;
  degree: string;
}

export interface NarrativeChapter {
  id: string;
  title: string;
  content: string;
  highlight?: string;
}

export interface Certification {
  name: string;
  year: string;
}

export interface DownloadLink {
  label: string;
  path: string;
  filename: string;
}

export interface AboutData {
  aboutIntro: AboutIntro;
  jobs: ProfileItem[];
  activities: Record<string, ProfileItem>;
  educationProjects: Record<string, ProfileItem>;
  publishedWorks: PublishedWork[];
  education: EducationInfo;
  narrative: NarrativeChapter[];
  certifications: Certification[];
  downloads: DownloadLink[];
}

export interface ContactResultData {
  email: string;
  phone: string;
}

export interface LLMFieldResult {
  found: boolean;
  value: string;
}

export interface LLMValidationResult {
  name: LLMFieldResult;
  email: LLMFieldResult;
  reason: LLMFieldResult;
}
