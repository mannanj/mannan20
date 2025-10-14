import { createReducer, on } from '@ngrx/store';
import { AppState, Links } from '../models/models';
import * as AppActions from './app.actions';

export const initialState: AppState = {
  selectedLink: Links.home,
  aboutData: null
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
  }))
);
