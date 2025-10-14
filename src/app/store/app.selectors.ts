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
