# Supabase Cloud Sync

## 职责

云端同步模块负责把当前本地 `state` 作为一整份 JSON 保存到 Supabase `app_state` 表，并支持从云端恢复覆盖本地；首版保持手动同步，不自动合并多设备冲突。

## 优先查看

- `supabase-config.js`: 填写 Supabase Project URL 和 anon public key；anon/public key 可以在前端使用，但必须确保 `app_state` 开启 RLS 且策略正确，不能放 service role key。
- `supabase-sync.js`: Supabase Auth、`app_state` upsert 和拉取逻辑。
- `app.js`: `moneyapp.cloud.meta` 本地同步元数据、设置页云端同步按钮、`getStateSnapshot()`、`replaceStateFromCloud()` 和 `markLocalChanged()`。
- `supabase-schema.sql`: 需要在 Supabase SQL Editor 执行的建表和 RLS 策略。

## 状态说明

`localStorage` 仍是主数据源；`saveState()` 默认只更新本地并刷新 `clientUpdatedAt`，不会自动上传。点击“同步到云端”会 upsert 当前 `state`，点击“从云端恢复”会确认后用云端 `payload` 覆盖本地并经 `normalizeState()` 规范化。
