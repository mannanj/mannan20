'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MeetingMediaController,
  type MeetingMediaJoinInput,
  type MeetingMediaSdk,
  type MeetingMediaSnapshot,
} from '@/lib/meeting-media-controller';
import { requestMeetingMediaGrant } from '@/lib/meeting-media-grant';
import { createRealtimeKitBrowserSdk } from '@/lib/realtimekit-browser-sdk';
import type { LocalMeetingMediaState } from './use-local-meeting-media';

declare global {
  interface Window {
    __MANNAN_MEETING_MEDIA_SDK__?: MeetingMediaSdk;
  }
}

const INITIAL_SNAPSHOT: MeetingMediaSnapshot = Object.freeze({
  connection: 'idle',
  participants: Object.freeze([]),
  issue: null,
});

function selectedDevice(
  devices: MediaDeviceInfo[],
  selectedId: string,
): MediaDeviceInfo | undefined {
  return devices.find((device) => device.deviceId === selectedId) ?? devices[0];
}

export function meetingMediaJoinInput(
  media: LocalMeetingMediaState,
): MeetingMediaJoinInput {
  const microphone = selectedDevice(media.microphones, media.selectedMicrophoneId);
  const camera = selectedDevice(media.cameras, media.selectedCameraId);
  return {
    ...(microphone ? { microphone } : {}),
    ...(camera ? { camera } : {}),
    microphoneEnabled: media.microphoneEnabled,
    cameraEnabled: media.cameraEnabled,
  };
}

function browserMeetingMediaSdk(): MeetingMediaSdk {
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'production' &&
    window.__MANNAN_MEETING_MEDIA_SDK__
  ) {
    return window.__MANNAN_MEETING_MEDIA_SDK__;
  }
  return createRealtimeKitBrowserSdk();
}

export function useMeetingMediaRoom(input: {
  meetingId: string;
  enabled: boolean;
  media: LocalMeetingMediaState;
}) {
  const mediaRef = useRef(input.media);
  mediaRef.current = input.media;
  const sdk = useMemo(browserMeetingMediaSdk, []);
  const controllerRef = useRef<MeetingMediaController | null>(null);
  const [snapshot, setSnapshot] = useState<MeetingMediaSnapshot>(INITIAL_SNAPSHOT);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');

  useEffect(() => {
    const controller = new MeetingMediaController({
      meetingId: input.meetingId,
      grant: () => requestMeetingMediaGrant(input.meetingId),
      sdk,
      stopPreJoin: () => mediaRef.current.stop(),
    });
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setSnapshot);
    return () => {
      if (controllerRef.current === controller) controllerRef.current = null;
      unsubscribe();
      void controller.dispose();
    };
  }, [input.meetingId, sdk]);

  useEffect(() => {
    if (!input.enabled) void controllerRef.current?.leave();
  }, [input.enabled]);

  const join = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) return;
    const joinInput = meetingMediaJoinInput(mediaRef.current);
    setSelectedMicrophoneId(joinInput.microphone?.deviceId ?? '');
    setSelectedCameraId(joinInput.camera?.deviceId ?? '');
    await controller.join(joinInput);
    if (controller.snapshot().connection === 'failed') {
      await mediaRef.current.retry();
    }
  }, []);

  const leave = useCallback(async () => {
    await controllerRef.current?.leave();
    if (input.enabled) await mediaRef.current.retry();
  }, [input.enabled]);

  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    await controllerRef.current?.setMicrophoneEnabled(enabled);
  }, []);
  const setCameraEnabled = useCallback(async (enabled: boolean) => {
    await controllerRef.current?.setCameraEnabled(enabled);
  }, []);
  const selectMicrophone = useCallback(async (deviceId: string) => {
    const selected = mediaRef.current.microphones.find(
      (device) => device.deviceId === deviceId,
    );
    if (selected) {
      await controllerRef.current?.setDevice(selected);
      setSelectedMicrophoneId(deviceId);
    }
  }, []);
  const selectCamera = useCallback(async (deviceId: string) => {
    const selected = mediaRef.current.cameras.find(
      (device) => device.deviceId === deviceId,
    );
    if (selected) {
      await controllerRef.current?.setDevice(selected);
      setSelectedCameraId(deviceId);
    }
  }, []);

  const localParticipant = snapshot.participants.find(
    (participant) => participant.isLocal,
  );

  return {
    snapshot,
    joining: snapshot.connection === 'connecting',
    join,
    retry: join,
    leave,
    toggleMicrophone: () =>
      void setMicrophoneEnabled(!localParticipant?.audioEnabled),
    toggleCamera: () =>
      void setCameraEnabled(!localParticipant?.videoEnabled),
    selectedMicrophoneId,
    selectedCameraId,
    selectMicrophone,
    selectCamera,
  };
}
