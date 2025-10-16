import { createReducer, on } from '@ngrx/store';
import { AppState, Links } from '../models/models';
import * as AppActions from './app.actions';

export const initialState: AppState = {
  selectedLink: Links.home,
  aboutData: null,
  metadata: null,
  isInitialized: false,
  commandsModalVisible: false,
  devCommits: [],
  tasks: [],
  contactModalOpen: false,
  contactShowResult: false,
  contactResult: null,
  devStatsModalOpen: false,
  devStatsActiveTab: 'commits',
  snakeEyesEnabled: false
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
  })),
  on(AppActions.loadTasksSuccess, (state, { tasks }) => ({
    ...state,
    tasks
  })),
  on(AppActions.openContactModal, (state) => ({
    ...state,
    contactModalOpen: true
  })),
  on(AppActions.closeContactModal, (state) => ({
    ...state,
    contactModalOpen: false,
    contactShowResult: false,
    contactResult: null
  })),
  on(AppActions.setContactResult, (state, { result }) => ({
    ...state,
    contactShowResult: true,
    contactResult: result
  })),
  on(AppActions.toggleDevStatsModal, (state) => ({
    ...state,
    devStatsModalOpen: !state.devStatsModalOpen
  })),
  on(AppActions.setDevStatsTab, (state, { tab }) => ({
    ...state,
    devStatsActiveTab: tab
  })),
  on(AppActions.toggleSnakeEyes, (state) => ({
    ...state,
    snakeEyesEnabled: !state.snakeEyesEnabled
  }))
);
