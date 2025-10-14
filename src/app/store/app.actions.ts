import { createAction, props } from '@ngrx/store';
import { Links, AboutData, Metadata } from '../models/models';

export const setSelectedLink = createAction(
  '[Navigation] Set Selected Link',
  props<{ link: Links }>()
);

export const loadAboutData = createAction('[About] Load About Data');

export const loadAboutDataSuccess = createAction(
  '[About] Load About Data Success',
  props<{ data: AboutData }>()
);

export const loadAboutDataFailure = createAction(
  '[About] Load About Data Failure',
  props<{ error: string }>()
);

export const loadMetadataSuccess = createAction(
  '[Metadata] Load Metadata Success',
  props<{ metadata: Metadata }>()
);

export const loadMetadataFailure = createAction(
  '[Metadata] Load Metadata Failure',
  props<{ error: string }>()
);

export const loadCursorUsernameSuccess = createAction(
  '[Cursor] Load Cursor Username Success',
  props<{ username: string }>()
);

export const loadCursorUsernameFailure = createAction(
  '[Cursor] Load Cursor Username Failure',
  props<{ error: string }>()
);

export const updateActiveViewerCount = createAction(
  '[Cursor] Update Active Viewer Count',
  props<{ count: number }>()
);

export const setMyId = createAction(
  '[Cursor] Set My ID',
  props<{ id: string }>()
);

export const setAppInitialized = createAction('[App] Set App Initialized');
