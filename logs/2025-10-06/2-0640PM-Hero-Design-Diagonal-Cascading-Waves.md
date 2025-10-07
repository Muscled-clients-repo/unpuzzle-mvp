# Hero Design Option 2: Diagonal Cascading Waves

## Layout Overview
- **Fullscreen background**: 3-4 diagonal rows of horizontally scrolling screenshots
- **Center overlay**: Hero copy in a semi-transparent dark box
- **Effect**: Screenshots scroll BEHIND the copy like waves

## Copy Placement

### Center Overlay Box
```
┌─────────────────────────────────┐
│  ╔═══════════════════════════╗  │
│  ║                           ║  │
│  ║  Stop Trading Time        ║  │
│  ║  for Money.               ║  │
│  ║                           ║  │
│  ║  Build Leverage.          ║  │
│  ║  Exit Rich.               ║  │
│  ║                           ║  │
│  ║  Learn Design & Dev →     ║  │
│  ║  Offer as Service →       ║  │
│  ║  Build Agency →           ║  │
│  ║  Use Agency Profits       ║  │
│  ║  to Build SaaS →          ║  │
│  ║  Sell SaaS for Millions   ║  │
│  ║                           ║  │
│  ║  [START FREE CTA]         ║  │
│  ║                           ║  │
│  ╚═══════════════════════════╝  │
└─────────────────────────────────┘
```

**Overlay styling:**
- Background: rgba(0,0,0,0.7) or gradient
- Border radius: Rounded corners
- Padding: Generous spacing
- Box shadow: Elevated feel

## Screenshot Distribution (18 images)

### Row 1 (Top) - 6 images
- **Animation**: Scroll LEFT ←
- **Speed**: Slow (12s)
- **Images**: img1, img2, img3, img4, img5, img6
- **Position**: Above the copy overlay

**Order:**
1. img1 → img2 → img3 → img4 → img5 → img6 → img1 (loop)

### Row 2 (Upper-Middle) - 6 images
- **Animation**: Scroll LEFT ←
- **Speed**: Medium (16s)
- **Images**: img7, img8, img9, img10, img11, img12
- **Position**: Behind/through the copy overlay

**Order:**
1. img7 → img8 → img9 → img10 → img11 → img12 → img7 (loop)

### Row 3 (Lower-Middle) - 6 images
- **Animation**: Scroll LEFT ←
- **Speed**: Fast (10s)
- **Images**: img13, img14, img15, img16, img17, img18
- **Position**: Behind/below the copy overlay

**Order:**
1. img13 → img14 → img15 → img16 → img17 → img18 → img13 (loop)

### Diagonal Offset
Each row is offset diagonally:
- Row 1: Top-left starting position
- Row 2: Starts 100px lower, 50px right
- Row 3: Starts 200px lower, 100px right

Creates a "cascading waterfall" effect

## Visual Layout
```
← [img1][img2][img3][img4][img5][img6]
    ← [img7][img8][img9][img10][img11][img12]
        ╔═════════════════════╗
        ║   HERO COPY HERE   ║
        ╚═════════════════════╝
            ← [img13][img14][img15][img16][img17][img18]
```

## Technical Implementation

### Animation
```css
@keyframes marqueeLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

.wave-row-1 {
  animation: marqueeLeft 12s linear infinite;
  top: 10%;
  left: 0;
}

.wave-row-2 {
  animation: marqueeLeft 16s linear infinite;
  top: 35%;
  left: 50px;
  opacity: 0.8; /* Dimmed behind overlay */
}

.wave-row-3 {
  animation: marqueeLeft 10s linear infinite;
  top: 60%;
  left: 100px;
}
```

### Layout
- Full viewport height
- Rows positioned absolutely with diagonal offset
- Overflow hidden
- Copy overlay: z-index higher than screenshots

## Pros
✓ Very dynamic and eye-catching
✓ Unique diagonal flow creates movement
✓ Copy always readable (dark overlay)
✓ Can show all 18 screenshots simultaneously
✓ Premium "cinematic" feel

## Cons
✗ Complex to implement correctly
✗ May be distracting for some users
✗ Harder to read individual screenshots
✗ Performance considerations (3 simultaneous animations)

## Best For
- High-impact landing pages
- Users who want to show off extensive proof
- Modern, creative brands
- Desktop-first experiences
