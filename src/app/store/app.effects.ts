import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { map, catchError, mergeMap, withLatestFrom, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import * as AppActions from './app.actions';
import * as AppSelectors from './app.selectors';
import { AboutData, Metadata, DevCommit } from '../models/models';
import { isDevMode } from '../utils/cookies';

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

  loadDevCommits$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      filter(() => isDevMode()),
      mergeMap(() =>
        this.http.get<DevCommit[]>('assets/dev-commits.json').pipe(
          map(commits => AppActions.loadDevCommitsSuccess({ commits })),
          catchError((error) => {
            console.error('Error loading dev commits:', error);
            return of();
          })
        )
      )
    )
  );
}
