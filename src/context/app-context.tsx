'use client';

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Section, ContactResultData } from '@/lib/types';

const COOKIE_NAME = 'contact_revealed';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface AppState {
  activeSection: Section;
  contactModalOpen: boolean;
  contactShowResult: boolean;
  contactResult: ContactResultData | null;
  contactRevealed: boolean;
  commandsModalOpen: boolean;
}

type AppAction =
  | { type: 'SET_ACTIVE_SECTION'; section: Section }
  | { type: 'OPEN_CONTACT_MODAL' }
  | { type: 'CLOSE_CONTACT_MODAL' }
  | { type: 'SET_CONTACT_RESULT'; result: ContactResultData }
  | { type: 'REVEAL_CONTACT' }
  | { type: 'TOGGLE_COMMANDS_MODAL' };

const initialState: AppState = {
  activeSection: 'home',
  contactModalOpen: false,
  contactShowResult: false,
  contactResult: null,
  contactRevealed: false,
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
      return { ...state, contactShowResult: true, contactResult: action.result, contactRevealed: true };
    case 'REVEAL_CONTACT':
      return { ...state, contactRevealed: true };
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

  useEffect(() => {
    if (document.cookie.split(';').some(c => c.trim().startsWith(`${COOKIE_NAME}=`))) {
      dispatch({ type: 'REVEAL_CONTACT' });
    }
  }, []);

  const value: AppContextValue = {
    state,
    setActiveSection: (section) => dispatch({ type: 'SET_ACTIVE_SECTION', section }),
    openContactModal: () => dispatch({ type: 'OPEN_CONTACT_MODAL' }),
    closeContactModal: () => dispatch({ type: 'CLOSE_CONTACT_MODAL' }),
    setContactResult: (result) => {
      document.cookie = `${COOKIE_NAME}=1;path=/;max-age=${COOKIE_MAX_AGE_SECONDS};SameSite=Lax`;
      dispatch({ type: 'SET_CONTACT_RESULT', result });
    },
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
