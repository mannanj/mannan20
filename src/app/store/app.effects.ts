import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { map, catchError, switchMap, mergeMap, concatMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import * as AppActions from './app.actions';
import { AboutData, Metadata } from '../models/models';

@Injectable()
export class AppEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadInitialData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() =>
        forkJoin({
          aboutData: this.http.get<AboutData>('data/about.json').pipe(
            catchError((error) => {
              console.error('Error loading about data:', error);
              return of(null);
            })
          ),
          metadata: this.http.get<Metadata>('data/metadata.json').pipe(
            catchError((error) => {
              console.error('Error loading metadata:', error);
              return of(null);
            })
          ),
          cursorUsernames: this.http.get<{ usernames: string[] }>('data/cursor-usernames.json').pipe(
            catchError((error) => {
              console.error('Error loading cursor usernames:', error);
              return of({ usernames: ['happy possum'] });
            })
          )
        }).pipe(
          concatMap((results) => {
            const actions: any[] = [];

            if (results.aboutData) {
              actions.push(AppActions.loadAboutDataSuccess({ data: results.aboutData }));
            } else {
              actions.push(AppActions.loadAboutDataFailure({ error: 'Failed to load about data' }));
            }

            if (results.metadata) {
              actions.push(AppActions.loadMetadataSuccess({ metadata: results.metadata }));
            } else {
              actions.push(AppActions.loadMetadataFailure({ error: 'Failed to load metadata' }));
            }

            const randomUsername = results.cursorUsernames.usernames[
              Math.floor(Math.random() * results.cursorUsernames.usernames.length)
            ];
            actions.push(AppActions.loadCursorUsernameSuccess({ username: randomUsername }));

            actions.push(AppActions.setAppInitialized());

            return actions;
          })
        )
      )
    )
  );
}
