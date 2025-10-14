import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from '../models/models';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectSelectedLink = createSelector(
  selectAppState,
  (state: AppState) => state.selectedLink
);

export const selectAboutData = createSelector(
  selectAppState,
  (state: AppState) => state.aboutData
);

export const selectAboutIntro = createSelector(
  selectAboutData,
  (data) => data?.aboutIntro
);

export const selectJobs = createSelector(
  selectAboutData,
  (data) => data?.jobs
);

export const selectActivities = createSelector(
  selectAboutData,
  (data) => data?.activities
);

export const selectEducationProjects = createSelector(
  selectAboutData,
  (data) => data?.educationProjects
);

export const selectPublishedWorks = createSelector(
  selectAboutData,
  (data) => data?.publishedWorks
);

export const selectEducation = createSelector(
  selectAboutData,
  (data) => data?.education
);

export const selectMetadata = createSelector(
  selectAppState,
  (state: AppState) => state.metadata
);

export const selectLastUpdated = createSelector(
  selectMetadata,
  (metadata) => metadata?.lastUpdated
);

export const selectCursorChatPlaceholder = createSelector(
  selectAppState,
  (state: AppState) => state.cursorChatPlaceholder
);

export const selectCursorUsername = createSelector(
  selectAppState,
  (state: AppState) => state.cursorUsername
);

export const selectActiveViewerCount = createSelector(
  selectAppState,
  (state: AppState) => state.activeViewerCount
);

export const selectCursorColors = createSelector(
  selectAppState,
  (state: AppState) => state.cursorColors
);

export const selectMyId = createSelector(
  selectAppState,
  (state: AppState) => state.myId
);

export const selectIsInitialized = createSelector(
  selectAppState,
  (state: AppState) => state.isInitialized
);

export const selectCursorsVisible = createSelector(
  selectAppState,
  (state: AppState) => state.cursorsVisible
);

export const selectCommandsModalVisible = createSelector(
  selectAppState,
  (state: AppState) => state.commandsModalVisible
);
