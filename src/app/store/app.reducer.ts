import { createReducer, on } from '@ngrx/store';
import { AppState } from './app.state';
import * as AppActions from './app.actions';

export const initialState: AppState = {
  headerText: 'Hello world!'
};

export const appReducer = createReducer(
  initialState,
  on(AppActions.setHeaderText, (state, { text }) => ({
    ...state,
    headerText: text
  }))
);
