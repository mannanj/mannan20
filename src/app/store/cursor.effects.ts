import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { map, catchError, mergeMap, withLatestFrom, filter, tap, take } from 'rxjs/operators';
import { of, combineLatest, fromEvent, EMPTY } from 'rxjs';
import * as CursorActions from './cursor.actions';
import * as CursorSelectors from './cursor.selectors';
import * as AppSelectors from './app.selectors';

@Injectable()
export class CursorEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  loadCursorData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      mergeMap(() =>
        this.http.get<{ usernames: string[]; colors: string[] }>('data/cursor-usernames.json').pipe(
          map(({ usernames, colors }) => {
            const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
            return CursorActions.loadCursorDataSuccess({ username: randomUsername, colors });
          }),
          catchError((error) => {
            console.error('Error loading cursor data:', error);
            return of(CursorActions.loadCursorDataFailure({ error: 'Failed to load cursor data' }));
          })
        )
      )
    )
  );

  cursorDataInitialized$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CursorActions.loadCursorDataSuccess),
      map(() => CursorActions.setCursorDataInitialized())
    )
  );

  syncCursorChatPlaceholder$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectCursorChatPlaceholder).pipe(
      tap(placeholder => {
        (window as any).cursorChatPlaceholder = placeholder;
      })
    );
  }, { dispatch: false });

  syncCursorUsername$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectCursorUsername).pipe(
      tap(username => {
        (window as any).cursorUsername = username;
      })
    );
  }, { dispatch: false });

  syncCursorColors$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectCursorColors).pipe(
      tap(colors => {
        window.dispatchEvent(new CustomEvent('cursorColorsChanged', { detail: colors }));
      })
    );
  }, { dispatch: false });

  syncMyId$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectMyId).pipe(
      tap(myId => {
        (window as any).myId = myId;
      })
    );
  }, { dispatch: false });

  syncCursorsVisible$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectCursorsVisible).pipe(
      tap(visible => {
        (window as any).cursorsVisible = visible;
        window.dispatchEvent(new CustomEvent('cursorsVisibilityChanged', { detail: visible }));
      })
    );
  }, { dispatch: false });

  loadCursorScript$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return combineLatest([
      this.store.select(AppSelectors.selectIsInitialized),
      this.store.select(CursorSelectors.selectCursorUsername),
      this.store.select(CursorSelectors.selectCursorColors)
    ]).pipe(
      filter(([isInitialized]) => isInitialized),
      take(1),
      tap(() => {
        const script = document.createElement('script');
        script.src = 'cursors-p2p.js';
        document.body.appendChild(script);
      })
    );
  }, { dispatch: false });

  listenToCursorPartyConnection$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<boolean>>(window, 'cursorPartyConnected').pipe(
      map(event => CursorActions.setCursorPartyConnected({ connected: event.detail }))
    );
  });

  listenToMyIdAssignment$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<string>>(window, 'cursorPartyIdAssigned').pipe(
      map(event => CursorActions.setMyId({ id: event.detail }))
    );
  });

  listenToCursorSync$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<{ id: string; cursor: any }>>(window, 'cursorPartySync').pipe(
      map(event => CursorActions.receiveCursorSync({ id: event.detail.id, cursor: event.detail.cursor }))
    );
  });

  listenToCursorDisconnect$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<{ id: string }>>(window, 'cursorPartyDisconnect').pipe(
      map(event => CursorActions.receiveCursorDisconnect({ id: event.detail.id }))
    );
  });

  syncCursorsToWindow$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectCursors).pipe(
      tap(cursors => {
        window.dispatchEvent(new CustomEvent('cursorStateChanged', { detail: cursors }));
      })
    );
  }, { dispatch: false });

  syncCursorOrderToWindow$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectCursorOrder).pipe(
      tap(cursorOrder => {
        window.dispatchEvent(new CustomEvent('cursorOrderChanged', { detail: cursorOrder }));
      })
    );
  }, { dispatch: false });

  listenToLocalCursorMove$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<{ x: number; y: number }>>(window, 'localCursorMove').pipe(
      withLatestFrom(this.store.select(CursorSelectors.selectMyId)),
      filter(([, myId]) => myId !== null),
      map(([event, myId]) => CursorActions.updateCursorPosition({ id: myId!, x: event.detail.x, y: event.detail.y }))
    );
  });

  listenToPeerConnecting$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<{ peerId: string }>>(window, 'peerConnecting').pipe(
      map(event => CursorActions.setPeerConnecting({ peerId: event.detail.peerId }))
    );
  });

  listenToPeerConnected$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<{ peerId: string }>>(window, 'peerConnected').pipe(
      map(event => CursorActions.setPeerConnected({ peerId: event.detail.peerId }))
    );
  });

  listenToPeerFailed$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<{ peerId: string; error?: string }>>(window, 'peerFailed').pipe(
      map(event => CursorActions.setPeerFailed({ peerId: event.detail.peerId, error: event.detail.error }))
    );
  });

  listenToConnectionTimeout$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent<CustomEvent<{ peerId: string }>>(window, 'connectionTimeout').pipe(
      map(event => CursorActions.setConnectionTimeout({ peerId: event.detail.peerId }))
    );
  });

  listenToFallbackMode$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent(window, 'fallbackModeEnabled').pipe(
      map(() => CursorActions.enableFallbackMode())
    );
  });

  syncPeerStatesToWindow$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectPeerStates).pipe(
      tap(peerStates => {
        (window as any).peerStates = peerStates;
      })
    );
  }, { dispatch: false });

  syncFallbackModeToWindow$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return this.store.select(CursorSelectors.selectUseFallbackMode).pipe(
      tap(useFallbackMode => {
        (window as any).useFallbackMode = useFallbackMode;
      })
    );
  }, { dispatch: false });
}
