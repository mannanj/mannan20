export type LocalMediaIssueKind =
  | 'unsupported'
  | 'permission-denied'
  | 'microphone-unavailable'
  | 'camera-unavailable'
  | 'devices-unavailable';

export interface LocalMediaIssue {
  kind: LocalMediaIssueKind;
  message: string;
}

export interface LocalMediaAcquisition {
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  issue: LocalMediaIssue | null;
}

type InputKind = 'audio' | 'video';

const ISSUE_MESSAGES: Record<LocalMediaIssueKind, string> = {
  unsupported: 'This browser cannot open camera or microphone devices.',
  'permission-denied': 'Camera or microphone access was blocked. You can retry or join with your devices off.',
  'microphone-unavailable': 'Your microphone is unavailable. You can retry or join muted.',
  'camera-unavailable': 'Your camera is unavailable. You can retry or join with your camera off.',
  'devices-unavailable': 'Camera and microphone devices are unavailable. You can retry or join without them.',
};

function issue(kind: LocalMediaIssueKind): LocalMediaIssue {
  return { kind, message: ISSUE_MESSAGES[kind] };
}

function errorName(reason: unknown): string {
  return reason instanceof Error || reason instanceof DOMException
    ? reason.name
    : '';
}

function failedIssue(
  audioResult: PromiseSettledResult<MediaStream>,
  videoResult: PromiseSettledResult<MediaStream>,
): LocalMediaIssue | null {
  const audioFailed = audioResult.status === 'rejected';
  const videoFailed = videoResult.status === 'rejected';
  if (!audioFailed && !videoFailed) return null;

  const names = [
    audioFailed ? errorName(audioResult.reason) : '',
    videoFailed ? errorName(videoResult.reason) : '',
  ];
  if (names.some((name) => name === 'NotAllowedError' || name === 'SecurityError')) {
    return issue('permission-denied');
  }
  if (audioFailed && videoFailed) return issue('devices-unavailable');
  return issue(audioFailed ? 'microphone-unavailable' : 'camera-unavailable');
}

function requestedTrack(
  result: PromiseSettledResult<MediaStream>,
  kind: InputKind,
): MediaStreamTrack | null {
  if (result.status === 'rejected') return null;
  const tracks = result.value.getTracks();
  const selected = tracks.find((track) => track.kind === kind) ?? null;
  stopTracks(tracks.filter((track) => track !== selected));
  return selected;
}

export function stopTracks(
  tracks: Array<MediaStreamTrack | null | undefined>,
): void {
  for (const track of tracks) track?.stop();
}

export async function acquireInputTrack(
  mediaDevices: MediaDevices,
  kind: InputKind,
  deviceId?: string,
): Promise<MediaStreamTrack> {
  const requestedInput = deviceId ? { deviceId: { exact: deviceId } } : true;
  const stream = await mediaDevices.getUserMedia({
    audio: kind === 'audio' ? requestedInput : false,
    video: kind === 'video' ? requestedInput : false,
  });
  const tracks = stream.getTracks();
  const selected = tracks.find((track) => track.kind === kind);
  stopTracks(tracks.filter((track) => track !== selected));
  if (!selected) {
    throw new DOMException(
      `The requested ${kind} input did not return a track.`,
      'NotFoundError',
    );
  }
  return selected;
}

export async function acquireLocalMeetingMedia(
  mediaDevices: MediaDevices | undefined,
): Promise<LocalMediaAcquisition> {
  if (!mediaDevices?.getUserMedia) {
    return {
      audioTrack: null,
      videoTrack: null,
      microphones: [],
      cameras: [],
      issue: issue('unsupported'),
    };
  }

  const [audioResult, videoResult] = await Promise.allSettled([
    mediaDevices.getUserMedia({ audio: true, video: false }),
    mediaDevices.getUserMedia({ audio: false, video: true }),
  ]);
  const audioTrack = requestedTrack(audioResult, 'audio');
  const videoTrack = requestedTrack(videoResult, 'video');

  let devices: MediaDeviceInfo[] = [];
  let deviceIssue: LocalMediaIssue | null = null;
  try {
    devices = await mediaDevices.enumerateDevices();
  } catch {
    deviceIssue = issue('devices-unavailable');
  }

  return {
    audioTrack,
    videoTrack,
    microphones: devices.filter((device) => device.kind === 'audioinput'),
    cameras: devices.filter((device) => device.kind === 'videoinput'),
    issue: failedIssue(audioResult, videoResult) ?? deviceIssue,
  };
}
