export type TicketStatus = 'open' | 'auto-closed' | 'escalated' | 'resolved';

export type SenderRole = 'user' | 'support' | 'system';

export interface SupportCompany {
  slug: string;
  name: string;
  description: string;
  articleCount: number;
}

export interface SupportIndex {
  companies: SupportCompany[];
}

export interface SupportArticleSummary {
  slug: string;
  title: string;
  status: TicketStatus;
  ticketNumber: string;
  dateOpened: string;
  dateClosed?: string;
  summary: string;
}

export interface CompanyIndex {
  company: string;
  articles: SupportArticleSummary[];
}

export interface TimelineEntry {
  date: string;
  sender: string;
  role: SenderRole;
  subject?: string;
  content: string;
  terminalOutput?: string;
  gap?: string;
}

export interface Screenshot {
  path?: string;
  caption: string;
}

export interface UserInfo {
  username: string;
  email: string;
  userId: string;
}

export interface ProblemSummary {
  description: string;
  symptoms: string[];
  rootCause: string;
}

export interface CurrentStatus {
  summary: string;
  details: string;
}

export interface SupportArticle {
  title: string;
  ticketNumber: string;
  status: TicketStatus;
  platform: string;
  dateOpened: string;
  dateClosed?: string;
  userInfo: UserInfo;
  problemSummary: ProblemSummary;
  timeline: TimelineEntry[];
  screenshots: Screenshot[];
  currentStatus: CurrentStatus;
}
