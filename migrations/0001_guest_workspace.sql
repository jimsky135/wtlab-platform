-- Guest temporary workspace — ONE fixed table, permanently present.
--
-- Guest data exists as rows scoped by a server-derived session id. There is
-- no table per Guest and no table created or dropped at runtime: clearing a
-- workspace deletes rows, the table stays.
--
-- `payload` is an opaque string. This is a prototype container, not the final
-- Workspace domain model — it assumes no industry vocabulary on purpose.

CREATE TABLE IF NOT EXISTS guest_workspace_records (
  session_id TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (session_id, dataset_id)
);

-- Supports the inactivity sweep, which is the primary lifecycle mechanism
-- (browser-close events are best-effort and can never be relied on alone).
CREATE INDEX IF NOT EXISTS idx_guest_workspace_updated_at
  ON guest_workspace_records (updated_at);
