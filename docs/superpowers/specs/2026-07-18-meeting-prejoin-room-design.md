# Meeting Pre-Join Room Design

## Goal

Turn the durable meeting workspace shell into a functional browser pre-join
experience. A participant can inspect their camera, confirm microphone input,
choose available devices, mute either input, and enter a credible meeting
stage. The slice stays independent of a realtime media provider so the later
provider integration does not force a UI rewrite.

## Scope

This slice adds local browser media only. It does not publish audio or video,
claim that another participant is present, create provider rooms or tokens, or
change the existing identity, consent, admission, meeting, or guest lifecycle.
The current meeting workspace remains the authorization boundary: device
access starts only after the workspace has loaded successfully.

The existing dark, restrained visual direction remains intact. The current
meeting title, schedule, and role stay visible, while the placeholder access
card becomes a focused device lobby and meeting stage.

## Experience

An authorized participant first sees a pre-join panel containing:

- a local camera preview with an intentional camera-off state;
- microphone and camera controls with unambiguous on/off labels;
- camera and microphone selectors when more than one device is available;
- a lightweight microphone activity meter;
- a primary **Join meeting** action; and
- concise, recoverable explanations for denied, missing, or unavailable
  devices.

The browser requests camera and microphone independently on first setup so one
missing input does not disable the other. A participant may still join with
either or both inputs disabled. Denying browser permission does not block
entry; the panel explains how to retry and preserves the camera-off
presentation.

After **Join meeting**, the interface transitions to a meeting stage. The local
participant occupies the main tile, with their chosen camera stream when
enabled and a name/initial fallback otherwise. A compact bottom control bar
provides microphone, camera, device-settings, and leave controls. The side rail
shows only truthful information available in this slice: the participant's
role and that they are the only connected browser. Leaving returns to pre-join
and stops all local media tracks.

## Architecture

The implementation is split into three focused units:

1. `useLocalMeetingMedia` owns `getUserMedia`, device enumeration, selected
   device IDs, track replacement, enabled state, the audio activity signal,
   errors, retry, and cleanup.
2. `MeetingPreJoin` renders local setup from that hook's state and emits one
   `join` event. It has no knowledge of meeting persistence or future provider
   APIs.
3. `MeetingStage` renders the joined local state and emits `leave`. Its props
   form the future seam for remote participants and provider connection state.

`MeetingRoom` remains responsible for the existing workspace fetch and entry
flow. Once the durable workspace is available, it chooses between pre-join and
stage without making additional meeting mutations.

The video element receives its `MediaStream` through a ref effect rather than
serializing media into React state. All tracks and audio-analysis resources are
stopped when the participant leaves, retries setup, changes devices, or
unmounts the page.

## State And Data Flow

The local media state is one of `idle`, `requesting`, `ready`, or `error`, with
microphone and camera enabled flags independent from permission state.

1. The authorized workspace loads through the existing same-origin BFF.
2. Pre-join initializes local media in the browser.
3. `navigator.mediaDevices` resolves each requested input independently and
   returns the available input devices.
4. UI controls update local tracks or reacquire only the affected input when a
   device changes.
5. Joining changes only client UI state; it does not imply a remote media
   connection.
6. Leaving or unmounting stops every acquired track and returns to a clean
   pre-join state.

## Failure Handling

- Permission denied: show a plain explanation, keep both inputs off, allow
  retry, and allow joining without devices.
- No camera or microphone: identify the missing input and keep the available
  input usable.
- Device disconnected or acquisition failed: stop stale tracks, return the
  affected input to off, and expose retry without leaving the meeting page.
- Unsupported browser media APIs: render the camera-off fallback and allow
  joining without local devices.
- Workspace authorization failure: preserve the existing unavailable and
  guest-credential behavior; local device access never begins.

## Accessibility And Privacy

Controls use native buttons and labels, expose pressed state, keep visible
focus treatment, and meet touch-target sizing. Status changes are announced
without repeatedly announcing microphone activity. The preview video is
muted, autoplaying, inline, and mirrored only for the local participant.

No media leaves the browser in this slice. No device labels, identifiers,
permission errors, or activity samples are sent to the site or Worker, stored,
or logged.

## Testing

Unit tests cover media acquisition, permission denial, partial-device success,
device switching, track toggles, retry, and cleanup. Component tests cover the
pre-join-to-stage transition, joining without devices, control labels, and
leaving. Playwright stubs browser media devices to verify the authorized room
on desktop and mobile without requesting real machine permissions.

The completion gate is focused tests during development, then the full unit
suite, TypeScript, production build, focused Playwright coverage, visual
inspection, and `git diff --check`.

## Deferred Follow-On

The next slice selects and integrates a realtime provider behind the stage
seam: server-issued room credentials, remote participant presence, published
tracks, moderation, reconnection, and provider-confirmed attendance. Screen
sharing, recording, transcription, chat, reactions, and background effects are
separate later features.
