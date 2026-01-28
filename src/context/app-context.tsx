'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Section, ContactResultData } from '@/lib/types';

interface AppState {
  activeSection: Section;
  contactModalOpen: boolean;
  contactShowResult: boolean;
  contactResult: ContactResultData | null;
  commandsModalOpen: boolean;
}

type AppAction =
  | { type: 'SET_ACTIVE_SECTION'; section: Section }
  | { type: 'OPEN_CONTACT_MODAL' }
  | { type: 'CLOSE_CONTACT_MODAL' }
  | { type: 'SET_CONTACT_RESULT'; result: ContactResultData }
  | { type: 'TOGGLE_COMMANDS_MODAL' };

const initialState: AppState = {
  activeSection: 'home',
  contactModalOpen: false,
  contactShowResult: false,
  contactResult: null,
  commandsModalOpen: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: action.section };
    case 'OPEN_CONTACT_MODAL':
      return { ...state, contactModalOpen: true };
    case 'CLOSE_CONTACT_MODAL':
      return { ...state, contactModalOpen: false, contactShowResult: false, contactResult: null };
    case 'SET_CONTACT_RESULT':
      return { ...state, contactShowResult: true, contactResult: action.result };
    case 'TOGGLE_COMMANDS_MODAL':
      return { ...state, commandsModalOpen: !state.commandsModalOpen };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setActiveSection: (section: Section) => void;
  openContactModal: () => void;
  closeContactModal: () => void;
  setContactResult: (result: ContactResultData) => void;
  toggleCommandsModal: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value: AppContextValue = {
    state,
    setActiveSection: (section) => dispatch({ type: 'SET_ACTIVE_SECTION', section }),
    openContactModal: () => dispatch({ type: 'OPEN_CONTACT_MODAL' }),
    closeContactModal: () => dispatch({ type: 'CLOSE_CONTACT_MODAL' }),
    setContactResult: (result) => dispatch({ type: 'SET_CONTACT_RESULT', result }),
    toggleCommandsModal: () => dispatch({ type: 'TOGGLE_COMMANDS_MODAL' }),
  };

  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
