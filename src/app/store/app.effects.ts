import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { map, catchError, mergeMap, withLatestFrom, filter, throttleTime } from 'rxjs/operators';
import { of, fromEvent, EMPTY } from 'rxjs';
import * as AppActions from './app.actions';
import * as AppSelectors from './app.selectors';
import { AboutData, Metadata, DevCommit, Task, Links } from '../models/models';
import { isDevMode } from '../utils/cookies';

@Injectable()
export class AppEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

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
      filter(() => {
        const devMode = isDevMode();
        return devMode;
      }),
      mergeMap(() => {
        return this.http.get<DevCommit[]>('data/dev-commits.json').pipe(
          map(commits => {
            return AppActions.loadDevCommitsSuccess({ commits });
          }),
          catchError((error) => {
            return of();
          })
        );
      })
    )
  );

  loadTasks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      filter(() => {
        const devMode = isDevMode();
        return devMode;
      }),
      mergeMap(() => {
        return this.http.get<Task[]>('data/tasks.json').pipe(
          map(tasks => {
            return AppActions.loadTasksSuccess({ tasks });
          }),
          catchError((error) => {
            return of();
          })
        );
      })
    )
  );

  trackNavigation$ = createEffect(() => {
    if (!this.isBrowser) {
      return EMPTY;
    }

    return fromEvent(window, 'scroll').pipe(
      throttleTime(100),
      map(() => {
        const sections: Links[] = [Links.home, Links.about, Links.contact];
        let maxVisible = 0;
        let activeSection: Links = Links.home;

        sections.forEach(link => {
          const element = document.getElementById(link);
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          const visibleTop = Math.max(rect.top, 0);
          const visibleBottom = Math.min(rect.bottom, viewportHeight);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const percentage = visibleHeight / rect.height;

          if (percentage > maxVisible) {
            maxVisible = percentage;
            activeSection = link;
          }
        });

        return AppActions.setSelectedLink({ link: activeSection });
      })
    );
  });
}
