# Demand Wave Radar — Future Revision Architecture Note

**Status:** Recorded direction. **HOLD implementation until explicitly started.**
**Recorded:** 2026-09-06, after Sprint 011 shipped the v0.1 instrument (`d679693`).
**Applies to:** `src/tools/demand-wave-radar/`, `src/views/instruments/DemandWaveView.astro`

This note records a known limitation of the shipped instrument and the
direction for a future revision. Nothing here is built. It exists so the
gap is written down at the moment it was understood, rather than
rediscovered later.

## 1. Current reality

The shipped v0.1 takes seven **summary averages** as its input:

Annual · H1 · H2 · Q1 · Q2 · Q3 · Q4 monthly averages.

Its defensive logic is:

```
maxAverage       = MAX(valid averages)
DefensiveCoverage = maxAverage × 3
```

**This defensive logic remains valid** and is not what needs revising.

The limitation is the chart. Those seven values are *statistical windows*,
not a real time series — Annual, H1/H2 and Q1..Q4 overlap by design.
Connecting them as

```
Annual → H1 → H2 → Q1 → Q2 → Q3 → Q4
```

produces a **comparison line**, not a demand wave. Not technically wrong;
just not what the instrument's name promises.

## 2. Revision direction

A true Demand Wave Radar should use **monthly actual consumption** as its
base time series. Minimum conceptual shape:

```
Month + Actual Consumption
Jan → actual usage
Feb → actual usage
Mar → actual usage
...
```

The real monthly consumption sequence becomes the primary wave.

## 3. Derived windows

The same seven windows are then **derived automatically** from the monthly
data, rather than entered by hand. They stop being seven sequential time
points and become **reference / comparison layers** over the real monthly
timeline.

## 4. Visualization intent

- **Primary layer:** actual monthly consumption wave
- **Reference layers:** quarterly averages, half-year averages, annual
  monthly average

The point is to let the user see *actual demand movement* against
*different historical averaging windows* — which restores the original
"multiple waves / multiple layers" concept.

## 5. Defensive logic stays

Keep `highest valid monthly average × 3 months`. Do not remove it.

The revision must keep two concepts **separate, never merged into one line**:

| | |
|---|---|
| **A. Demand Wave** | actual time-series movement |
| **B. Defensive Coverage** | historical high-average protection |

## 6. Input direction

A future version will likely need **data import** — manually typing long
monthly histories is not practical.

**Do not define the final import format yet.** Record only that the future
Radar should support a monthly consumption dataset as its primary input
source.

## 7. Non-goals for now

Not to be implemented as part of this direction:

import schema · CSV template · Excel mapping · SAP-specific parser ·
AI prediction · ML forecasting · seasonal model · anomaly threshold ·
warning threshold · auto-generated missing data · Phoenix integration

## 8. Summary

| | |
|---|---|
| **Current** | 7-window comparison prototype (shipped, v0.1) |
| **Future** | monthly consumption time-series + derived average layers |

Upgrade path: from *summary average comparison* to *time series with
derived reference layers*. Held until explicitly started.
