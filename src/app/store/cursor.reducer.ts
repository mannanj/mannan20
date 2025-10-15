import { createReducer, on } from '@ngrx/store';
import { CursorState } from '../models/models';
import * as CursorActions from './cursor.actions';

export const initialState: CursorState = {
  cursorChatPlaceholder: 'say hello to your friend',
  cursorUsername: 'happy possum',
  activeViewerCount: 0,
  cursorColors: [],
  myId: null,
  cursorsVisible: true,
  isCursorPartyConnected: false,
  cursors: {},
  cursorOrder: []
};

export const cursorReducer = createReducer(
  initialState,
  on(CursorActions.loadCursorDataSuccess, (state, { username, colors }) => ({
    ...state,
    cursorUsername: username,
    cursorColors: colors
  })),
  on(CursorActions.toggleCursorsVisible, (state) => ({
    ...state,
    cursorsVisible: !state.cursorsVisible
  })),
  on(CursorActions.setCursorPartyConnected, (state, { connected }) => ({
    ...state,
    isCursorPartyConnected: connected
  })),
  on(CursorActions.setMyId, (state, { id }) => {
    const cursorOrder = state.cursorOrder.includes(id) ? state.cursorOrder : [...state.cursorOrder, id];
    const colorIndex = cursorOrder.indexOf(id) % state.cursorColors.length;
    const color = state.cursorColors[colorIndex];

    return {
      ...state,
      myId: id,
      cursors: {
        ...state.cursors,
        [id]: { id, x: 0, y: 0, username: state.cursorUsername, color, isLocal: true }
      },
      cursorOrder,
      activeViewerCount: Object.keys({ ...state.cursors, [id]: true }).length
    };
  }),
  on(CursorActions.updateActiveViewerCount, (state, { count }) => ({
    ...state,
    activeViewerCount: count
  })),
  on(CursorActions.addCursor, (state, { id, x, y, username, country, isLocal = false }) => {
    const cursorOrder = state.cursorOrder.includes(id) ? state.cursorOrder : [...state.cursorOrder, id];
    const colorIndex = cursorOrder.indexOf(id) % state.cursorColors.length;
    const color = state.cursorColors[colorIndex];

    return {
      ...state,
      cursors: {
        ...state.cursors,
        [id]: { id, x, y, username, country, color, isLocal }
      },
      cursorOrder,
      activeViewerCount: Object.keys({ ...state.cursors, [id]: true }).length
    };
  }),
  on(CursorActions.updateCursorPosition, (state, { id, x, y, username }) => {
    if (!state.cursors[id]) {
      return state;
    }
    return {
      ...state,
      cursors: {
        ...state.cursors,
        [id]: { ...state.cursors[id], x, y, username: username ?? state.cursors[id].username }
      }
    };
  }),
  on(CursorActions.removeCursor, (state, { id }) => {
    const { [id]: removed, ...remainingCursors } = state.cursors;
    return {
      ...state,
      cursors: remainingCursors,
      activeViewerCount: Object.keys(remainingCursors).length
    };
  }),
  on(CursorActions.receiveCursorSync, (state, { id, cursor }) => {
    if (id === state.myId) {
      return state;
    }

    if (!state.cursors[id]) {
      const cursorOrder = state.cursorOrder.includes(id) ? state.cursorOrder : [...state.cursorOrder, id];
      const colorIndex = cursorOrder.indexOf(id) % state.cursorColors.length;
      const color = state.cursorColors[colorIndex];

      return {
        ...state,
        cursors: {
          ...state.cursors,
          [id]: { id, x: cursor.x, y: cursor.y, username: cursor.username, country: cursor.country, color, isLocal: false }
        },
        cursorOrder,
        activeViewerCount: Object.keys({ ...state.cursors, [id]: true }).length
      };
    }

    return {
      ...state,
      cursors: {
        ...state.cursors,
        [id]: { ...state.cursors[id], x: cursor.x, y: cursor.y, username: cursor.username ?? state.cursors[id].username }
      }
    };
  }),
  on(CursorActions.receiveCursorDisconnect, (state, { id }) => {
    const { [id]: removed, ...remainingCursors } = state.cursors;
    return {
      ...state,
      cursors: remainingCursors,
      activeViewerCount: Object.keys(remainingCursors).length
    };
  })
);
