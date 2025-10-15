import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { map, catchError, mergeMap, withLatestFrom, filter, tap, take } from 'rxjs/operators';
import { of, combineLatest, fromEvent } from 'rxjs';
import * as AppActions from './app.actions';
import * as AppSelectors from './app.selectors';
import * as CursorActions from './cursor.actions';
import * as CursorSelectors from './cursor.selectors';
import { AboutData, Metadata } from '../models/models';

@Injectable()
export class AppEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private http = inject(HttpClient);

  loadAboutData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      mergeMap(() =>
        this.http.get<AboutData>('data/about.json').pipe(
          map(data => AppActions.loadAboutDataSuccess({ data })),
          catchError((error) => {
            console.error('Error loading about data:', error);
            return of(AppActions.loadAboutDataFailure({ error: 'Failed to load about data' }));
          })
        )
      )
    )
  );

  loadMetadata$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      mergeMap(() =>
        this.http.get<Metadata>('data/metadata.json').pipe(
          map(metadata => AppActions.loadMetadataSuccess({ metadata })),
          catchError((error) => {
            console.error('Error loading metadata:', error);
            return of(AppActions.loadMetadataFailure({ error: 'Failed to load metadata' }));
          })
        )
      )
    )
  );

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

  setAppInitialized$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.loadAboutDataSuccess, AppActions.loadMetadataSuccess),
      withLatestFrom(
        this.store.select(AppSelectors.selectAboutData),
        this.store.select(AppSelectors.selectMetadata)
      ),
      filter(([, aboutData, metadata]) => aboutData !== null && metadata !== null),
      map(() => AppActions.setAppInitialized())
    )
  );

  cursorDataInitialized$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CursorActions.loadCursorDataSuccess),
      map(() => CursorActions.setCursorDataInitialized())
    )
  );

  syncCursorChatPlaceholder$ = createEffect(() =>
    this.store.select(CursorSelectors.selectCursorChatPlaceholder).pipe(
      tap(placeholder => {
        (window as any).cursorChatPlaceholder = placeholder;
      })
    ),
    { dispatch: false }
  );

  syncCursorUsername$ = createEffect(() =>
    this.store.select(CursorSelectors.selectCursorUsername).pipe(
      tap(username => {
        (window as any).cursorUsername = username;
      })
    ),
    { dispatch: false }
  );

  syncCursorColors$ = createEffect(() =>
    this.store.select(CursorSelectors.selectCursorColors).pipe(
      tap(colors => {
        window.dispatchEvent(new CustomEvent('cursorColorsChanged', { detail: colors }));
      })
    ),
    { dispatch: false }
  );

  syncMyId$ = createEffect(() =>
    this.store.select(CursorSelectors.selectMyId).pipe(
      tap(myId => {
        (window as any).myId = myId;
      })
    ),
    { dispatch: false }
  );

  syncCursorsVisible$ = createEffect(() =>
    this.store.select(CursorSelectors.selectCursorsVisible).pipe(
      tap(visible => {
        (window as any).cursorsVisible = visible;
        window.dispatchEvent(new CustomEvent('cursorsVisibilityChanged', { detail: visible }));
      })
    ),
    { dispatch: false }
  );

  loadCursorScript$ = createEffect(() =>
    combineLatest([
      this.store.select(AppSelectors.selectIsInitialized),
      this.store.select(CursorSelectors.selectCursorUsername),
      this.store.select(CursorSelectors.selectCursorColors)
    ]).pipe(
      filter(([isInitialized]) => isInitialized),
      take(1),
      tap(() => {
        const script = document.createElement('script');
        script.src = 'cursors.js';
        document.body.appendChild(script);
      })
    ),
    { dispatch: false }
  );

  listenToCursorPartyConnection$ = createEffect(() =>
    fromEvent<CustomEvent<boolean>>(window, 'cursorPartyConnected').pipe(
      map(event => CursorActions.setCursorPartyConnected({ connected: event.detail }))
    )
  );

  listenToMyIdAssignment$ = createEffect(() =>
    fromEvent<CustomEvent<string>>(window, 'cursorPartyIdAssigned').pipe(
      map(event => CursorActions.setMyId({ id: event.detail }))
    )
  );

  listenToCursorSync$ = createEffect(() =>
    fromEvent<CustomEvent<{ id: string; cursor: any }>>(window, 'cursorPartySync').pipe(
      map(event => CursorActions.receiveCursorSync({ id: event.detail.id, cursor: event.detail.cursor }))
    )
  );

  listenToCursorDisconnect$ = createEffect(() =>
    fromEvent<CustomEvent<{ id: string }>>(window, 'cursorPartyDisconnect').pipe(
      map(event => CursorActions.receiveCursorDisconnect({ id: event.detail.id }))
    )
  );

  syncCursorsToWindow$ = createEffect(() =>
    this.store.select(CursorSelectors.selectCursors).pipe(
      tap(cursors => {
        window.dispatchEvent(new CustomEvent('cursorStateChanged', { detail: cursors }));
      })
    ),
    { dispatch: false }
  );

  syncCursorOrderToWindow$ = createEffect(() =>
    this.store.select(CursorSelectors.selectCursorOrder).pipe(
      tap(cursorOrder => {
        window.dispatchEvent(new CustomEvent('cursorOrderChanged', { detail: cursorOrder }));
      })
    ),
    { dispatch: false }
  );

  listenToLocalCursorMove$ = createEffect(() =>
    fromEvent<CustomEvent<{ x: number; y: number }>>(window, 'localCursorMove').pipe(
      withLatestFrom(this.store.select(CursorSelectors.selectMyId)),
      filter(([, myId]) => myId !== null),
      map(([event, myId]) => CursorActions.updateCursorPosition({ id: myId!, x: event.detail.x, y: event.detail.y }))
    )
  );
}
