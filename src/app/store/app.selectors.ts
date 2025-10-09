import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectHeaderText = createSelector(
  selectAppState,
  (state: AppState) => state.headerText
);
