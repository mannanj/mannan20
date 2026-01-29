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
  expanded: string[];
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

export interface AboutData {
  aboutIntro: AboutIntro;
  jobs: ProfileItem[];
  activities: Record<string, ProfileItem>;
  educationProjects: Record<string, ProfileItem>;
  publishedWorks: PublishedWork[];
  education: EducationInfo;
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
