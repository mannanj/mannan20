import { createAction, props } from '@ngrx/store';
import { Links, AboutData, Metadata, DevCommit, Task, ContactResult } from '../models/models';

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

export const setAppInitialized = createAction('[App] Set App Initialized');

export const toggleCommandsModal = createAction('[Commands] Toggle Commands Modal');

export const loadDevCommitsSuccess = createAction(
  '[Dev] Load Dev Commits Success',
  props<{ commits: DevCommit[] }>()
);

export const loadTasksSuccess = createAction(
  '[Tasks] Load Tasks Success',
  props<{ tasks: Task[] }>()
);

export const openContactModal = createAction('[Contact] Open Contact Modal');

export const closeContactModal = createAction('[Contact] Close Contact Modal');

export const setContactResult = createAction(
  '[Contact] Set Contact Result',
  props<{ result: ContactResult }>()
);

export const toggleDevStatsModal = createAction('[DevStats] Toggle DevStats Modal');

export const setDevStatsTab = createAction(
  '[DevStats] Set DevStats Tab',
  props<{ tab: 'commits' | 'services' | 'tasks' }>()
);

export const toggleSnakeEyes = createAction('[SnakeEyes] Toggle Snake Eyes');
