export enum Links {
    home = 'home',
    about = 'about',
    contact = 'contact'
}

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

export interface ExpandableSection {
  display: boolean;
  count: number;
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

export interface Metadata {
  lastUpdated: string;
}

export interface AppState {
  selectedLink: Links;
  aboutData: AboutData | null;
  metadata: Metadata | null;
  cursorChatPlaceholder: string;
  cursorUsername: string;
  activeViewerCount: number;
}

export interface ContactResult {
  email: string;
  phone: string;
}
