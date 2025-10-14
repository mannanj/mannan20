import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { map, catchError, switchMap, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as AppActions from './app.actions';
import { AboutData, Metadata } from '../models/models';

@Injectable()
export class AppEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadAboutData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() =>
        this.http.get<AboutData>('data/about.json').pipe(
          map((data) => AppActions.loadAboutDataSuccess({ data })),
          catchError((error) =>
            of(AppActions.loadAboutDataFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loadMetadata$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      mergeMap(() =>
        this.http.get<Metadata>('data/metadata.json').pipe(
          map((metadata) => AppActions.loadMetadataSuccess({ metadata })),
          catchError((error) =>
            of(AppActions.loadMetadataFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loadCursorUsernames$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      mergeMap(() =>
        this.http.get<{ usernames: string[] }>('data/cursor-usernames.json').pipe(
          map((data) => {
            const randomUsername = data.usernames[Math.floor(Math.random() * data.usernames.length)];
            return AppActions.loadCursorUsernameSuccess({ username: randomUsername });
          }),
          catchError((error) =>
            of(AppActions.loadCursorUsernameFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
