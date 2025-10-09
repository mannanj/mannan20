import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from './store/app.state';
import { selectHeaderText } from './store/app.selectors';
import { HeaderComponent } from "./components/header/header";

@Component({
  selector: 'app-root',
  imports: [HeaderComponent],
  template: `
    <header></header>
  `,
})
export class AppComponent {
  title = 'mannan';
  headerText$: Observable<string>;

  constructor(private store: Store<AppState>) {
  this.headerText$ = this.store.select(selectHeaderText);
  }
}
