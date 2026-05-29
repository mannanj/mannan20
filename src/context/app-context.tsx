'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Section, ContactResultData } from '@/lib/types';

const COOKIE_NAME = 'contact_revealed';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface AppState {
  activeSection: Section;
  contactModalOpen: boolean;
  contactShowResult: boolean;
  contactResult: ContactResultData | null;
  contactRevealed: boolean;
  contactUserInput: string;
  contactPopoutPosition: { x: number; y: number } | null;
  commandsModalOpen: boolean;
}

type AppAction =
  | { type: 'SET_ACTIVE_SECTION'; section: Section }
  | { type: 'OPEN_CONTACT_MODAL'; position: { x: number; y: number } }
  | { type: 'CLOSE_CONTACT_MODAL' }
  | { type: 'SET_CONTACT_RESULT'; result: ContactResultData }
  | { type: 'SET_CONTACT_USER_INPUT'; value: string }
  | { type: 'REVEAL_CONTACT' }
  | { type: 'TOGGLE_COMMANDS_MODAL' };

const initialState: AppState = {
  activeSection: 'home',
  contactModalOpen: false,
  contactShowResult: false,
  contactResult: null,
  contactRevealed: false,
  contactUserInput: '',
  contactPopoutPosition: null,
  commandsModalOpen: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_SECTION':
      if (state.activeSection === action.section) return state;
      return { ...state, activeSection: action.section };
    case 'OPEN_CONTACT_MODAL':
      return { ...state, contactModalOpen: true, contactPopoutPosition: action.position };
    case 'CLOSE_CONTACT_MODAL':
      return { ...state, contactModalOpen: false, contactShowResult: false, contactResult: null };
    case 'SET_CONTACT_RESULT':
      return { ...state, contactShowResult: true, contactResult: action.result, contactRevealed: true, contactUserInput: '' };
    case 'SET_CONTACT_USER_INPUT':
      return { ...state, contactUserInput: action.value };
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
  openContactModal: (x: number, y: number) => void;
  closeContactModal: () => void;
  setContactResult: (result: ContactResultData) => void;
  setContactUserInput: (value: string) => void;
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

  const setActiveSection = useCallback((section: Section) => dispatch({ type: 'SET_ACTIVE_SECTION', section }), []);
  const openContactModal = useCallback((x: number, y: number) => dispatch({ type: 'OPEN_CONTACT_MODAL', position: { x, y } }), []);
  const closeContactModal = useCallback(() => dispatch({ type: 'CLOSE_CONTACT_MODAL' }), []);
  const setContactResult = useCallback((result: ContactResultData) => {
    document.cookie = `${COOKIE_NAME}=1;path=/;max-age=${COOKIE_MAX_AGE_SECONDS};SameSite=Lax`;
    dispatch({ type: 'SET_CONTACT_RESULT', result });
  }, []);
  const setContactUserInput = useCallback((value: string) => dispatch({ type: 'SET_CONTACT_USER_INPUT', value }), []);
  const toggleCommandsModal = useCallback(() => dispatch({ type: 'TOGGLE_COMMANDS_MODAL' }), []);

  const value: AppContextValue = useMemo(() => ({
    state,
    setActiveSection,
    openContactModal,
    closeContactModal,
    setContactResult,
    setContactUserInput,
    toggleCommandsModal,
  }), [state, setActiveSection, openContactModal, closeContactModal, setContactResult, setContactUserInput, toggleCommandsModal]);

  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    return {
      state: { ...initialState },
      setActiveSection: () => {},
      openContactModal: () => {},
      closeContactModal: () => {},
      setContactResult: () => {},
      setContactUserInput: () => {},
      toggleCommandsModal: () => {},
    };
  }
  return context;
}
