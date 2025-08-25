# Ruler Performance Root Cause - FOUND!
**Date:** 2025-08-24
**Issue:** Scrubber lags only when zoomed in to show 1-second intervals

## THE ROOT CAUSE

The scrubber lag is caused by **excessive DOM elements in the ruler** when zoomed in.

### DOM Element Count by Zoom Level

#### When interval = 1 second (lag occurs):
```
- 120 major second markers (0:00 to 2:00)
- 480 minor tick marks (4 per second)
- Total: 600+ DOM elements
```

#### When interval = 5 seconds (no lag):
```
- 24 major markers
- 0 minor marks
- Total: 24 DOM elements
```

#### When interval = 10 seconds (no lag):
```
- 12 major markers
- 0 minor marks  
- Total: 12 DOM elements
```

## Why This Causes Lag at Second Boundaries

When the scrubber moves at high zoom (1-second intervals):

1. **At 1.0 seconds**: Scrubber is at exact position of a major marker (120px)
2. **Browser has to calculate**: Which of 600+ elements might be affected
3. **Z-index stacking**: Scrubber (z-20) must render above ruler (z-10)
4. **Paint complexity**: Browser checks if any of the 600 elements need repainting

The lag happens at second markers because that's where the major ruler elements are positioned, creating "hot spots" where the browser does extra work.

## Code Evidence

```typescript
// Lines 241-260 in SimpleTimeline.tsx
for (let i = 0; i <= totalSeconds; i += interval) {  // 120 iterations when interval=1
  markers.push(
    <div key={i} className="absolute pointer-events-none" 
         style={{ left: i * pixelsPerSecond + 70 }}>
      {/* Major mark */}
      
      {/* Minor marks - adds 4 more elements per second */}
      {zoomLevel >= 0.75 && interval === 1 && [1, 2, 3, 4].map(j => (
        <div key={j} className="absolute h-1 w-px bg-gray-700"
             style={{ left: j * (pixelsPerSecond / 5) }} />
      ))}
    </div>
  )
}
```

## Performance Impact

### At 100% zoom (50px per second):
- Second 0: 70px (major mark + 4 minor marks)
- Second 1: 120px (major mark + 4 minor marks)  
- Second 2: 170px (major mark + 4 minor marks)
- ...continues for 120 seconds

**Total rendered but mostly invisible**: Most of these 600+ elements are outside the viewport but still in the DOM, affecting performance.

## Why No Lag at Lower Zoom

When zoomed out (interval = 5 or 10):
- Only 12-24 ruler elements total
- No minor tick marks
- Browser can efficiently handle the smaller DOM tree
- No performance bottleneck at second boundaries

## THE SOLUTION

### Option 1: Virtualize the Ruler (Best)
Only render ruler marks that are visible in the viewport:
```typescript
const visibleStart = scrollLeft / pixelsPerSecond
const visibleEnd = (scrollLeft + viewportWidth) / pixelsPerSecond
// Only render markers between visibleStart and visibleEnd
```

### Option 2: Limit Ruler Range
Instead of rendering 120 seconds of ruler, only render what's needed:
```typescript
const maxSeconds = Math.min(30, totalFrames / FPS + 10)
```

### Option 3: Use CSS for Minor Marks
Instead of DOM elements, use CSS background gradients:
```css
background-image: repeating-linear-gradient(
  to right,
  transparent,
  transparent 9.9px,
  #374151 10px,
  #374151 10.1px
);
```

### Option 4: Reduce Minor Marks
Only show 1 minor mark at 0.5s instead of 4 marks:
```typescript
{zoomLevel >= 0.75 && interval === 1 && (
  <div className="absolute h-1 w-px bg-gray-700"
       style={{ left: pixelsPerSecond / 2 }} />
)}
```

## Immediate Fix - Simplest Solution

Remove minor marks entirely:
```typescript
{/* Minor marks only when zoomed in enough */}
{/* COMMENTED OUT TO FIX PERFORMANCE
{zoomLevel >= 0.75 && interval === 1 && [1, 2, 3, 4].map(j => (
  <div key={j} className="absolute h-1 w-px bg-gray-700"
       style={{ left: j * (pixelsPerSecond / 5) }} />
))}
*/}
```

This would reduce DOM elements from 600 to 120, likely eliminating the lag.

## Recommended Approach

1. **Quick fix**: Remove minor marks (5 min)
2. **Better fix**: Limit ruler to visible range + buffer (30 min)
3. **Best fix**: Virtualize ruler rendering (2 hours)

The scrubber lag is not a timing issue or animation problem - it's a DOM performance issue caused by rendering too many ruler elements when zoomed in!