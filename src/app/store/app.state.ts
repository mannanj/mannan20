import { Links } from '../models/models';

export interface ContactFormData {
  name: string;
  email: string;
  reason: string;
}

export interface AppState {
  headerText: string;
  selectedLink: Links;
  visibleComponent: Links;
  contactFormData: ContactFormData;
}
