# Hero Design Option 4: Bento Grid with Animated Swap

## Layout Overview
- **3-column layout**: Left Grid | Center Copy | Right Grid
- **Grids**: 2×6 or 3×6 bento-style screenshot grids
- **Animation**: Screenshots fade in/out and swap positions every 2-3 seconds
- **Effect**: Organized chaos - constantly refreshing proof

## Copy Placement

### Center Column (Static)
```
┌───────────────────────────┐
│                           │
│  Stop Trading Time        │
│  for Money.               │
│                           │
│  Build Leverage.          │
│  Exit Rich.               │
│                           │
│  Learn Design & Dev →     │
│  Offer as Service →       │
│  Build Agency →           │
│  Use Agency Profits       │
│  to Build SaaS →          │
│  Sell SaaS for Millions   │
│                           │
│  [START FREE CTA]         │
│                           │
└───────────────────────────┘
```

**Column width:**
- Left grid: 30%
- Center copy: 40%
- Right grid: 30%

## Screenshot Distribution (18 images)

### Left Grid (9 images)
**Layout**: 3 columns × 3 rows

```
┌────┬────┬────┐
│img1│img2│img3│
├────┼────┼────┤
│img4│img5│img6│
├────┼────┼────┤
│img7│img8│img9│
└────┴────┴────┘
```

**Animation Pattern:**
- Every 2.5 seconds: 3 random images fade out
- New images fade in from the pool
- Creates constantly changing grid

**Image Pool for Left:**
img1, img2, img3, img4, img5, img6, img7, img8, img9

### Right Grid (9 images)
**Layout**: 3 columns × 3 rows

```
┌────┬────┬────┐
│im10│im11│im12│
├────┼────┼────┤
│im13│im14│im15│
├────┼────┼────┤
│im16│im17│im18│
└────┴────┴────┘
```

**Animation Pattern:**
- Offset from left grid by 1.2 seconds
- Same swap animation
- Prevents both grids swapping simultaneously

**Image Pool for Right:**
img10, img11, img12, img13, img14, img15, img16, img17, img18

### Swap Animation Sequence
**Cycle 1 (0-2.5s):**
- Display: img1, img2, img3, img4, img5, img6, img7, img8, img9

**Cycle 2 (2.5-5s):**
- Fade out: img2, img5, img8
- Fade in: img2, img5, img8 (same images, different positions)
- Effect: Grid reshuffles

**Cycle 3 (5-7.5s):**
- Fade out: img1, img4, img7
- Fade in: img1, img4, img7 (reshuffled)

**Continuous loop** creating sense of abundance

## Visual Layout
```
[im1][im2][im3]  ┌─────────┐  [im10][im11][im12]
[im4][im5][im6]  │         │  [im13][im14][im15]
[im7][im8][im9]  │  COPY   │  [im16][im17][im18]
                 │  HERE   │
                 └─────────┘
```

## Technical Implementation

### Grid Layout
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 30%;
}

.grid-item {
  aspect-ratio: 4/3;
  border-radius: 8px;
  overflow: hidden;
  transition: opacity 0.5s ease, transform 0.5s ease;
}
```

### Swap Animation
```javascript
// Pseudo-code
setInterval(() => {
  // Select 3 random positions
  const positions = [0,1,2,3,4,5,6,7,8];
  const swapPositions = shuffle(positions).slice(0, 3);

  // Fade out
  swapPositions.forEach(pos => {
    grid[pos].style.opacity = 0;
  });

  // Wait 250ms, then swap images
  setTimeout(() => {
    // Shuffle and reassign
    swapPositions.forEach(pos => {
      grid[pos].src = getRandomImage();
      grid[pos].style.opacity = 1;
    });
  }, 250);
}, 2500);
```

### Hover Effect
```css
.grid-item:hover {
  transform: scale(1.05);
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
```

## Alternative: Bento with Variable Sizes
Instead of uniform grid, some cells span 2 columns:

```
┌──────┬────┐
│      │im2 │
│ im1  ├────┤
│      │im3 │
├────┬─┴────┤
│im4 │      │
├────┤ im5  │
│im6 │      │
└────┴──────┘
```

Featured screenshots get larger cells

## Pros
✓ Organized and clean layout
✓ Copy always readable
✓ All screenshots visible at once
✓ Gentle animation (not overwhelming)
✓ Easy to implement
✓ Responsive-friendly
✓ Can hover to pause/zoom individual screenshots

## Cons
✗ Less dynamic than scrolling options
✗ Grids might feel "static"
✗ Requires careful image selection for grid
✗ May need different layout for mobile

## Best For
- Professional/corporate audiences
- Users who want organized proof display
- Desktop and tablet experiences
- Brands that value clean design
- A/B testing with clear comparison

## Mobile Adaptation
- Stack vertically: Grid → Copy → Grid
- Or: Hide grids, show copy only
- Or: Single column grid with 3 images showing
