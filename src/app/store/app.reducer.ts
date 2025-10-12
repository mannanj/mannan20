import { createReducer, on } from '@ngrx/store';
import { AppState } from './app.state';
import { Links } from '../models/models';
import * as AppActions from './app.actions';

export const initialState: AppState = {
  headerText: 'Hello world!',
  selectedLink: Links.home,
  visibleComponent: Links.home
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
  }))
);
