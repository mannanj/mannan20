import { createReducer, on } from '@ngrx/store';
import { AppState } from './app.state';
import { Links } from '../models/models';
import * as AppActions from './app.actions';

export const initialState: AppState = {
  headerText: 'Hello world!',
  selectedLink: Links.home,
  visibleComponent: Links.home,
  contactFormData: {
    name: '',
    email: '',
    reason: ''
  }
};

export const appReducer = createReducer(
  initialState,
  on(AppActions.setHeaderText, (state, { text }) => ({
    ...state,
    headerText: text
  })),
  on(AppActions.setSelectedLink, (state, { link }) => ({
    ...state,
    selectedLink: link
  })),
  on(AppActions.setVisibleComponent, (state, { link }) => ({
    ...state,
    visibleComponent: link
  })),
  on(AppActions.updateContactFormData, (state, { formData }) => ({
    ...state,
    contactFormData: {
      ...state.contactFormData,
      ...formData
    }
  }))
);
