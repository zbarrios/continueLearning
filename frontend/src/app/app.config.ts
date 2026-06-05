/**
 * APP CONFIGURATION
 * =================
 * This is where we configure providers for the entire application.
 * 
 * In Spring terms, this is like your @Configuration class that sets up beans.
 * In React, this is like wrapping your app in <Provider store={store}>.
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { coursesReducer, currentCourseReducer, continueReducer } from './store/app.reducers';
import { AppEffects } from './store/app.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    // Global error handling
    provideBrowserGlobalErrorListeners(),
    
    // Routing (like React Router)
    provideRouter(routes),
    
    // HTTP client (like Axios in React, or RestTemplate in Spring)
    provideHttpClient(),
    
    // NgRx Store (like Redux Provider in React)
    // This registers our reducers - each key becomes a slice of state
    provideStore({
      courses: coursesReducer,           // state.courses
      currentCourse: currentCourseReducer, // state.currentCourse
      continue: continueReducer           // state.continue
    }),
    
    // NgRx Effects (like Redux Saga/Thunk - handles async operations)
    provideEffects([AppEffects]),
    
    // DevTools for debugging (shows state changes in browser)
    // Similar to Redux DevTools
    provideStoreDevtools({
      maxAge: 25,           // Keep last 25 state snapshots
      logOnly: false        // Enable in development
    })
  ]
};
