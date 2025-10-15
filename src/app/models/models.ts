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

export interface CursorData {
  id: string;
  x: number;
  y: number;
  username?: string;
  country?: string;
  color: string;
  isLocal: boolean;
}

export interface Cursors {
  [id: string]: CursorData;
}

export interface CursorState {
  cursorChatPlaceholder: string;
  cursorUsername: string;
  activeViewerCount: number;
  cursorColors: string[];
  myId: string | null;
  cursorsVisible: boolean;
  isCursorPartyConnected: boolean;
  cursors: Cursors;
  cursorOrder: string[];
}

export interface AppState {
  selectedLink: Links;
  aboutData: AboutData | null;
  metadata: Metadata | null;
  isInitialized: boolean;
  commandsModalVisible: boolean;
  devCommits: DevCommit[];
}

export interface ContactResult {
  email: string;
  phone: string;
}

export interface DevCommit {
  fullHash: string;
  hash: string;
  subject: string;
  body: string;
  author: string;
  date: string;
  url: string;
}
