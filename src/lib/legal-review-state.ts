export interface LegalReviewState {
  reachedEnd: boolean;
  agreed: boolean;
}

export function canCompleteLegalReview(state: LegalReviewState): boolean {
  return state.reachedEnd && state.agreed;
}
