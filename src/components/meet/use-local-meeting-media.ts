'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  acquireInputTrack,
  acquireLocalMeetingMedia,
  stopTracks,
  type LocalMediaIssue,
} from '@/lib/local-meeting-media';

export interface LocalMeetingMediaState {
  status: 'requesting' | 'ready' | 'error';
  stream: MediaStream | null;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  selectedMicrophoneId: string;
  selectedCameraId: string;
  audioLevel: number;
  issue: LocalMediaIssue | null;
  toggleMicrophone(): void;
  toggleCamera(): void;
  selectMicrophone(deviceId: string): Promise<void>;
  selectCamera(deviceId: string): Promise<void>;
  retry(): Promise<void>;
  stop(): void;
}

function inputIssue(kind: 'audio' | 'video', error: unknown): LocalMediaIssue {
  const name = error instanceof Error || error instanceof DOMException
    ? error.name
    : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      kind: 'permission-denied',
      message: 'Camera or microphone access was blocked. You can retry or join with your devices off.',
    };
  }
  return kind === 'audio'
    ? {
        kind: 'microphone-unavailable',
        message: 'Your microphone is unavailable. You can retry or join muted.',
      }
    : {
        kind: 'camera-unavailable',
        message: 'Your camera is unavailable. You can retry or join with your camera off.',
      };
}

export function useLocalMeetingMedia(active: boolean): LocalMeetingMediaState {
  const generation = useRef(0);
  const audioRef = useRef<MediaStreamTrack | null>(null);
  const videoRef = useRef<MediaStreamTrack | null>(null);
  const [status, setStatus] = useState<'requesting' | 'ready' | 'error'>('requesting');
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [issue, setIssue] = useState<LocalMediaIssue | null>(null);

  const clearTracks = useCallback(() => {
    stopTracks([audioRef.current, videoRef.current]);
    audioRef.current = null;
    videoRef.current = null;
    setAudioTrack(null);
    setVideoTrack(null);
    setMicrophoneEnabled(false);
    setCameraEnabled(false);
    setAudioLevel(0);
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    clearTracks();
  }, [clearTracks]);

  const initialize = useCallback(async () => {
    const requestGeneration = generation.current + 1;
    generation.current = requestGeneration;
    clearTracks();
    setStatus('requesting');
    setIssue(null);

    const result = await acquireLocalMeetingMedia(
      typeof navigator === 'undefined' ? undefined : navigator.mediaDevices,
    );
    if (generation.current !== requestGeneration) {
      stopTracks([result.audioTrack, result.videoTrack]);
      return;
    }

    audioRef.current = result.audioTrack;
    videoRef.current = result.videoTrack;
    setAudioTrack(result.audioTrack);
    setVideoTrack(result.videoTrack);
    setMicrophones(result.microphones);
    setCameras(result.cameras);
    setSelectedMicrophoneId(
      result.audioTrack?.getSettings().deviceId
        ?? result.microphones[0]?.deviceId
        ?? '',
    );
    setSelectedCameraId(
      result.videoTrack?.getSettings().deviceId
        ?? result.cameras[0]?.deviceId
        ?? '',
    );
    setMicrophoneEnabled(Boolean(result.audioTrack));
    setCameraEnabled(Boolean(result.videoTrack));
    setIssue(result.issue);
    setStatus(result.audioTrack || result.videoTrack ? 'ready' : 'error');
  }, [clearTracks]);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    void initialize();
    return stop;
  }, [active, initialize, stop]);

  const selectInput = useCallback(async (
    kind: 'audio' | 'video',
    deviceId: string,
  ) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      const next = await acquireInputTrack(navigator.mediaDevices, kind, deviceId);
      if (kind === 'audio') {
        audioRef.current?.stop();
        audioRef.current = next;
        setAudioTrack(next);
        setSelectedMicrophoneId(deviceId);
        setMicrophoneEnabled(true);
      } else {
        videoRef.current?.stop();
        videoRef.current = next;
        setVideoTrack(next);
        setSelectedCameraId(deviceId);
        setCameraEnabled(true);
      }
      setIssue(null);
      setStatus('ready');
    } catch (error) {
      setIssue(inputIssue(kind, error));
    }
  }, []);

  const selectMicrophone = useCallback(
    (deviceId: string) => selectInput('audio', deviceId),
    [selectInput],
  );
  const selectCamera = useCallback(
    (deviceId: string) => selectInput('video', deviceId),
    [selectInput],
  );

  const toggleMicrophone = useCallback(() => {
    const track = audioRef.current;
    if (!track) {
      void selectMicrophone(selectedMicrophoneId);
      return;
    }
    track.enabled = !track.enabled;
    setMicrophoneEnabled(track.enabled);
    if (!track.enabled) setAudioLevel(0);
  }, [selectMicrophone, selectedMicrophoneId]);

  const toggleCamera = useCallback(() => {
    const track = videoRef.current;
    if (!track) {
      void selectCamera(selectedCameraId);
      return;
    }
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }, [selectCamera, selectedCameraId]);

  const stream = useMemo(() => {
    if (typeof MediaStream === 'undefined') return null;
    return new MediaStream(
      [audioTrack, videoTrack].filter(
        (track): track is MediaStreamTrack => track !== null,
      ),
    );
  }, [audioTrack, videoTrack]);

  useEffect(() => {
    if (
      !active
      || !audioTrack
      || !microphoneEnabled
      || typeof window === 'undefined'
      || !window.AudioContext
    ) {
      setAudioLevel(0);
      return;
    }

    const context = new window.AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const meterStream = new MediaStream([audioTrack]);
    const source = context.createMediaStreamSource(meterStream);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    let frame = 0;

    const sample = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) {
        const normalized = (value - 128) / 128;
        sum += normalized * normalized;
      }
      setAudioLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
      frame = window.requestAnimationFrame(sample);
    };
    frame = window.requestAnimationFrame(sample);

    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      void context.close();
      setAudioLevel(0);
    };
  }, [active, audioTrack, microphoneEnabled]);

  return {
    status,
    stream,
    audioTrack,
    videoTrack,
    microphones,
    cameras,
    microphoneEnabled,
    cameraEnabled,
    selectedMicrophoneId,
    selectedCameraId,
    audioLevel,
    issue,
    toggleMicrophone,
    toggleCamera,
    selectMicrophone,
    selectCamera,
    retry: initialize,
    stop,
  };
}

