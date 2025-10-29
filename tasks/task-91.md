### Task 91: Fix RxJS Subscription Pattern in Employment Section
- [ ] Remove subscribe/unsubscribe pattern in showMore() method
- [ ] Convert jobs$ observable to signal using toSignal()
- [ ] Use computed() to derive jobsToShow and visibleJobs from jobs signal
- [ ] Remove updateVisibleJobs() method if no longer needed
- [ ] Test that Show More functionality still works correctly
- Location: `src/app/components/about/employment-section.ts:59-63`
