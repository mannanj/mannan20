import { createReducer, on } from '@ngrx/store';
import { AppState, Links } from '../models/models';
import * as AppActions from './app.actions';

export const initialState: AppState = {
  selectedLink: Links.home,
  aboutData: null,
  metadata: null,
  isInitialized: false,
  commandsModalVisible: false,
  devCommits: []
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
  on(AppActions.setAppInitialized, (state) => ({
    ...state,
    isInitialized: true
  })),
  on(AppActions.toggleCommandsModal, (state) => ({
    ...state,
    commandsModalVisible: !state.commandsModalVisible
  })),
  on(AppActions.loadDevCommitsSuccess, (state, { commits }) => ({
    ...state,
    devCommits: commits
  }))
);
