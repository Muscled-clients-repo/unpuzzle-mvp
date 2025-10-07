# Hero Design Option 5: Marquee Ticker Tape (Horizontal Rows)

## Layout Overview
- **Split layout**: 50/50 or 60/40
- **Left half**: Static hero copy
- **Right half**: 6 horizontal marquee rows scrolling alternating directions
- **Effect**: Stock ticker / news crawler vibe - "money is flowing"

## Copy Placement

### Left Half (Static)
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
│  [START FREE CTA]           │
│                             │
└─────────────────────────────┘
```

**Left half width**: 50% of viewport
**Padding**: Generous (80-100px)
**Background**: Solid color or gradient

## Screenshot Distribution (18 images)

### Right Half - 6 Horizontal Rows
Each row contains 3 images, scrolling infinitely

**Row 1 (Top):**
- **Images**: img1, img2, img3
- **Direction**: Scroll RIGHT →
- **Speed**: 15s per cycle
- **Pattern**: img1 → img2 → img3 → img1 (loop)

**Row 2:**
- **Images**: img4, img5, img6
- **Direction**: Scroll LEFT ←
- **Speed**: 18s per cycle
- **Pattern**: img6 → img5 → img4 → img6 (loop)

**Row 3:**
- **Images**: img7, img8, img9
- **Direction**: Scroll RIGHT →
- **Speed**: 12s per cycle

**Row 4:**
- **Images**: img10, img11, img12
- **Direction**: Scroll LEFT ←
- **Speed**: 20s per cycle

**Row 5:**
- **Images**: img13, img14, img15
- **Direction**: Scroll RIGHT →
- **Speed**: 16s per cycle

**Row 6 (Bottom):**
- **Images**: img16, img17, img18
- **Direction**: Scroll LEFT ←
- **Speed**: 14s per cycle

### Row Heights
- Each row: ~15-16% of viewport height
- Small gap between rows (8-12px)
- Total: 6 rows = ~100% right half height

## Visual Layout
```
LEFT HALF          │  RIGHT HALF (Ticker Tape)
                   │
Stop Trading       │  → [img1] [img2] [img3] [img1]
Time for Money.    │
                   │  ← [img6] [img5] [img4] [img6]
Build Leverage.    │
Exit Rich.         │  → [img7] [img8] [img9] [img7]
                   │
Learn → Service    │  ← [img12][img11][img10][img12]
→ Agency → SaaS    │
→ Millions         │  → [img13][img14][img15][img13]
                   │
[CTA BUTTON]       │  ← [img18][img17][img16][img18]
                   │
```

## Technical Implementation

### Marquee Animation
```css
@keyframes marqueeRight {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes marqueeLeft {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.ticker-row-right {
  animation: marqueeRight 15s linear infinite;
  display: flex;
  gap: 16px;
}

.ticker-row-left {
  animation: marqueeLeft 18s linear infinite;
  display: flex;
  gap: 16px;
}
```

### Layout
```css
.hero-container {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 50/50 split */
  height: 100vh;
}

.ticker-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.ticker-row {
  height: calc((100vh - 60px) / 6); /* 6 rows */
  overflow: hidden;
}
```

### Screenshot Styling
```css
.ticker-image {
  height: 100%;
  width: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  flex-shrink: 0;
}
```

## Alternative Layout: Full Width Rows

Instead of 50/50 split, center the copy with ticker rows above & below:

```
→ [img1] [img2] [img3] [img1] [img2]
← [img4] [img5] [img6] [img4] [img5]

        ╔═══════════════╗
        ║  HERO COPY    ║
        ╚═══════════════╝

→ [img7] [img8] [img9] [img7] [img8]
← [img10][img11][img12][img10][img11]
```

This uses only 12 images in 4 rows, leaving 6 for background or other sections.

## Pros
✓ Clear separation: copy vs. proof
✓ Ticker effect = "money flowing" vibe
✓ Alternating directions create visual interest
✓ Easy to read copy (no overlay needed)
✓ Scalable to any number of rows
✓ Stock market aesthetic reinforces wealth message
✓ Mobile-friendly (can stack vertically)

## Cons
✗ Less immersive than fullscreen options
✗ 50/50 split may waste space
✗ Horizontal scrolling harder to see on narrow screens
✗ Less "premium" feel than 3D options

## Best For
- Finance/business audiences
- Data-driven proof (lots of numbers)
- Users familiar with stock tickers
- Clear, no-nonsense messaging
- Fast-loading pages (simple animation)

## Mobile Adaptation
**Option A - Stack:**
```
COPY
(full width)
───────────
TICKER ROW 1 →
TICKER ROW 2 ←
TICKER ROW 3 →
```

**Option B - Vertical Columns:**
Return to original 3-column vertical scroll on mobile

## Variations

### Fast Ticker (Urgency)
- Speed: 8-10s per cycle
- Message: "Money moving fast, don't miss out"

### Slow Ticker (Premium)
- Speed: 25-30s per cycle
- Message: "Relax, wealth building is methodical"

### Pause on Hover
- Individual rows pause when user hovers
- Allows reading specific proof screenshots
- Resumes on mouse leave
