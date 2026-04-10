# Phase 08 — UI Review

**Audited:** 2026-04-10
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md)
**Screenshots:** Not captured (no dev server detected on ports 3000, 5173, or 8080)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Copy is ADHD-safe and contextual; "Cancel" and "Save Changes" are generic but acceptable in modal context |
| 2. Visuals | 3/4 | Clear focus hierarchy; TaskActionMenu trigger lacks aria-label on icon-only button |
| 3. Color | 2/4 | 61 primary usages across codebase; BottomTabBar uses 6 hardcoded hex values with inline style instead of Tailwind tokens |
| 4. Typography | 2/4 | 8 distinct font sizes in use (exceeds 4-size standard); arbitrary sizes `text-[10px]` and `text-[12px]` appear across multiple components |
| 5. Spacing | 3/4 | Scale is principled Tailwind multiples; `text-[10px]` in `mt-0.5` is fine but `min-h-[56px]` and `w-[350px]` are arbitrary layout values |
| 6. Experience Design | 4/4 | Loading state present, empty states handled with contextual copy, offline guard complete, confirmations on destructive paths |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Hardcoded hex colors in BottomTabBar** — Users on themed/dark-mode variants will see color inconsistency since `#4F46E5` and `#6B7280` are not resolved through CSS variables; breaks any future theme change — Replace all `style={{ color: '#4F46E5' }}` inline styles in `BottomTabBar.tsx` (lines 30, 31, 39, 40, 49, 57, 58) with Tailwind `text-primary` and `text-muted` classes.

2. **Arbitrary font sizes bleed the type scale** — `text-[10px]` appears in 5 components (LastFmProfile, SpotifyPlayer, QuickCapture, Pomodoro, page.tsx) and `text-[12px]` in BottomTabBar; these are outside the Tailwind scale and will not respond to any global type-scale adjustment — Consolidate to `text-xs` (12px) for all small metadata labels; `text-[10px]` use cases are too small for ADHD legibility and should use `text-xs` with `tracking-wide` to compensate.

3. **TaskActionMenu trigger missing aria-label** — Screen-reader users and keyboard-only users have no accessible name for the "..." button that opens task actions including the destructive delete — Add `aria-label="Task actions"` to the `<button>` at `TaskActionMenu.tsx` line 20.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- POLISH-01 delivered: Priority buttons now show "Low", "Medium", "High" instead of raw scores 30/60/90 (`EditTaskModal.tsx:150`).
- POLISH-03 delivered: Both duration callsites now show "short task" fallback (`page.tsx:72`, `page.tsx:527`).
- Empty state in Planning mode: "No tasks yet. Capture a thought above or ask the coach for suggestions." (`page.tsx:687–688`) — contextual, non-generic, ADHD-appropriate.
- Focus mode empty state: "No active tasks — Switch to Plan mode to add your first task" (`page.tsx:590–591`) — action-oriented.
- CapacitySummaryStrip copy "Workday ended" and "Xh left · N/M tasks fit" matches the CONTEXT.md decision D-06 exactly.

**Minor issues:**
- `EditTaskModal.tsx:189` — "Cancel" and `EditTaskModal.tsx:190` — "Save Changes": These are functionally clear and acceptable in a modal context. "Cancel" is not ideal per abstract UX standards (prefer "Keep editing" or "Discard changes") but the impact is low in a form that has no destructive consequence.
- `QuickCapture.tsx:266` — Error message "Task creation failed. Check the backend and try again." surfaces a backend-implementation detail to the user. More appropriate: "Couldn't create task. Try again."
- `QuickCapture.tsx:297` — "Update failed. Check the task ID and try again." — same issue; "task ID" is an internal concept. More appropriate: "Couldn't update task. Try again."

### Pillar 2: Visuals (3/4)

**Strengths:**
- Focus mode has a clear single focal point: the large `text-3xl font-bold` task title centered in a card with `rounded-3xl shadow-lg` (`page.tsx:524`).
- CapacitySummaryStrip uses a `●` dot indicator as an ambient visual anchor for the capacity context — matches the CONTEXT.md D-06 one-line ambient format.
- TaskActionMenu uses Radix UI DropdownMenu, providing keyboard navigation and focus management out of the box.
- Action buttons in Focus mode (Complete / Pause / Skip) use distinct color coding (green / orange / gray) with icon + label pairs — no icon-only ambiguity (`page.tsx:533–553`).
- Icon-only interactive elements are largely covered: GlobalChatWidget (line 47), NoisePlayer (lines 139, 172), BottomTabBar FAB (line 47), Pomodoro controls (lines 129, 145), AISuggestion buttons (lines 57, 65), QuickCaptureModal close (line 105).

**Issues:**
- `TaskActionMenu.tsx:20` — The `MoreHorizontal` trigger button has no `aria-label`. This is the primary action entry point for Delete, which is destructive. Screen readers will announce it as an unlabeled button.
- BottomTabBar "More" tab (`BottomTabBar.tsx:56`) is `opacity-40` with no disabled state communicated to assistive technology — no `aria-disabled="true"` or `disabled` attribute.

### Pillar 3: Color (2/4)

**Audit results:**
- `text-primary / bg-primary / border-primary` appears **61 times** across components and page.tsx. This exceeds the guideline threshold of 10 unique elements for accent usage, though many occurrences are for interactive state highlights (selected buttons, active rings) which is consistent usage.
- Hardcoded hex values found in **5 files**:
  - `BottomTabBar.tsx` lines 30, 31, 39, 40, 49, 57, 58 — `#4F46E5` (primary) and `#6B7280` (muted) via inline `style={}` attributes. This is the most problematic — these bypass the CSS variable system entirely.
  - `QuickCapture.tsx:41` — `themePalette: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']` — acceptable as these are data-driven theme color chips, not structural UI.
  - `OfflineBanner.tsx:21–22` — `backgroundColor: '#FFFBEB'` and `color: '#B45309'` — amber warning style; could use `bg-amber-50 text-amber-700` Tailwind classes.
  - `SpotifyPlayer.tsx:136, 163` — `#1DB954` (Spotify brand green) — acceptable as this is a brand-mandated third-party color.
  - `SwipeableTaskCard.tsx:57, 65` — `#10B981` and `#4F46E5` for swipe gesture overlays — these should use `bg-emerald-500` and `bg-primary` via className, not hardcoded hex.
  - `Pomodoro.tsx:51` — hex arrays for a circular progress gradient — acceptable as CSS gradient syntax requires hex/rgb, not class names.

**60/30/10 split assessment (code-only estimate):**
- ~60% neutral (white, gray-50, gray-100 backgrounds) — correct
- ~30% secondary surfaces (border-gray-200, text-gray-500, shadow) — correct
- Primary color is overused as structural accent in BottomTabBar nav rather than reserved for interactive state only.

### Pillar 4: Typography (2/4)

**Distinct font sizes found:**
`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl` — **8 sizes** (exceeds 4-size guideline)

Plus arbitrary sizes outside the Tailwind scale:
- `text-[10px]` — `LastFmProfile.tsx:39`, `SpotifyPlayer.tsx:198`, `QuickCapture.tsx:362`, `QuickCapture.tsx:395`, `Pomodoro.tsx:120`, `page.tsx:68`
- `text-[12px]` — `BottomTabBar.tsx:31, 40, 58`

**Distinct font weights found:**
`font-normal`, `font-medium`, `font-semibold`, `font-bold` — **4 weights** (exceeds 2-weight guideline, though 4 is common in ADHD-focused apps needing strong hierarchy)

**Assessment:**
The 8-size spread is the most actionable issue. The focus card uses `text-3xl font-bold` for the task title, which provides excellent legibility for the primary Focus mode reading target. However, `text-4xl` (`StatsBar.tsx` or similar) combined with `text-[10px]` micro-labels creates an extreme 40px–10px range that risks visual noise. The ADHD audience benefits from a reduced, high-contrast scale.

**Recommended scale reduction:**
- Eliminate `text-[10px]` → use `text-xs` (12px) with `tracking-wide uppercase` to maintain visual distinctiveness
- Eliminate `text-[12px]` → use `text-xs`
- Consolidate `text-4xl` usage — verify it is necessary vs. `text-3xl`
- Target 5 sizes maximum: `text-xs`, `text-sm`, `text-base`, `text-xl`, `text-3xl`

### Pillar 5: Spacing (3/4)

**Top spacing classes by frequency:**
- `gap-2` (60), `py-2` (48), `px-3` (30), `px-4` (24), `gap-3` (19) — standard Tailwind multiples, consistent

**Arbitrary spacing values found:**
- `min-h-[56px]` — `BottomTabBar.tsx:28, 37, 56` — touch target enforcement; intentional and documented, acceptable
- `min-w-[44px]` — same files — touch target; acceptable
- `w-[350px]` — `GlobalChatWidget.tsx:25` — fixed chat widget width; acceptable for a floating panel
- `h-[500px]` — `GlobalChatWidget.tsx:36` — fixed height; acceptable for chat scroll container
- `h-[400px]` — `ChatInterface.tsx:195` — same pattern
- `h-[38px]` — `ChatInterface.tsx:291` — submit button height; should use `py-2` or `h-10` (standard Tailwind)
- `min-h-[64px]` — `QuickCapture.tsx:393` — textarea minimum; acceptable UX choice
- `min-h-[60px]` — `QuickCapture.tsx:671, 680` — same
- `min-h-[44px]` — `AISuggestion.tsx:58, 66` — touch targets; acceptable

**Assessment:**
The arbitrary values are predominantly touch target enforcement (`min-h-[44px]`, `min-h-[56px]`) and constrained panel dimensions — both are intentional and appropriate for a mobile-first ADHD app. The one actionable issue is `h-[38px]` on the chat submit button, which should use a Tailwind step value. The phase 08 specific files (EditTaskModal, CapacitySummaryStrip, page.tsx changes) use clean Tailwind scale spacing throughout.

### Pillar 6: Experience Design (4/4)

**Loading states:**
- `page.tsx:171` — `isLoading` state exists; `page.tsx:675` — heading switches to "Loading tasks…" during fetch. Simple but effective — no skeleton loader, but the text swap prevents blank-state confusion.
- `SpotifyPlayer.tsx:22, 123` — ConnectionState `'loading'` branch renders a loading indicator.
- `ChatInterface.tsx:25` — `loading` state gates the submit button (`disabled:opacity-50 disabled:cursor-not-allowed` at line 291).

**Empty states:**
- Planning mode empty: contextual copy with action prompt (`page.tsx:687–688`) — good.
- Focus mode no-active-task: icon + heading + description + CTA button (`page.tsx:588–597`) — excellent empty state pattern.
- CapacitySummary no-today-tasks branch: existing (`CapacitySummary.tsx:22`).

**Error handling:**
- EditTaskModal theme load failure: caught silently (`EditTaskModal.tsx:23–24`) — no user-visible error. Acceptable since themes are optional.
- QuickCapture errors surface as assistant messages in the chat (`QuickCapture.tsx:266, 297`) — pattern works for the conversational UI context, though copy could be improved (see Pillar 1).
- No top-level ErrorBoundary found in `app/error.tsx` — but `app/error.tsx` exists as a Next.js error route, which provides route-level error capture.

**Offline guard (POLISH-04):**
- `restoreTask` offline guard complete (`api.ts`) — matches createTask/updateTask/deleteTask pattern.
- `MutationType` extended with `'restoreTask'` in `offlineQueue.ts`.
- `replayMutation` case added.
- `OfflineBanner.tsx` provides visible offline state indicator.

**Disabled states:**
- 32 `disabled` / `aria-label` / `aria-disabled` references found — good coverage.
- Submit button in ChatInterface disables during loading (`disabled:opacity-50 disabled:cursor-not-allowed`).

**Destructive confirmations:**
- Delete action in TaskActionMenu is one-tap with no confirmation dialog — impact is mitigated by `UndoBanner.tsx` which provides post-delete undo. This is an acceptable ADHD-friendly pattern (undo > confirm) per the project's established approach.

---

## Files Audited

**Phase 08 modified files:**
- `/home/rbrown/workspace/liminal/frontend/components/EditTaskModal.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/CapacitySummaryStrip.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/useCapacity.ts`
- `/home/rbrown/workspace/liminal/frontend/components/CapacitySummary.tsx`
- `/home/rbrown/workspace/liminal/frontend/app/page.tsx`
- `/home/rbrown/workspace/liminal/frontend/lib/api.ts`
- `/home/rbrown/workspace/liminal/frontend/lib/offlineQueue.ts`

**Supporting files reviewed:**
- `/home/rbrown/workspace/liminal/frontend/components/TaskActionMenu.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/BottomTabBar.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/QuickCapture.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/ChatInterface.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/UndoBanner.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/OfflineBanner.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/SpotifyPlayer.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/SwipeableTaskCard.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/Pomodoro.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/AISuggestion.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/GlobalChatWidget.tsx`
- `/home/rbrown/workspace/liminal/frontend/components/LastFmProfile.tsx`

Registry audit: shadcn not initialized — skipped.
