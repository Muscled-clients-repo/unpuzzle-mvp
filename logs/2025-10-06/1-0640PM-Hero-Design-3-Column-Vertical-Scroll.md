# Hero Design Option 1: 3-Column Vertical Infinite Scroll

## Layout Overview
- **3 columns**: Left, Center, Right
- **Center**: Static hero copy (fixed position)
- **Left & Right**: Infinite vertical scrolling screenshots

## Copy Placement

### Center Column (Static)
```
┌─────────────────────────────┐
│                             │
│  Stop Trading Time          │
│  for Money.                 │
│                             │
│  Build Leverage.            │
│  Exit Rich.                 │
│                             │
│  Learn Design & Dev →       │
│  Offer as Service →         │
│  Build Agency →             │
│  Use Agency Profits         │
│  to Build SaaS →            │
│  Sell SaaS for Millions     │
│                             │
│  [START FREE - CTA Button]  │
│                             │
└─────────────────────────────┘
```

**Typography:**
- Main headline: 3xl - 5xl font
- Subtitle flow: xl - 2xl font
- CTA button: Large, prominent

## Screenshot Distribution (18 images)

### Left Column (6 images)
- **Animation**: Scroll UP infinitely
- **Speed**: Medium (slower than right)
- **Images**: img1, img2, img3, img4, img5, img6 (loop)

**Order:**
1. img1 - Upwork earnings screenshot
2. img2 - Wise payment notification
3. img3 - Stripe dashboard
4. img4 - Upwork conversation
5. img5 - Bank statement
6. img6 - Client testimonial

### Right Column (6 images)
- **Animation**: Scroll UP infinitely
- **Speed**: Fast (faster than left for visual interest)
- **Images**: img13, img14, img15, img16, img17, img18 (loop)

**Order:**
1. img13 - Revenue screenshot
2. img14 - Payment proof
3. img15 - Client project
4. img16 - Earnings dashboard
5. img17 - Invoice
6. img18 - Success metrics

### Center Background (6 images) - OPTIONAL
- **Animation**: Scroll DOWN infinitely (opposite direction)
- **Speed**: Very slow
- **Images**: img7, img8, img9, img10, img11, img12 (loop)
- **Effect**: Dimmed/blurred behind the copy for depth
- OR keep center clean with no background images

## Technical Implementation

### Animation
```css
@keyframes scrollUp {
  from { transform: translateY(0); }
  to { transform: translateY(-100%); }
}

@keyframes scrollDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

.scroll-up {
  animation: scrollUp 20s linear infinite;
}

.scroll-down {
  animation: scrollDown 25s linear infinite;
}
```

### Layout
- Container: Full viewport height
- Column widths: 25% | 50% | 25%
- Mobile: Stack vertically or hide side columns

## Pros
✓ Clean, organized layout
✓ Copy always readable (static center)
✓ Dynamic proof (scrolling sides)
✓ Easy to implement
✓ Works well on all screen sizes

## Cons
✗ Less interactive (no user control)
✗ May be too "busy" for some users
✗ Screenshots might scroll too fast to read

## Best For
- Users who want IMMEDIATE social proof
- Landing pages with high traffic
- Mobile-friendly layouts
