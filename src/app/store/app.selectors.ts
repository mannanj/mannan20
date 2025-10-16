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

export const selectIsInitialized = createSelector(
  selectAppState,
  (state: AppState) => state.isInitialized
);

export const selectCommandsModalVisible = createSelector(
  selectAppState,
  (state: AppState) => state.commandsModalVisible
);

export const selectDevCommits = createSelector(
  selectAppState,
  (state: AppState) => state.devCommits
);

export const selectTasks = createSelector(
  selectAppState,
  (state: AppState) => state.tasks
);

export const selectContactModalOpen = createSelector(
  selectAppState,
  (state: AppState) => state.contactModalOpen
);

export const selectContactShowResult = createSelector(
  selectAppState,
  (state: AppState) => state.contactShowResult
);

export const selectContactResult = createSelector(
  selectAppState,
  (state: AppState) => state.contactResult
);

export const selectDevStatsModalOpen = createSelector(
  selectAppState,
  (state: AppState) => state.devStatsModalOpen
);

export const selectDevStatsActiveTab = createSelector(
  selectAppState,
  (state: AppState) => state.devStatsActiveTab
);
