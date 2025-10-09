import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AppState } from './store/app.state';
import { selectHeaderText } from './store/app.selectors';
import { HeaderComponent } from "./components/header/header.component";

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, HeaderComponent],
  template: `
    <app-header></app-header>
      <h1 class="text-3xl font-bold">
      {{ headerText$ | async }}
      </h1>
  `,
})
export class AppComponent {
  title = 'mannan';
  headerText$: Observable<string>;

  constructor(private store: Store<AppState>) {
  this.headerText$ = this.store.select(selectHeaderText);
  }
}
