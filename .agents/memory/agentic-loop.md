---
name: Agentic loop implementation
description: How Claude tool use + SSE streaming is wired in the API server and frontend
---

## What's built
- `artifacts/api-server/src/routes/chat.ts` — agentic loop with tools (list_files, read_file, write_file, delete_file, run_command)
- Project files live at `/tmp/kodu-projects/{projectId}/` — seeded on first chat
- SSE events: `delta`, `tool_call`, `tool_result`, `file_changed`, `file_tree`, `file_deleted`, `done`, `error`
- Frontend: `ToolCard` component shows each tool call with spinner → ✓/✗; file tree and editor update live

## Express 5 / path-to-regexp v8 wildcard fix
**Why:** `path-to-regexp@8.x` (used by Express 5 / router@2) does NOT support bare `*` or `(*)`
patterns in route paths. Both `/files/*` and `/files/:name(*)` throw PathError at startup.

**How to apply:** Use a query parameter instead of a path wildcard for variable-depth paths:
```
// WRONG (throws): router.get("/projects/:id/files/*", ...)
// WRONG (throws): router.get("/projects/:id/files/:f(*)", ...)
// CORRECT:        router.get("/projects/:id/file", ...)  → req.query.path
```
Frontend: `fetch(\`${BASE}/api/projects/${id}/file?path=${encodeURIComponent(filePath)}\`)`
