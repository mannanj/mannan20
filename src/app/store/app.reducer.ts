import { createReducer, on } from '@ngrx/store';
import { AppState, Links } from '../models/models';
import * as AppActions from './app.actions';

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#F67280',
  '#C06C84', '#6C5B7B', '#355C7D', '#99B898', '#FECEAB', '#FF847C', '#E84A5F', '#2A363B', '#A8E6CF', '#FFD3B6',
  '#FFAAA5', '#FF8B94', '#A8DADC', '#457B9D', '#1D3557', '#E63946', '#F1FAEE', '#A8E6CE', '#DCEDC2', '#FFD3B5',
  '#FFAAA6', '#FF8C94', '#F38181', '#AA96DA', '#FCBAD3', '#FFFFD2', '#A0CED9', '#ADF7B6', '#FFC09F', '#FFEE93',
  '#FCF5C7', '#B4E7CE', '#7FCDCD', '#ECA1A6', '#BDCEBE', '#ADA397', '#D4A5A5', '#FFCCB6', '#83AF9B', '#C8C8A9',
  '#FC9D9A', '#F9CDAD', '#C8C8A9', '#83AF9B', '#ECEAE4', '#A2E1DB', '#55CBCD', '#EEEEFF', '#EFC3E6', '#F0B8B8',
  '#BAE1FF', '#FFB7B7', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB',
  '#B5EAD7', '#C7CEEA', '#A0E7E5', '#B4F8C8', '#FBE7C6', '#FFAEBC', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC',
  '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FDFFB6', '#FFD6A5', '#FFADAD', '#FFC9DE', '#CAFFBF',
  '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#F28482', '#F5CAC3', '#F6BD60', '#F7EDE2', '#F5CAC3', '#84A59D'
];

export const initialState: AppState = {
  selectedLink: Links.home,
  aboutData: null,
  metadata: null,
  cursorChatPlaceholder: 'say hello to your friend',
  cursorUsername: 'happy possum',
  activeViewerCount: 0,
  cursorColors: CURSOR_COLORS,
  myId: null,
  isInitialized: false
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
  })),
  on(AppActions.loadMetadataSuccess, (state, { metadata }) => ({
    ...state,
    metadata
  })),
  on(AppActions.loadCursorUsernameSuccess, (state, { username }) => ({
    ...state,
    cursorUsername: username
  })),
  on(AppActions.updateActiveViewerCount, (state, { count }) => ({
    ...state,
    activeViewerCount: count
  })),
  on(AppActions.setMyId, (state, { id }) => ({
    ...state,
    myId: id
  })),
  on(AppActions.setAppInitialized, (state) => ({
    ...state,
    isInitialized: true
  }))
);
