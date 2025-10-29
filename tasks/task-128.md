### Task 128: Daylight Progress Bar Component for Schedule Popup
- [x] Create reusable daylight-bar component with animation
- [x] Find and examine the scheduling popup component (not yet implemented in codebase)
- [x] Implement smooth animation showing daylight progress
- [x] Style bar without "Daylight" label (bar only)
- [ ] Integrate into scheduling popup when it's built (position inline with current time indicator)
- Location: `src/app/components/daylight-bar/daylight-bar.ts`

## Component Created

The `DaylightBarComponent` is a reusable, standalone Angular component that displays a daylight progress bar with the following features:

### Features
- Real-time daylight progress calculation based on sunrise/sunset times
- Smooth animated transition (1000ms ease-out)
- Accurate solar calculations using geographical coordinates
- Shows remaining daylight time (e.g., "10.6h" or "45m")
- Gradient styling: night colors (dark) to daylight colors (amber)
- Auto-updates every minute
- No external dependencies required

### Usage
```typescript
import { DaylightBarComponent } from './components/daylight-bar/daylight-bar';

// In your component template:
<app-daylight-bar [latitude]="37.7749" [longitude]="-122.4194" />
```

### Integration Instructions for Scheduling Popup
When the scheduling popup component is built, integrate the daylight bar as follows:

1. Import the component:
```typescript
import { DaylightBarComponent } from '../daylight-bar/daylight-bar';
```

2. Add to component imports array:
```typescript
imports: [CommonModule, DaylightBarComponent, ...]
```

3. Position inline with current time indicator (next to "11m until work" label):
```html
<div class="flex items-center gap-2">
  <span>11m until work</span>
  <app-daylight-bar class="flex-1 max-w-[200px]" [latitude]="userLatitude" [longitude]="userLongitude" />
</div>
```

### Styling Notes
- Component uses Tailwind utilities exclusively
- Height: h-6 (24px)
- Rounded corners: rounded-full
- Gradient background mimics day/night cycle
- Time display uses mix-blend-difference for visibility on any background
