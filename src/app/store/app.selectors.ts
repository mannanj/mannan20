import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectHeaderText = createSelector(
  selectAppState,
  (state: AppState) => state.headerText
);

export const selectSelectedLink = createSelector(
  selectAppState,
  (state: AppState) => state.selectedLink
);

export const selectVisibleComponent = createSelector(
  selectAppState,
  (state: AppState) => state.visibleComponent
);
