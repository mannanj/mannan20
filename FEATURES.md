# Features Backlog

## Upcoming Features

- Secret Handshake Access System
  - Add handshake emoji button to screen (always visible)
  - Opens modal using existing modal component
  - Modal displays: "enter the passcodes or secret handshakes"
  - Text area input for entering passcode/secret phrase
  - Button labeled "make the handshake" triggers submission
  - Mock network request with 1.5 second delay
  - NgRx state management:
    - Action: `submitHandshake` with phrase payload
    - Action: `setHandshakeStatus` to update state
    - Reducer: sets `handshakeStatus` to true/false
    - Effect: handles mock network request, dispatches status update
    - Console logs handshake status for debugging
  - Future: Unlock special portions of site based on handshake success
  - Future: Real API endpoint for validating handshakes

- Move cursor username management to server-side
  - Currently usernames are assigned randomly on the client
  - Server should assign and track usernames for each connection
  - Ensures consistent usernames across reconnections
  - Prevents username conflicts
