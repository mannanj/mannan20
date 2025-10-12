import { createAction, props } from '@ngrx/store';
import { Links } from '../models/models';

export const setHeaderText = createAction(
  '[App] Set Header Text',
  props<{ text: string }>()
);

export const setSelectedLink = createAction(
  '[Navigation] Set Selected Link',
  props<{ link: Links }>()
);

export const setVisibleComponent = createAction(
  '[Navigation] Set Visible Component',
  props<{ link: Links }>()
);
