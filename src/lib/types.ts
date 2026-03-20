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
  description: string;
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
  partial: boolean;
  value: string;
}

export interface LLMValidationResult {
  name: LLMFieldResult;
  email: LLMFieldResult;
  reason: LLMFieldResult;
  feedback: string;
}

export type GlassModalSize = 'small' | 'medium' | 'large';

export interface GlassModalButton {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  body: string;
  buttons: GlassModalButton[];
  defaultSize?: GlassModalSize;
  showSizeToggle?: boolean;
}
