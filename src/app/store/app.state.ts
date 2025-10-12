import { Links } from '../models/models';

export interface AppState {
  headerText: string;
  selectedLink: Links;
  visibleComponent: Links;
}
