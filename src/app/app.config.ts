import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

import { appReducer } from './store/app.reducer';
import { cursorReducer } from './store/cursor.reducer';
import { AppEffects } from './store/app.effects';
import { CursorEffects } from './store/cursor.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideHttpClient(),
    provideStore({ app: appReducer, cursor: cursorReducer }),
    provideEffects([AppEffects, CursorEffects]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode()
    })
  ]
};
