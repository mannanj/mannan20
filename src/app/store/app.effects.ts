import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { map, catchError, mergeMap, withLatestFrom, filter, tap, take } from 'rxjs/operators';
import { of, combineLatest } from 'rxjs';
import * as AppActions from './app.actions';
import * as AppSelectors from './app.selectors';
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

  loadCursorUsername$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      mergeMap(() =>
        this.http.get<{ usernames: string[] }>('data/cursor-usernames.json').pipe(
          map(({ usernames }) => {
            const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
            return AppActions.loadCursorUsernameSuccess({ username: randomUsername });
          }),
          catchError((error) => {
            console.error('Error loading cursor usernames:', error);
            return of(AppActions.loadCursorUsernameSuccess({ username: 'happy possum' }));
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
      ofType(AppActions.loadCursorUsernameSuccess),
      map(() => AppActions.setCursorDataInitialized())
    )
  );

  syncCursorChatPlaceholder$ = createEffect(() =>
    this.store.select(AppSelectors.selectCursorChatPlaceholder).pipe(
      tap(placeholder => {
        (window as any).cursorChatPlaceholder = placeholder;
      })
    ),
    { dispatch: false }
  );

  syncCursorUsername$ = createEffect(() =>
    this.store.select(AppSelectors.selectCursorUsername).pipe(
      tap(username => {
        (window as any).cursorUsername = username;
      })
    ),
    { dispatch: false }
  );

  syncCursorColors$ = createEffect(() =>
    this.store.select(AppSelectors.selectCursorColors).pipe(
      tap(colors => {
        (window as any).cursorColors = colors;
      })
    ),
    { dispatch: false }
  );

  syncMyId$ = createEffect(() =>
    this.store.select(AppSelectors.selectMyId).pipe(
      tap(myId => {
        (window as any).myId = myId;
      })
    ),
    { dispatch: false }
  );

  syncCursorsVisible$ = createEffect(() =>
    this.store.select(AppSelectors.selectCursorsVisible).pipe(
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
      this.store.select(AppSelectors.selectCursorUsername),
      this.store.select(AppSelectors.selectCursorColors)
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
}
