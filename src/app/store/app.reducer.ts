import { createReducer, on } from '@ngrx/store';
import { AppState, Links } from '../models/models';
import * as AppActions from './app.actions';

export const initialState: AppState = {
  selectedLink: Links.home,
  aboutData: null,
  metadata: null,
  cursorChatPlaceholder: 'say hello to your friend',
  cursorUsername: 'happy possum'
};

export const appReducer = createReducer(
  initialState,
  on(AppActions.setSelectedLink, (state, { link }) => ({
    ...state,
    selectedLink: link
  })),
  on(AppActions.loadAboutDataSuccess, (state, { data }) => ({
    ...state,
    aboutData: data
  })),
  on(AppActions.loadMetadataSuccess, (state, { metadata }) => ({
    ...state,
    metadata
  })),
  on(AppActions.loadCursorUsernameSuccess, (state, { username }) => ({
    ...state,
    cursorUsername: username
  }))
);
