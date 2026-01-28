import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { appReducer } from './store/app.reducer';
import { cursorReducer } from './store/cursor.reducer';
import { AppEffects } from './store/app.effects';
import { CursorEffects } from './store/cursor.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withFetch()),
    provideStore({ app: appReducer, cursor: cursorReducer }),
    provideEffects([AppEffects, CursorEffects]),
    provideClientHydration(withEventReplay())
  ]
};
