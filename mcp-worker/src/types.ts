export interface Profile {
  name: string;
  tagline: string;
  bio: string;
  education: { institution: string; dates: string; degree: string; description: string };
  certifications: Array<{ name: string; year: string }>;
  links: { site: string; github: string };
}

export interface NarrativeChapter {
  id: string;
  title: string;
  content: string;
  highlight?: string;
}

export interface Goal {
  statement: string;
  source: { url: string; quote: string };
}

export interface Experience {
  company: string;
  position: string;
  dates: string;
  skills: string;
  description: string;
  highlights: string[];
  link?: string;
}

export interface Extracurricular {
  id: string;
  name: string;
  position: string;
  dates: string;
  skills?: string;
  description: string;
  link?: string;
  relatedLinks?: string[];
}

export interface Writing {
  title: string;
  description: string;
  date?: string;
  readingTime?: string;
  wordCount?: number;
  url: string;
}

export interface Reading {
  title: string;
  author: string;
  date: string;
  url: string;
  note: string;
  agentUrl?: string;
}

export interface App {
  name: string;
  description: string;
  url: string;
  year?: number;
  retired?: boolean;
}

export interface Research {
  title: string;
  description: string;
  kind: string;
  demoUrl?: string;
  downloadUrl?: string;
  agentUrl?: string;
}

export interface Download {
  label: string;
  url: string;
  filename: string;
  agentUrl?: string;
}

export interface FileEntry {
  slug: string;
  key: string;
  filename: string;
  contentType: string;
  label: string;
}

export interface WorkerEnv {
  FILES: R2Bucket;
  FILES_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export interface Contact {
  how: string;
  contactPage: string;
  github: string;
}

export interface PortfolioData {
  generatedAt: string;
  site: string;
  profile: Profile;
  narrative: NarrativeChapter[];
  goals: Goal[];
  experience: Experience[];
  extracurriculars: Extracurricular[];
  writing: Writing[];
  readings: Reading[];
  apps: App[];
  research: Research[];
  downloads: Download[];
  files: FileEntry[];
  contact: Contact;
}
