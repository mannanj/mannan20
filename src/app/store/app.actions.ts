import { createAction, props } from '@ngrx/store';
import { Links, AboutData } from '../models/models';

export const setSelectedLink = createAction(
  '[Navigation] Set Selected Link',
  props<{ link: Links }>()
);

export const loadAboutData = createAction('[About] Load About Data');

export const loadAboutDataSuccess = createAction(
  '[About] Load About Data Success',
  props<{ data: AboutData }>()
);

export const loadAboutDataFailure = createAction(
  '[About] Load About Data Failure',
  props<{ error: string }>()
);
