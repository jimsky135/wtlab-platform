# ADR-0001: MVP Frontend and Deployment Stack

**狀態**：Accepted
**日期**：2026-07-12
**所屬計畫**：Project Phoenix（WTLab Platform）

---

## 1. Context

WTLab Platform 是面向公開市場的模組化工具平台，由「平台殼層 + 獨立工具」構成（詳見 Tool Interface Proposal v0.2）。第一階段已定義：

- 第一個工具為 Inventory Buffer Check（Tool Specification v0.2），邏輯已定稿，僅需瀏覽器端輸入、驗證、計算，無需伺服器運算。
- 第一階段部署邊界明確：公開網站、靜態前端為主、GitHub 推送後可部署、不建立後端、不建立資料庫、不做登入與付款。
- 需要在「快速產出可用 MVP」與「不鎖死長期架構」之間取得平衡：技術選型要能支撐目前的殼層＋工具模式，但不應對平台尚未定案的未來能力（API、登入、資料儲存、付款）做出架構上的預先承諾。

在此前提下，需要為第一階段選定前端技術棧與部署方式。

## 2. Decision

第一階段採用以下技術棧與部署方式：

- **框架**：Astro（Static Output 模式）
- **語言**：TypeScript
- **UI 方案**：不引入 React、Vue、Svelte 等 UI 框架；工具畫面以 Astro Components 組成，瀏覽器端互動與計算邏輯使用 Astro client-side scripts 與 TypeScript 實作。
- **後端／資料庫**：不建立，MVP 所有計算於瀏覽器端完成
- **部署平台**：Cloudflare Pages
- **部署方式**：透過 GitHub 整合，push 後自動觸發建置與部署

## 3. Reasons

- Astro 的 content collections + 檔案式路由，適合「殼層列出多個獨立工具」的呈現方式，每個工具的 metadata 可作為內容資料被殼層讀取。
- Astro Components 與 client-side scripts 可將平台殼層、工具畫面與瀏覽器端互動邏輯分離，符合「殼層 + 獨立工具」的 MVP 架構需求。
- TypeScript 可將 Tool Interface Proposal 的 metadata 與四個功能介面（`initialize`／`render`／`validate`／`calculate`）定義為型別合約，供後續工具共同遵循。
- 不引入 UI 框架、狀態管理、後端、資料庫，符合第一階段部署邊界，降低 MVP 複雜度與維運成本。
- Cloudflare Pages 提供免費方案、GitHub 自動部署、自訂網域綁定，符合「不依賴本機執行、不使用公司內部環境」的部署目標。

## 4. MVP Constraints

- 僅產出靜態網站（HTML/CSS/JS），不包含任何伺服器端運算。
- 不建立後端服務、不整合任何資料庫。
- 不實作登入、會員、付款功能。
- 不引入 React、Vue、Svelte 或任何額外 UI 框架。
- 不引入狀態管理套件；工具內部狀態以元件自身狀態處理。
- 不啟用實際多語言路由/翻譯機制（架構預留擴充點，但不實作）。
- 部署完全依賴 GitHub → Cloudflare Pages 的自動化流程，不依賴本機手動部署。

## 5. Consequences

**正面：**
- MVP 可快速建置並以免費方案上線，驗證「平台殼層 + 獨立工具」架構是否成立。
- 因不涉及後端/資料庫，第一階段的維運與安全性風險大幅降低。
- TypeScript 型別合約有助於後續工具維持一致的介面規格，降低擴充時的整合成本。

**負面／限制：**
- 所有工具邏輯目前僅能在瀏覽器端執行，無法處理需要伺服器端運算、機密資料保護或跨使用者資料同步的需求。
- 未導入登入機制，MVP 階段無法提供個人化功能、使用紀錄或跨裝置同步。
- 技術棧選型偏向靜態內容導向，若未來平台方向大幅偏離「殼層 + 獨立工具」模式（例如需要複雜即時互動或大型 SPA 體驗），可能需要重新評估。

## 6. Deferred Decisions

以下決策**不在本 ADR 範圍內**，刻意保留給未來依實際需求另立 ADR 處理：

- 是否／何時將 Astro 輸出模式從純靜態調整為包含 server-side 渲染的形式。
- 是否／如何導入 Cloudflare Workers、Pages Functions 作為 API 層。
- 是否／如何導入 Cloudflare D1（資料庫）或 KV（設定/使用紀錄儲存）。
- 登入與使用者身份機制的技術選型。
- 付款／訂閱／單次解鎖等金流機制的技術選型。
- 多語言（i18n）實際運行機制的技術選型。

**重要聲明**：本 ADR 不對上述項目的未來實作路徑做出任何架構上的預先承諾（包含但不限於「未來只需從靜態切換為 hybrid 即可完成擴充」這類假設）。當平台進入需要上述能力的階段時，應依當時 Astro 與 Cloudflare 官方支援現況，另行建立新的 ADR 進行獨立的架構決策。
