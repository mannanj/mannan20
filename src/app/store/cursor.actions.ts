import { createAction, props } from '@ngrx/store';

export const loadCursorDataSuccess = createAction(
  '[Cursor] Load Cursor Data Success',
  props<{ username: string; colors: string[] }>()
);

export const loadCursorDataFailure = createAction(
  '[Cursor] Load Cursor Data Failure',
  props<{ error: string }>()
);

export const setCursorDataInitialized = createAction('[Cursor] Set Cursor Data Initialized');

export const toggleCursorsVisible = createAction('[Cursor] Toggle Cursors Visible');

export const setCursorPartyConnected = createAction(
  '[Cursor Party] Set Connected',
  props<{ connected: boolean }>()
);

export const setMyId = createAction(
  '[Cursor] Set My ID',
  props<{ id: string }>()
);

export const updateActiveViewerCount = createAction(
  '[Cursor] Update Active Viewer Count',
  props<{ count: number }>()
);

export const addCursor = createAction(
  '[Cursor] Add Cursor',
  props<{ id: string; x: number; y: number; username?: string; country?: string; isLocal?: boolean }>()
);

export const updateCursorPosition = createAction(
  '[Cursor] Update Cursor Position',
  props<{ id: string; x: number; y: number; username?: string }>()
);

export const removeCursor = createAction(
  '[Cursor] Remove Cursor',
  props<{ id: string }>()
);

export const receiveCursorSync = createAction(
  '[Cursor] Receive Cursor Sync',
  props<{ id: string; cursor: { x: number; y: number; username?: string; country?: string } }>()
);

export const receiveCursorDisconnect = createAction(
  '[Cursor] Receive Cursor Disconnect',
  props<{ id: string }>()
);
