import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CursorState } from '../models/models';

export const selectCursorState = createFeatureSelector<CursorState>('cursor');

export const selectCursorChatPlaceholder = createSelector(
  selectCursorState,
  (state: CursorState) => state.cursorChatPlaceholder
);

export const selectCursorUsername = createSelector(
  selectCursorState,
  (state: CursorState) => state.cursorUsername
);

export const selectActiveViewerCount = createSelector(
  selectCursorState,
  (state: CursorState) => state.activeViewerCount
);

export const selectCursorColors = createSelector(
  selectCursorState,
  (state: CursorState) => state.cursorColors
);

export const selectMyId = createSelector(
  selectCursorState,
  (state: CursorState) => state.myId
);

export const selectCursorsVisible = createSelector(
  selectCursorState,
  (state: CursorState) => state.cursorsVisible
);

export const selectIsCursorPartyConnected = createSelector(
  selectCursorState,
  (state: CursorState) => state.isCursorPartyConnected
);

export const selectCursors = createSelector(
  selectCursorState,
  (state: CursorState) => state.cursors
);

export const selectCursorOrder = createSelector(
  selectCursorState,
  (state: CursorState) => state.cursorOrder
);

export const selectPeerStates = createSelector(
  selectCursorState,
  (state: CursorState) => state.peerStates
);

export const selectUseFallbackMode = createSelector(
  selectCursorState,
  (state: CursorState) => state.useFallbackMode
);

export const selectConnectedPeers = createSelector(
  selectPeerStates,
  (peerStates) => Object.values(peerStates).filter(peer => peer.status === 'connected')
);

export const selectFailedPeers = createSelector(
  selectPeerStates,
  (peerStates) => Object.values(peerStates).filter(peer => peer.status === 'failed' || peer.status === 'timeout')
);

export const selectConnectingPeers = createSelector(
  selectPeerStates,
  (peerStates) => Object.values(peerStates).filter(peer => peer.status === 'connecting')
);

export const selectPeerConnectionCount = createSelector(
  selectConnectedPeers,
  (connectedPeers) => connectedPeers.length
);
