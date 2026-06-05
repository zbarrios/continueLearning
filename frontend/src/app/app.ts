/**
 * ROOT APP COMPONENT
 * ==================
 * The root component that contains the router outlet.
 * Similar to React's App.js with React Router.
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <main class="app-container">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: #f8f9fa;
    }
  `]
})
export class App {}
