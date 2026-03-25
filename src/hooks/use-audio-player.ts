'use client';

import { useReducer, useRef, useCallback, useEffect } from 'react';
import { Howl } from 'howler';
import { MANIFESTO_CHUNKS } from '@/lib/audio-config';
import { getAudioChunk, storeAudioChunk } from '@/lib/audio-storage';

interface State {
  isPlaying: boolean;
  currentChunk: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  isVisible: boolean;
}

type Action =
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CHUNK'; payload: number }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VISIBLE'; payload: boolean };

const CHUNK_DURATIONS: number[] = [];

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PLAYING': return { ...state, isPlaying: action.payload };
    case 'SET_CHUNK': return { ...state, currentChunk: action.payload };
    case 'SET_TIME': return { ...state, currentTime: action.payload };
    case 'SET_DURATION': return { ...state, duration: action.payload };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_VISIBLE': return { ...state, isVisible: action.payload };
    default: return state;
  }
}

const initialState: State = {
  isPlaying: false,
  currentChunk: 0,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  isVisible: false,
};

export function useAudioPlayer() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const howlRef = useRef<Howl | null>(null);
  const rafRef = useRef<number>(0);
  const objectUrlRef = useRef<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadIdRef = useRef(0);

  const destroyHowl = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (howlRef.current) {
      howlRef.current.off();
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const updateProgress = useCallback(() => {
    const howl = howlRef.current;
    if (howl && howl.playing()) {
      dispatch({ type: 'SET_TIME', payload: howl.seek() as number });
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const loadAndPlay = useCallback(async (chunkIndex: number) => {
    destroyHowl();

    const thisLoadId = ++loadIdRef.current;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_CHUNK', payload: chunkIndex });
    dispatch({ type: 'SET_TIME', payload: 0 });
    dispatch({ type: 'SET_PLAYING', payload: false });

    const chunk = MANIFESTO_CHUNKS[chunkIndex];
    let src = chunk.url;

    const cached = await getAudioChunk(chunk.key);

    if (loadIdRef.current !== thisLoadId) return;

    if (cached) {
      objectUrlRef.current = URL.createObjectURL(cached);
      src = objectUrlRef.current;
    }

    const howl = new Howl({
      src: [src],
      html5: true,
      preload: true,
      format: ['wav'],
      onload: () => {
        if (loadIdRef.current !== thisLoadId) return;
        const dur = howl.duration();
        dispatch({ type: 'SET_DURATION', payload: dur });
        CHUNK_DURATIONS[chunkIndex] = dur;
        dispatch({ type: 'SET_LOADING', payload: false });
      },
      onplay: () => {
        if (loadIdRef.current !== thisLoadId) return;
        dispatch({ type: 'SET_PLAYING', payload: true });
        rafRef.current = requestAnimationFrame(updateProgress);
      },
      onpause: () => {
        if (loadIdRef.current !== thisLoadId) return;
        dispatch({ type: 'SET_PLAYING', payload: false });
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      },
      onstop: () => {
        if (loadIdRef.current !== thisLoadId) return;
        dispatch({ type: 'SET_PLAYING', payload: false });
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      },
      onend: () => {
        if (loadIdRef.current !== thisLoadId) return;
        dispatch({ type: 'SET_PLAYING', payload: false });
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (chunkIndex < MANIFESTO_CHUNKS.length - 1) {
          advanceTimerRef.current = setTimeout(() => {
            if (loadIdRef.current !== thisLoadId) return;
            loadAndPlay(chunkIndex + 1);
          }, 1000);
        }
      },
      onloaderror: () => {
        if (loadIdRef.current !== thisLoadId) return;
        dispatch({ type: 'SET_LOADING', payload: false });
      },
    });

    howlRef.current = howl;
    howl.play();

    if (!cached) {
      fetch(chunk.url)
        .then((res) => res.blob())
        .then((blob) => storeAudioChunk(chunk.key, blob))
        .catch(() => {});
    }
  }, [destroyHowl, updateProgress]);

  const toggle = useCallback(() => {
    const howl = howlRef.current;
    if (!howl) {
      loadAndPlay(state.currentChunk);
      return;
    }
    if (howl.playing()) {
      howl.pause();
    } else {
      howl.play();
    }
  }, [state.currentChunk, loadAndPlay]);

  const seekTo = useCallback((fraction: number) => {
    const howl = howlRef.current;
    if (!howl) return;
    const time = fraction * (howl.duration() || 0);
    howl.seek(time);
    dispatch({ type: 'SET_TIME', payload: time });
  }, []);

  const goToChunk = useCallback((index: number) => {
    loadAndPlay(index);
  }, [loadAndPlay]);

  const open = useCallback(() => {
    dispatch({ type: 'SET_VISIBLE', payload: true });
    if (!howlRef.current) {
      loadAndPlay(0);
    }
  }, [loadAndPlay]);

  const close = useCallback(() => {
    destroyHowl();
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_VISIBLE', payload: false });
  }, [destroyHowl]);

  useEffect(() => {
    return () => {
      loadIdRef.current++;
      destroyHowl();
    };
  }, [destroyHowl]);

  const totalDuration = CHUNK_DURATIONS.reduce((a, b) => a + (b || 0), 0) || state.duration * MANIFESTO_CHUNKS.length;
  const elapsedBefore = CHUNK_DURATIONS.slice(0, state.currentChunk).reduce((a, b) => a + (b || 0), 0);
  const totalElapsed = elapsedBefore + state.currentTime;

  return {
    ...state,
    totalElapsed,
    totalDuration,
    toggle,
    seekTo,
    goToChunk,
    open,
    close,
  };
}
