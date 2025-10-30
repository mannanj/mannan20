### Task 72a: State Management & Models - Star Reward System Foundation
- [ ] Add `StarReward` interface to models.ts with fields: id, earnedAt, value, type, reason
- [ ] Add star-related properties to `AppState` interface: starCount, totalStarsEarned, rewards array, gamingModeUnlocked, specialCode
- [ ] Create `/src/app/store/star.actions.ts` with actions: awardStar, claimMilestoneReward, unlockGamingMode, enterSpecialCode
- [ ] Update `/src/app/store/app.reducer.ts` to handle star actions and update state
- [ ] Create selectors in reducer: selectStarCount, selectRewards, selectGamingModeUnlocked, selectSpecialCode
- [ ] Initialize star state in initial AppState with default values (0 stars, empty rewards, locked mode)
- Location: `src/app/models/models.ts`, `src/app/store/star.actions.ts`, `src/app/store/app.reducer.ts`
