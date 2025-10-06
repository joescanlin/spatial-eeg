
# Soft Biometrics UI — Final Enhancement Guide (Follow Exactly)

**Scope:** Frontend only. Do **not** refactor backend in this task.  
**Frontend root:** `web_working/`  
**SSE:** `/api/softbio-stream` with event `softbio:prediction`  
**Types:** `web_working/src/types/softbio.ts`

This guide assumes the page `/softbio` already renders the Grid (left) + Summary + Console (right) from the previous revamp.

---

## 0) Preconditions

- App builds and runs from `web_working/` (`npm run dev`).  
- Tailwind is available.  
- Backend is already publishing to `softbio/prediction` and exposing the SSE route.

If any are missing, stop and report.

---

## 1) Install polish bundle files (dark shell + status + export)

**Source:** `ui-polish` bundle we provided.  
**Destination (repo‑relative):**

```
web_working/src/hooks/useSoftBioStream.ts             (replace existing)
web_working/src/components/SoftBioStatus.tsx          (new)
web_working/src/components/ExportLogButtons.tsx       (new)
web_working/src/components/SoftBioSummary.tsx         (replace existing)
web_working/src/pages/SoftBioDemo.tsx                 (replace existing)
SOFT_BIOMETRICS_UI_POLISH.md                          (docs)
```

> ⚠️ Do **not** overwrite `SoftBioConsole.tsx` if your current console is working. Keep it. (If it was overwritten, restore it using the snippet in Step **4**.)

---

## 2) Apply a unified dark theme (page shell)

Open `web_working/src/pages/SoftBioDemo.tsx` and ensure the top-level wrapper is exactly:

```tsx
<div className="min-h-screen bg-neutral-950 text-neutral-100">
  <div className="max-w-7xl mx-auto p-4 space-y-4">
    {/* content */}
  </div>
</div>
```

- Cards/surfaces on this page must use: `bg-neutral-900/60 border border-neutral-800`.  
- Remove any white backgrounds on this page.

---

## 3) Add the telemetry/status bar

**Component:** `web_working/src/components/SoftBioStatus.tsx` (from bundle)  
**What it shows:** SSE state, stream rate (Hz), and end‑to‑end latency (ms).

In `SoftBioDemo.tsx`:

```tsx
import SoftBioStatus from '../components/SoftBioStatus';

<SoftBioStatus status={status} events={events} />
```

Place it at the top of the page content.

---

## 4) Keep (or restore) the terminal console

If your console was overwritten, replace `web_working/src/components/SoftBioConsole.tsx` with this exact version:

```tsx
import { useMemo, useRef, useEffect, useState } from 'react';
import type { SoftBioPred } from '../types/softbio';

function hashColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 80% 60%)`;
}

function lineFor(p: SoftBioPred) {
  const t = new Date(p.ts).toISOString().split('T')[1]?.replace('Z','');
  const gPct = Math.round(p.pred.gender.p_male * 100);
  const h = `${p.pred.height_cm.toFixed(1)}cm`;
  const hCI = `${Math.round((p.pred.height_ci_cm[1] - p.pred.height_ci_cm[0]) / 2)}cm`;
  const a = `${p.pred.age.bin} [${p.pred.age.range_years[0]}–${p.pred.age.range_years[1]}]`;
  const spm = Math.round(p.features.cadence_spm);
  const v = p.features.speed_mps.toFixed(2);
  const flags = p.pred.quality.flags?.length ? ` ⚑ ${p.pred.quality.flags.join(',')}` : '';
  return `[${t}] ${p.track_id}  cadence ${spm} spm | speed ${v} m/s | ♂ ${gPct}% | ${h} ±${hCI} | age: ${a}${flags}`;
}

export default function SoftBioConsole({ events }: { events: SoftBioPred[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [auto, setAuto] = useState(true);
  const lines = useMemo(() => events.map(lineFor), [events]);

  useEffect(() => {
    if (!auto) return;
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, auto]);

  const latest = events[events.length - 1];
  const borderColor = latest ? hashColor(latest.track_id) : 'rgba(16,185,129,0.6)';

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor }}>
      <div className="bg-neutral-900 text-green-300 font-mono p-3 h-[52vh] overflow-auto" ref={ref}>
        {lines.length === 0 && (
          <div className="opacity-60">Waiting for predictions… walk on the mat.</div>
        )}
        {lines.map((ln, i) => (
          <div key={i} className="whitespace-pre leading-6">{ln}</div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 bg-neutral-950/80 px-3 py-2 border-t border-neutral-800">
        <div className="text-xs text-neutral-400">
          {auto ? 'Auto-scroll' : 'Paused'} • {events.length} events
        </div>
        <div className="flex gap-2">
          {!auto && (
            <button
              className="px-2 py-1 text-xs bg-green-700/30 hover:bg-green-700/50 rounded border border-green-800"
              onClick={() => setAuto(true)}
            >
              Jump to live
            </button>
          )}
          {auto && (
            <button
              className="px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700"
              onClick={() => setAuto(false)}
            >
              Pause
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 5) Update the streaming hook (memory + reconnect fix)

Ensure `web_working/src/hooks/useSoftBioStream.ts` matches the **polish bundle** version:
- Boolean `stopped` guard (no `False as any`).  
- Capped memory of last **1000** events.  
- Reconnect with exponential backoff up to 8s.

No other changes required.

---

## 6) Summary cards (dark style + selectable track)

Ensure `web_working/src/components/SoftBioSummary.tsx` is the **dark** version that accepts an optional `onSelect(id)` callback and shows **“Collecting steps…”** when empty (already included in the bundle).

Wire selection in `SoftBioDemo.tsx`:

```tsx
import { useState } from 'react';
const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

<SoftBioSummary events={events.slice(-100)} onSelect={setSelectedTrack} />
<GridDisplay selectedTrackId={selectedTrack as any} />
```

> If `GridDisplay` doesn’t yet consume `selectedTrackId`, it’s safe to ignore for now.

---

## 7) Export controls (NDJSON + CSV)

Ensure `web_working/src/components/ExportLogButtons.tsx` is present and used above the console in the right column:

```tsx
import ExportLogButtons from '../components/ExportLogButtons';

<ExportLogButtons events={events.slice(-400)} />
```

No external libraries; client‑side download only.

---

## 8) Optional: sticky right column (tall screens)

Make the right column stay in view on large screens:

```tsx
<div className="col-span-12 lg:col-span-4 space-y-3 lg:sticky lg:top-4">
  {/* summary, export, console */}
</div>
```

---

## 9) Routing

Ensure the route `/softbio` renders **SoftBioDemo**. If there’s a nav button, it must link to `/softbio`.

---

## 10) Acceptance Tests (must pass)

1. **Theme:** Page uses dark shell (`bg-neutral-950`) and dark cards (`bg-neutral-900/60`, `border-neutral-800`). No white canvas behind dark components.
2. **Status:** Status bar shows SSE state; dot pulses green when connected. Stream rate (Hz) and latency (ms) display sane values during activity.
3. **Stream:** Console starts printing lines within a couple of events; Summary shows one card per active track.
4. **Confidence state:** When `quality.n_steps < 3` for the latest event on a track, Summary shows “Collecting steps…” until sufficient steps accumulate.
5. **Focus:** Clicking a track card updates `selectedTrackId` (grid highlights if supported).
6. **Export:** NDJSON/CSV downloads include recent events (timestamps, track IDs, cadence, speed, p_male, height, age).
7. **Stability:** After 5+ minutes of streaming, memory remains stable (hook caps to 1000; console renders last 400; summary uses last 100). No warnings in console.

If any fail, stop and report with the **file path and line numbers**.

---

## 11) Constraints

- Use **relative imports** (e.g., `../components/...`) unless a `@` alias is already configured.  
- **No new UI libraries**; Tailwind only.  
- **Do not** change backend code in this task.

---

## 12) Completion Message (paste verbatim when done)

> ✅ SoftBio UI polish applied and verified. All acceptance tests pass. Attached screenshots show `/softbio` with the dark shell, status bar (open + reconnect states), summary cards, export controls, and console during a live stream.
