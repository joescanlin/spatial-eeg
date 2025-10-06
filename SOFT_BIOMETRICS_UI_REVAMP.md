# Soft-Biometrics UI Revamp — Agent Guide (Follow Exactly)

**Goal:** Create a focused soft-biometrics demo page: keep the grid on the left and add a right pane with summary cards and a terminal-style live console. Remove PT/Fall UI from this page.

**Backends & Routes (already implemented):**
- SSE endpoint: **`/api/softbio-stream`**
- SSE event name: **`softbio:prediction`**

> Do not refactor backend code in this guide. Front-end only.

---

## 0) Preconditions

- Frontend root is `web_working/`.
- Types file exists at `web_working/src/types/softbio.ts`.
- Tailwind is available (as in current project). No new libraries.

---

## 1) Add streaming hook

**Create:** `web_working/src/hooks/useSoftBioStream.ts`

- Connect to `/api/softbio-stream`.
- Listen for `softbio:prediction`.
- Cap memory (last 1000 events).
- Expose `{ status: 'connecting'|'open'|'closed', events }`.

If the `@` alias to `src/` is missing, replace `@/types/softbio` with `../types/softbio`.

---

## 2) Console component

**Create:** `web_working/src/components/SoftBioConsole.tsx`

- Scrollable, monospace, dark theme.
- Auto scroll to bottom unless user clicks **Pause**.
- Render lines: time, track, cadence, speed, gender %, height ± CI, age, flags.
- Keep only the last ~400 items passed via props.

---

## 3) Summary component

**Create:** `web_working/src/components/SoftBioSummary.tsx`

- One card per active track (latest event per track).
- Bar for gender probability, height + CI, age range, flags, cadence/speed micro-stats.

---

## 4) Compose the page

**Create:** `web_working/src/pages/SoftBioDemo.tsx`

- 12-col layout: left 8 → `GridDisplay`, right 4 → summary + console.
- Status chip up top showing SSE state.
- Use the hook: `useSoftBioStream('/api/softbio-stream')`.

---

## 5) Route

- Add a route `/softbio` → `SoftBioDemo` (React Router) **or**
- Replace the existing dashboard page with `<SoftBioDemo />` for the demo build.

Do not delete `GridDisplay`. Remove PT/Fall UI from this page only.

---

## 6) Acceptance Criteria

- Page renders with grid left and console+summary right.
- Live events appear within seconds; confidence improves as steps accumulate.
- Memory is stable for 5+ minutes (events capped).
- No PT/Fall UI remains on this page.
