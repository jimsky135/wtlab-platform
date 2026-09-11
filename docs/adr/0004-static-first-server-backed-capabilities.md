# ADR-0004: Static-First, No Longer Static-Only

**狀態**：Accepted
**日期**：2026-09-09
**所屬計畫**：Project Phoenix（WTLab Platform）
**承接**：[ADR-0001](0001-mvp-frontend-and-deployment-stack.md)（其 §6 已預留「是否／何時離開純靜態」這項決策）

## Context

ADR-0001 決定 MVP 採純靜態輸出、不建後端與資料庫，理由是快速上線並降低維運與安全風險。這個決定至今仍然正確：七個 Decision Instruments 的計算全部在瀏覽器端完成，資料不離開使用者的瀏覽器。

但 2026-09 的兩份唯讀稽核（[shared-session-dataset.md](../shared-session-dataset.md)、Guest Temporary Workspace 可行性驗證）指出同一個結構性事實：

- WTLab 是靜態站，每個工具是獨立 URL，全站零儲存。
- 因此**任何跨頁、跨分頁的工作狀態都不可能存在**——換頁即全滅。
- 這不是缺工，是純靜態架構的必然結果。

要讓使用者「匯入一次資料、在多個工具之間繼續工作」，只有兩條路：把狀態放進瀏覽器儲存，或放進伺服器。前者與平台既有的對外承諾相衝突（延續性頁明寫：使用者的工作內容不會僅依賴瀏覽器 cookie 或本機網站資料），而且無法提供 Guest 隔離。

## Decision

**WTLab 維持 static-first，但不再是 static-only。**

Server-side capability 只在下列情況存在：

- 共享的工作狀態（shared working state）
- 身分／擁有權隔離（identity / ownership isolation）
- 暫時性或永久性的工作區資料
- 背景生命週期操作（過期清理等）
- 其他在「只有瀏覽器」的架構下無法可靠成立的能力

明確的反向約束：

> **既有的 client-side Instruments 不得僅因為現在有了 server runtime 就被搬到伺服器端。**

計算邏輯、schema、validator、adapter、CSV 契約、匯出行為一律維持現狀。伺服器負責的是「狀態去哪裡」，不是「怎麼算」。

### 部署形態

Astro 維持 `output: 'static'`。新增一個 Cloudflare Worker，以 static assets binding 提供既有的 `dist/`，並額外處理 `/api/*`。不切換到 SSR——除非未來出現實際的技術限制證明必要。

此形態與 Phoenix 相同（Worker + assets + D1），但**僅參考部署形狀**：不共用資料庫、不共用 auth、不引入任何 Phoenix 相依。

## Consequences

**正面**
- 跨頁／跨分頁的工作連續性成為可能，且不依賴瀏覽器儲存。
- Guest 隔離可由伺服器端強制，而非仰賴前端自律。
- 未來從 Guest 暫存升級為註冊使用者的常駐工作區，只需更換擁有權與保存期限，七個工具不必重寫。

**負面 / 必須承接的責任**
- ADR-0001 的「因不涉及後端/資料庫，維運與安全性風險大幅降低」不再成立。引入伺服器與 Guest 資料後，session 偽造、資料外洩、清理誤刪都成為必須主動防守的風險面。
- 產生新的營運責任：資料庫供裝、遷移、備份、排程清理。
- Cloudflare Pages Functions 不支援 cron trigger；排程清理需要 Worker 形態，這是部署模型層級的變更。

**不變的原則**
- 使用者資料必須可攜、可匯出，不因使用 WTLab 而被平台鎖住。
- 伺服器端暫存資料是 working state，不是永久保管。架構必須始終保留「匯入 → 工作 → 匯出 → 刪除」而不需要永久儲存的可能性。

## Deferred Decisions

以下刻意不在本 ADR 範圍內：

- 最終的 TTL 長度與清理排程頻率
- Cron trigger 的正式佈署（需要獨立的部署決策，不在原型階段悄悄建立第二個 production service）
- 註冊使用者、付費方案、角色／組織
- 永久性 Workspace 的資料模型（本輪的暫存表是原型容器，不是最終領域模型）
- **把原型 Worker 提升為 production**：需要認領 route／custom domain、為閒置掃除接上排程觸發器、並處理現有 Pages 專案的去留。2026-09-10 起只有 `www.wtlab.co/api/guest/*` 這條 path-level route 已上線（見下方「正式站路由」）；整站 route／custom domain、排程觸發器、Pages 專案去留仍未做。

## Guest 權限範圍（2026-09-09，Table Lock v0.1）

`guest / guest` 登入建立的**只是** Guest Workspace 的暫時存取身分。它**不代表**全站登入、不代表未來的會員身分、不授予任何其他 server resource 或 Phoenix 的存取權。

範圍以兩層獨立限制表達，兩層都必須成立：

| 層 | 保證 |
|---|---|
| **Table lock** | 訪客只碰得到 `guest_workspace_records`。所有 SQL 的表名來自單一常數，無任何一處從 request 取得表名，無動態表選擇、無泛用查詢端點 |
| **Row ownership** | 表內只碰得到 `session_id` 等於伺服器解析出的擁有者（`auth:<session-id>` / `anon:<session-id>`）的列 |

外層若失守，其餘資料庫就暴露；內層若失守，訪客之間互相可見。**兩層互不取代。**

`resolveIdentity()` 只被 Guest Workspace 的 handler 使用——**身分解析不等於授權**。Worker 上除了四條 `/api/guest/*` 之外沒有任何 API；未匹配的 `/api/` 路徑由 Worker 直接回 404，不經身分解析、不碰 D1。

登入不建立任何 row：身分不是帳號。

**共用憑證不等於共用工作區。** `guest / guest` 是所有訪客共用的一組原型憑證，但每次成功登入都由伺服器產生全新的 session，取得自己的 `auth:<session-id>` 命名空間，只碰得到自己的暫存列。

### 未來會員（尚未實作）

| | Guest（現況） | Future Member（**未實作**） |
|---|---|---|
| 儲存 | `guest_workspace_records` | 另立的持久化擁有權／儲存 |
| 性質 | 暫時、session 所有 | 持久、使用者所有 |
| 清理 | TTL / 明確清除 | 另行決定 |

**本輪未建立任何 member table、role、permission 或 RBAC 架構。** 這個原型**不是**註冊使用者系統、不是會員帳號模型、不是付費帳戶儲存、不是 RBAC、也不是角色／權限系統。未來會員的擁有權是另一個獨立的設計決策，本 ADR 不定義。

## 已供裝的原型資源（2026-09-09）

遠端 D1 與 Worker **已實際建立並驗證**，非僅本機：

- Worker `wtlab-guest-workspace-prototype`（僅 workers.dev，無 route／無 cron）
- D1 `wtlab-guest-workspace`（migration 0001 已套用，驗證資料已清空）

供裝當時兩者都在 production 路徑之外（2026-09-10 起的正式站路由見下文「正式站路由」）。**這些資源不會自動消失**——若不採用此方向須明確刪除，指令與理由見 [deployment.md](../deployment.md#prototype-resources--live-path-routed-in-production)。

### 目前遠端狀態（2026-09-10）

既有的原型 Worker 已部署含登入的版本，四條路由皆在：`/api/guest/workspace`、`/api/guest/session`、`/api/guest/login`、`/api/guest/logout`。原型登入所需的 secrets 已在伺服器端設定（僅列名稱，值不進任何文件）：

- `PROTOTYPE_LOGIN_USERNAME`
- `PROTOTYPE_LOGIN_PASSWORD_SHA256`
- `PROTOTYPE_SESSION_SECRET`

遠端驗證結果：`guest / guest` 登入可用；錯誤憑證被拒；auth cookie 必須帶有效簽章；auth / anon 隔離、A / B session 隔離皆 PASS；剝除簽章後重放被擋下；logout 只清除當前擁有者的列；table lock 負向測試 PASS；未知 API 路徑明確回 404；驗證資料已清為 0。版本號與驗證細節見 [deployment.md](../deployment.md#prototype-resources--live-path-routed-in-production)。

### 正式站路由（2026-09-10）

Deferred Decisions 中「把原型 Worker 提升為 production」的路由部分，已用**最窄的形式**解決：只有 `www.wtlab.co/api/guest/*` 路由到既有的 Guest Workspace Worker（`wtlab-guest-workspace-prototype` → D1 `wtlab-guest-workspace`），一般前端頁面仍由 Cloudflare Pages 服務。正式站 `guest / guest` 登入 PASS，最小驗證 7/7 PASS。

這是 **path-level routing**，不是把整站轉成 Worker。沒有引入會員架構、沒有 RBAC、沒有持久化的會員儲存，也沒有 cron。整站提升、排程清理、Pages 專案去留仍屬 Deferred Decisions。

**原型登入退場時**，清理必須同時涵蓋：原型 Worker 的部署／資源（視情況）、`www.wtlab.co/api/guest/*` 這條 route，以及上述三個 Prototype Login Worker secrets。退場登入本身不會、也不應自動刪除 Guest Workspace 的資料表。
