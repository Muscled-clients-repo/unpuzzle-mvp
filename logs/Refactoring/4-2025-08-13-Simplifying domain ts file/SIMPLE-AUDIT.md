# Simple Type Audit: Just the Facts
**Date:** 2025-08-13

## Method: Zero Analysis, Pure Data

I will just extract and list. No interpretation, no claims, no analysis.

---

## 1. ALL TYPES IN domain.ts
(Raw extraction from file)

```bash
grep "^export interface\|^export type" src/types/domain.ts
```

## 2. ALL FILES IMPORTING FROM domain.ts  
(Raw list of files)

```bash
grep -l "from.*@/types/domain" src/**/*.{ts,tsx} 2>/dev/null
```

## 3. ALL IMPORT STATEMENTS FROM domain.ts
(Raw extraction of import lines)

```bash
grep -A10 "from.*@/types/domain" src/**/*.{ts,tsx} 2>/dev/null
```

---

**That's it. No conclusions, no percentages, no recommendations.**
**Just raw data for you to review manually.**