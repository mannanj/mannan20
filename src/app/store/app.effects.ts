import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as AppActions from './app.actions';
import { AboutData } from '../models/models';

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
}
