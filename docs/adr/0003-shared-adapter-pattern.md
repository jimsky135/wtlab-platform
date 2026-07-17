# ADR-0003: Shared Adapter Pattern

**狀態**：Accepted
**日期**：2026-07-17
**所屬計畫**：Project Phoenix（WTLab Platform）

（編號說明：依 Sprint 003.5 任務書指定編為 0003；0002 保留未用。）

## Context

Sprint 003 建立了 Shared Data Intake Foundation（parse → normalize → validate → confirm）。Sprint 003.5 要讓確認後的 intake 資料實際驅動第一個 instrument（Water Level Checker），並支援兩種模式（Quick Check / Advanced Planning）與可重複使用的 Input CSV 閉環。需要決定「平台的資料」如何變成「工具的輸入」，且不讓兩邊互相滲透。

## Decision

在平台層建立 **Adapter**（`src/platform/adapters/<instrument>/`），作為 Confirmed Intake 與 instrument 標準輸入之間的唯一轉換點：

```
Confirmed Intake ──adapter──► Instrument Standard Input ──► Instrument Engine
```

### Adapter 的責任（全部）

- Field mapping（intake 欄位 id → instrument 輸入欄位）
- 型別轉換（intake 的 number/string → instrument raw input 的字串）
- 結構轉換（長格式列 → 分組、排序後的多期結構）
- 宣告式預設值（如 Quick 模式空白 lead time → '0'，於 intake 階段以 warning 揭露）
- 結構性問題回報（如重複的 item+period、缺 beginning inventory）

### Adapter 明確不做

- Coverage / buffer / risk 任何計算
- 重複 instrument 自身的 validation（adapter 輸出 RAW input，instrument 的 `validate` 保持權威）
- 結果格式化

## Why business logic stays inside the instrument

- 公式只有一份，測試只需針對一處；adapter 測試可以斷言「adapter 前後的計算結果一致」來證明它沒有夾帶邏輯。
- Instrument 可獨立演進（新增輸出、修公式）而不動任何平台層程式。
- 平台層（intake/templates/adapters）保持 instrument-agnostic，未來每個新 instrument 只加自己的 adapter。

## Why the platform only transfers and normalizes

Intake 的三種轉換（trim、blank→missing、宣告式數字解析）與 adapter 的結構轉換都是**可逆或可追溯**的資料搬運；一旦平台開始「理解」數值的業務含義，每個工具的規則就會滲進共用層，破壞模組化的根基。

## Quick / Advanced 的關係

同一個 instrument 的兩種 Mode（`ModeContract`），各有 schema、template、adapter 與輸出形態，但共用：intake foundation、CSV 產生器、engine（Quick 用既有單品項引擎；Advanced 用同一 instrument 內新增的 projection 引擎——是擴充，不是複製）、export foundation、UI tokens 與錯誤呈現。

## Why manual and CSV converge to one standard input

Manual 表單值會先組成與 CSV 完全相同的 intake 記錄，走同一條 validate → confirm → adapter → engine 管線。這保證：同一組數字無論從表單或檔案進來，結果必然相同；且「下載 Input CSV → 修改 → 重新上傳」的閉環天然成立，因為匯出用的就是同一份 template 契約。

## Why Input CSV and Result CSV must remain separate

- Input CSV 的欄名 = intake schema 欄位 id（exact-match 自動對應），是**可重新上傳的資料母檔**。
- Result CSV 使用 result 專屬欄名（如 `periodNumber`、`consumed`），**刻意**不與 input schema 相符——測試明確驗證 result 檔無法通過 input mapping。這防止使用者誤把分析結果當輸入回灌（結果值如 endingBalance 回灌會產生語意錯誤的分析）。
- 檔名分流：`water-level-*-input.csv` vs `water-level-*-result.csv`。

## Consequences

- 新 instrument 接入成本 = 一份 schema + 一份 template + 一個 adapter + 測試；引擎與 intake 零改動。
- Adapter 層多了一次資料複製，對本平台的資料量（瀏覽器內、千列級）無實質成本。
- 使用者資料以檔案形式離開瀏覽器，不依賴 cookie/localStorage——資料可攜是架構保證而非功能。
