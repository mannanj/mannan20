import { createAction, props } from '@ngrx/store';

export const setHeaderText = createAction(
  '[App] Set Header Text',
  props<{ text: string }>()
);
