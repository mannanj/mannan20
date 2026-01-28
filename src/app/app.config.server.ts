import { ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { appReducer } from './store/app.reducer';
import { cursorReducer } from './store/cursor.reducer';

const serverConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withFetch()),
    provideStore({ app: appReducer, cursor: cursorReducer }),
    provideClientHydration(withEventReplay()),
    provideServerRendering(withRoutes(serverRoutes))
  ]
};

export const config = serverConfig;
