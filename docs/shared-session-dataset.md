# Shared Data Compatibility Audit

**Status:** Read-only audit. Nothing built, no schema/contract/test touched.
**HOLD until explicitly started.**
**Recorded:** 2026-09-06, after Sprint 011.
**Question:** can several instruments share one uploaded dataset, and can that
data stay usable across instruments until the session ends?

**Short answer:** the blocker is not storage. It is that the same field id does
not always mean the same thing, and in three cases the rules are exactly
opposite.

> **Supersedes** the preliminary note of the same date. That first pass
> recommended Water Level ↔ Lead Time Gap **Quick** as the natural first case
> because they share five identical field ids. The full audit reverses that:
> those same five fields carry *all three* of the incompatibilities found. The
> cleaner starting point is the **Advanced** trio — see §9.

Method: read all 13 intake schemas, all 13 CSV templates, 7 tool validators,
the adapters, and both locale dictionaries.

---

## 0. "Field id" is three different things

This affects every judgement below.

| Layer | Example (Water Level) | Used by |
|---|---|---|
| ① UI form field id | `leadTime`, `safetyBuffer`, `arrivalTime` | QuickForm, i18n `results.*.fields` |
| ② Intake schema / CSV column | `leadTimeMonths`, `safetyBufferMonths`, `arrivalTimeMonths` | uploaded files, templates |
| ③ Tool raw input | `leadTime` + `leadTimeUnit` | the engine |

The adapter bridges ② → ③. **CSV column ids equal schema field ids across all
13 templates — zero drift.** That layer is clean. But "shared field" must always
say *which* layer.

---

## A. Full field inventory

### Water Level Checker — `inventory-buffer-check`

**Quick** · schema `water-level-quick` · CSV `water-level-quick-input.csv` · **row = one item**

| field id (CSV) | EN label | zh-TW | type | req | validation | default |
|---|---|---|---|---|---|---|
| `itemName` | Item Name | 品項名稱 | text | **required** | — | adapter → `'item'` |
| `currentStock` | Current Stock | 現有庫存 | number | required | min 0 | — |
| `monthlyConsumption` | Monthly Consumption | 月耗用量 | number | required | schema min 0; **tool requires > 0** | — |
| `leadTimeMonths` | Lead Time (months) / UI: Replenishment Lead Time | 補貨前置時間 | number | optional | min 0; blank → warning | **adapter injects `'0'`** |
| `safetyBufferMonths` | Safety Buffer (months) | 安全庫存緩衝 | number | optional | min 0; blank → warning | **adapter injects `'0'`** |
| `inTransitQuantity` | In-Transit Quantity | 在途數量 | number | optional | min 0 | undefined |
| `arrivalTimeMonths` | Arrival Time (months) / UI: Expected Arrival Time | 預計到貨時間 | number | optional | min 0 | undefined |

**Advanced** · `water-level-advanced` · **row = item × period**
`itemName`(req) · `period`(req, min 1) · `beginningInventory`(opt) · `safetyBufferMonths`(opt) · `consumption`(req) · `arrivalQuantity`(opt)

### Lead Time Gap Checker

**Quick** · `lead-time-gap-quick` · **row = one item**

| field id | EN label | zh-TW | type | req | validation | default |
|---|---|---|---|---|---|---|
| `itemName` | Item Name | 品項名稱 | text | **optional** | — | `'item'` |
| `currentStock` | Current Stock | 現有庫存 | number | required | min 0 | — |
| `monthlyConsumption` | Monthly Consumption | 月耗用量 | number | required | min 0; **tool explicitly accepts 0** | — |
| `leadTimeMonths` | **Supplier** Lead Time (months) | 供應商前置時間 | number | **required** | min 0 | **none** — blank is an error |
| `safetyBufferMonths` | Safety Buffer (months) | 安全緩衝 | number | **required** | min 0 | **none** |
| `currentDate` | Current Date | 目前日期 | text | optional | ISO `YYYY-MM-DD` | today (info issue) |

**Advanced** · `lead-time-gap-advanced` · **row = item × period**
`itemName`(req) · `period`(req) · `beginningInventory`(opt) · **`supplierLeadTimeMonths`**(opt) · `safetyBufferMonths`(opt) · `consumption`(req) · `arrivalQuantity`(opt)

### Dead Stock Scanner

**Quick** · `dead-stock-quick` · **row = one item**

| field id | EN label | zh-TW | req | validation / meaning |
|---|---|---|---|---|
| **`item`** | Item Name | 品項名稱 | required | — |
| `currentStock` | Current Stock | 現有庫存 | required | min 0 |
| **`recentMonthlyConsumption`** | Recent Monthly Consumption | 近期月耗用量 | required | min 0; **0 → warning, assessed as dormant/dead candidate** |
| `monthsSinceLastMovement` | Months Since Last Movement | 距上次異動月數 | optional | min 0; blank = unknown |
| `futureDemand` | Known Future Demand | 已知未來需求 | optional | **0 = explicitly none; blank = unknown** (withholds a dead-stock verdict) |
| `unitCost` | Unit Cost | 單位成本 | optional | min 0; missing → no exposure value |
| `thresholdMonths` | Coverage Threshold (months) | 覆蓋門檻（月） | optional | **min 1**; blank = default 12 |

**Advanced** · `dead-stock-advanced` · **row = one SKU** — same, with `category`(opt) and `note`(opt) replacing `thresholdMonths`

### Buffer Drift Monitor

**Quick** · `buffer-drift-quick` · **row = one item**
`itemName`(**opt**) · `monthlyConsumption`(req, min 0) · `intendedBufferMonths`(req, min 0) · `actualBufferQuantity`(req, min 0)

**Advanced** · `buffer-drift-advanced` · **row = item × period**
`itemName`(req) · `period`(req, min 1) · `intendedBufferMonths`(opt) · `monthlyConsumption`(req) · `actualBufferQuantity`(req)

### Arrival Collision Detector

**Quick** · `arrival-collision-quick` · **row = one arrival**
`arrivalDate`(req, strict ISO) · `quantity`(req, min 0) · `container`(opt) · `supplier`(opt)

**Advanced** · adds `monthlyCapacity`(opt, min 0, first row)

### Supplier Dependency & Qualification Radar

**Quick** · `supplier-dependency-quick` · **row = one supplier (pre-aggregated counts)**
`supplierName`(req) · `materialCount`(req) · `criticalMaterialCount`(req) · `supplierSharePercent`(req, 0–100) · `singleSourceMaterialCount`(req) · `qualifiedSingleSourceMaterialCount`(req) · `alternativeSupplierAvailable` / `qualifiedAlternativeAvailable` / `qualificationRequired` / `customerApprovalRequired` / `trialProductionRequired`(opt, tri-state text) · `qualificationLeadTimeMonths`(opt) · **`averageLeadTimeDays`**(opt) · `averageDelayDays`(opt) · `deliveryReliabilityPercent`(opt, 0–100) · `agreementCancellationCount`(opt) · `annualExposureValue`(opt) · `estimatedSwitchingTime`(opt, enum) · **`notes`**(opt)

**Advanced** · `supplier-dependency-advanced` · **row = supplier × material**
`supplierName`(req) · `materialName`(req) · `materialCategory`(opt) · `supplierSharePercent`(**opt**) · `criticalMaterial`(opt, tri) · `singleSource`(opt, tri) · … · **`leadTimeDays`**(opt) · `annualUsage`(opt) · **`optionalNotes`**(opt)

### Demand Wave Radar

Single mode · `demand-wave` · **row = one item × seven statistical windows** · **no CSV template** (catalog declares no csv-import)
`itemName`(opt) · `annual` `h1` `h2` `q1` `q2` `q3` `q4` (all optional, min 0, blank = no data); `validateRecord` requires **at least one**

---

## B. Semantic equivalence table

| Concept | Tool | field id | Actual meaning | Class |
|---|---|---|---|---|
| **Item identity** | WL / LTG / BD / DW | `itemName` | SKU name | **A — shareable** (but required differs, see C) |
| | DS | **`item`** | same | **B — alias needed** |
| **Current stock** | WL / LTG / DS | `currentStock` | on-hand quantity | **A — shareable** |
| **Monthly consumption** | WL | `monthlyConsumption` | avg monthly usage, **must be > 0** | **C — same id, different meaning** |
| | LTG | `monthlyConsumption` | avg monthly usage, **0 = never depletes** | **C** |
| | BD | `monthlyConsumption` | usage **observed in that period** | **C** (period observation, not an item property) |
| | DS | **`recentMonthlyConsumption`** | **recent** avg usage; 0 = no recent consumption | **B + C** (renamed *and* narrowed) |
| **Lead time** | WL | `leadTimeMonths` (UI: Replenishment) | **replenishment** lead time; blank → 0 | **C** |
| | LTG | `leadTimeMonths` (UI: Supplier) | **order to receipt**; required | **C** |
| | LTG Advanced | **`supplierLeadTimeMonths`** | same as LTG quick | **B** — renamed within one tool |
| | SD | **`averageLeadTimeDays`** / **`leadTimeDays`** | supplier lead time, **in days** | **B + unit conflict** |
| **Safety buffer** | WL / LTG | `safetyBufferMonths` | months | **A** (required differs; zh-TW wording differs, see E) |
| **Buffer policy vs actual** | BD | `intendedBufferMonths` / `actualBufferQuantity` | target vs held | unique, no counterpart |
| **Quantity** | AC | `quantity` | **one arrival batch** | **D — different granularity**, not interchangeable with `currentStock` |
| **Supplier** | AC | `supplier` | free-text source label on an arrival | **D** |
| | SD | `supplierName` | the analysis subject itself | **D** |
| **Date** | AC | `arrivalDate` | expected arrival date | **D** |
| | LTG | `currentDate` | the date to measure from | **D** — both ISO dates, unrelated meanings |
| **Period** | WL / LTG / BD Advanced | `period` | sequence number 1,2,3… (explicitly not a date) | **A** — all three agree |
| **Consumption (advanced)** | WL / LTG Advanced | `consumption` | planned usage for that period | **A**, but a *different field* from `monthlyConsumption` |

---

## C. Validation mismatch table

| Field | Compared | Difference | Verdict |
|---|---|---|---|
| `monthlyConsumption` | WL vs LTG | WL uses `parsePositive` (**0 rejected**); LTG uses `parseNonNegative` (**0 accepted**). LTG's validator docblock says so explicitly: *"unlike Water Level"* | **Incompatible** |
| `leadTimeMonths` | WL vs LTG | WL optional, adapter injects `'0'`; LTG **required**, blank → `VALIDATE_NUMBER_REQUIRED` | **Incompatible** |
| `safetyBufferMonths` | WL vs LTG | WL optional + injected 0; LTG **required** | **Incompatible** |
| `itemName` | WL vs LTG vs BD | WL **required**; LTG optional; BD quick optional / advanced required | **Conditionally compatible** — satisfy the strictest |
| `currentStock` | WL vs LTG vs DS | all required, min 0, same meaning, no extra tool rule | **Compatible** |
| `period` | WL vs LTG vs BD | all required, min 1, all explicitly sequence-not-date | **Compatible** |
| `recentMonthlyConsumption` vs `monthlyConsumption` | DS vs WL/LTG | renamed + "recent" narrowing + 0 triggers a warning | **Conditionally compatible** |
| numeric type | platform-wide | all `number`, integer/decimal not distinguished; LTG samples use `1.5` / `0.5` | **Compatible** |
| time unit | platform vs SD | CSV contract is always months; **SD uses days** | **Incompatible** (cross-family) |
| booleans | SD | tri-state text `'true'/'false'/''` via `allowedValues`, not a boolean type | consistent within family |

**`currentStock` is the only numeric field that is unconditionally compatible
across three instruments.**

---

## D. Data granularity grouping

| A row means | Tools (mode) |
|---|---|
| **one item (snapshot)** | WL Quick · LTG Quick · DS Quick/Advanced · BD Quick |
| **item × period (time series)** | WL Advanced · LTG Advanced · BD Advanced |
| **one arrival event** | AC Quick/Advanced |
| **one supplier (aggregated)** | SD Quick |
| **supplier × material** | SD Advanced |
| **one item × seven windows** | DW |

**Six granularities, not one.** SD changes granularity *between its own two
modes* (supplier → supplier × material).

---

## E. Terminology findings (listed only, not corrected)

**Same concept, different name**
`itemName` ↔ `item` (DS) · `leadTimeMonths` ↔ `supplierLeadTimeMonths` (within LTG) ·
`averageLeadTimeDays` ↔ `leadTimeDays` (within SD) · `notes` ↔ `optionalNotes` (within SD) ·
`monthlyConsumption` ↔ `consumption` (quick ↔ advanced, and the meaning shifts from
item property to period value)

**Same name, different concept**
`monthlyConsumption` (WL > 0 / LTG 0 ok / BD period observation) ·
`leadTimeMonths` (replenishment vs supplier) ·
`supplier` (AC free-text label) vs `supplierName` (SD analysis subject)

**EN / zh-TW drift**
`safetyBuffer` — EN is "Safety Buffer" in both, zh-TW is **安全庫存緩衝 (WL)** vs
**安全緩衝 (LTG)**. The only confirmed translation inconsistency.
`leadTime` — EN already differentiated (Replenishment / Supplier) and zh-TW
follows (補貨 / 供應商). No drift.

**CSV header vs UI field id**
Platform-wide and **deliberate**: UI `leadTime` / CSV `leadTimeMonths`, etc. The
CSV contract is always months; only the UI offers a day/month toggle.

---

## F. Tool-to-tool compatibility matrix

Quick modes, compared at the CSV layer:

| A vs B | shared ids | same semantics | alias needed | incompatible | same grain | Verdict |
|---|---|---|---|---|---|---|
| WL ↔ LTG | 5 | 2 | 0 | **3** | yes | **PARTIAL** |
| WL ↔ DS | 2 | 1 | 2 | 1 | yes | **PARTIAL** |
| WL ↔ BD | 2 | 1 | 0 | 1 | yes | **PARTIAL** |
| LTG ↔ DS | 2 | 1 | 2 | 0 | yes | **PARTIAL** |
| LTG ↔ BD | 2 | 1 | 0 | 1 | yes | **PARTIAL** |
| DS ↔ BD | 0 | 0 | 2 | 0 | yes | **PARTIAL (very weak)** |
| DW ↔ any | 1 | 1 | 0 | 0 | **no** | **FAIL** |
| AC ↔ any | 0 | 0 | — | — | **no** | **FAIL** |
| SD ↔ any | 0 | 0 | — | — | **no** | **FAIL** |

**No pair reaches PASS.**

---

## G. Possible shared-data families (from repo reality)

| Family | Members | Shared basis | State |
|---|---|---|---|
| **Item snapshot** | WL Quick · LTG Quick · DS Quick/Adv · BD Quick | item id + `currentStock` + some monthly consumption | only real candidate, but carries the class-C conflicts |
| **Item × period** | WL Adv · LTG Adv · BD Adv | `itemName` + `period` + period consumption | **cleanest shared basis today** |
| **Arrival event** | AC | `arrivalDate` + `quantity` | single tool, no counterpart |
| **Supplier** | SD Quick / SD Advanced | `supplierName` | grain differs between its own modes |
| **Demand window** | DW | seven windows | single tool, no counterpart |

---

## H. "Upload once, reuse across tools" — worked test

Best case, WL Quick + LTG Quick. User uploads one file with
`itemName, currentStock, monthlyConsumption, leadTimeMonths, safetyBufferMonths`:

| Check | Result |
|---|---|
| Tool A (WL) reads its fields | pass |
| unused columns untouched | pass — intake's `unknown` mechanism preserves them verbatim |
| Tool B (LTG) reads its fields | conditional |
| missing optional fields do not block | **fail** — `leadTimeMonths` / `safetyBufferMonths` are optional in WL, **required** in LTG |
| no semantic reinterpretation | **fail** — `monthlyConsumption = 0` is legal in LTG, rejected by WL; blank `leadTimeMonths` is **silently set to 0** by WL's adapter and an error in LTG |

**Concrete counter-example.** One row: `monthlyConsumption = 0`, `leadTimeMonths = (blank)`
→ LTG: lead time required → **error**
→ WL: lead time defaults to 0, but consumption must be > 0 → **error**
The same row fails both tools, for opposite reasons.

---

## I. Blockers

| # | Blocker | Layer | Nature |
|---|---|---|---|
| 1 | `monthlyConsumption` 0-rule is inverted, and **documented in code as deliberate** | tool validator | semantic decision, not a bug |
| 2 | `leadTimeMonths` / `safetyBufferMonths` required-ness inverted | schema | semantic decision |
| 3 | WL's adapter **silently injects 0**; LTG's does not | adapter | behavioural difference |
| 4 | `leadTimeMonths` means replenishment vs supplier lead time | semantic | is it the same number? |
| 5 | `item` / `recentMonthlyConsumption` naming | schema + CSV | naming — but CSV headers are files users already hold, so renaming is a public contract change |
| 6 | six data granularities | structural | not solvable, and should not be |
| 7 | SD uses days, everything else months | unit | cross-family only |
| 8 | zero storage; `output: 'static'`; all seven entries `dataPersistence: 'none'` | platform | contract change needed |
| 9 | public promise that user work never depends only on browser storage | product | session data may only ever be a convenience cache |

---

## J. Export / re-import feasibility (blockers only, no format designed)

- **In favour:** CSV column ids equal schema field ids across all 13 templates,
  zero drift; intake's `unknown` mechanism already preserves foreign columns
  through a round trip.
- **Against:** result CSVs are **deliberately not re-importable** (`export.ts`:
  *"Result-only headers so a result file can never be re-mapped as an input
  CSV"*) — existing design, not a defect.
- **Against:** no single file can satisfy two tools' required sets at once (§H).
- **Against:** a merged wide table would carry `item` *and* `itemName`, plus
  `monthlyConsumption` *and* `recentMonthlyConsumption` — two columns for one
  concept, with nothing to say which wins on re-import. Misread risk.

---

## K. Verdict

**1 — Can WTLab build a cross-tool shared session dataset today?**
Technically yes, semantically not yet. The blocker is not storage —
`sessionStorage` has exactly the right lifetime. It is the three fields whose
required-ness and 0-handling are opposite. Building now would freeze the
ambiguity into the shared layer.

**2 — Can all seven share one dataset?**
**No, and they should not.** Six granularities. Arrival events, suppliers and
statistical windows are different axes from item rows; forcing them together
would be a false abstraction.

**3 — Which tools should share first?**
Not WL Quick ↔ LTG Quick, despite five identical ids — those five carry *all
three* incompatibilities.

The cleanest is **WL Advanced ↔ LTG Advanced ↔ BD Advanced**: they share
`itemName` + `period` + period consumption, `period` is defined identically in
all three (sequence number, explicitly never a date), and the advanced fields
are mostly optional with no 0-value conflict. LTG Advanced only adds
`supplierLeadTimeMonths`.

**4 — Which are only naming mismatches?** (alias-solvable, meaning unchanged)
`item`→`itemName` · `supplierLeadTimeMonths`→`leadTimeMonths` ·
`leadTimeDays`→`averageLeadTimeDays` · `optionalNotes`→`notes`

**5 — Which are true semantic mismatches?** (need a decision first)
`monthlyConsumption` 0-rule (WL vs LTG vs BD period value) · `leadTimeMonths`
replenishment vs supplier · `recentMonthlyConsumption`'s "recent" narrowing ·
`quantity`(AC) vs `currentStock` · `supplier`(AC) vs `supplierName`(SD)

**6 — Without changing any existing tool behaviour, how far can sharing go?**

As far as **read-only pre-fill — not shared execution**:

- Keep one confirmed intake and **pre-fill the form** when the user moves to
  another instrument.
- Each tool still runs **its own** schema validation and adapter. Zero
  behavioural change.
- Surface incompatibilities as visible notes ("this tool requires lead time")
  and let the user complete them.
- Not possible: auto-submitting or calculating across tools — that would require
  unifying the validation rules, which by definition changes current behaviour.

**This pre-fill path needs no change to any schema, validator or adapter.** It
demotes blockers 1–3 from "must solve first" to "differences shown to the user".

---

## L. Deliberately not done

No file was modified during this audit. Specifically not done: unify field
names · build a canonical schema · add aliases · add sessionStorage or
localStorage · change `dataPersistence` · change the Tool Contract · change
templates or UI · change or add tests.

**Deferred (2026-09-06):** no pointer comments were added to the Water Level /
Lead Time Gap schemas where §C's divergence lives. Touching two shipped
instruments for an item on hold was judged not worth it — add those anchors as
part of the same change that resolves §K5, not before.
