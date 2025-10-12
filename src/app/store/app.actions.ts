import { createAction, props } from '@ngrx/store';
import { Links } from '../models/models';
import { ContactFormData } from './app.state';

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

export const updateContactFormData = createAction(
  '[Contact] Update Form Data',
  props<{ formData: Partial<ContactFormData> }>()
);
