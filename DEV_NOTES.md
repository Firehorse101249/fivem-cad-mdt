# DEV_NOTES

## Current Architecture

This is a Next.js 16 App Router project with Supabase as the backing auth/data layer. Next 16 uses `proxy.ts` instead of the older `middleware.ts`; local Next docs live in `node_modules/next/dist/docs/` and should be checked before changing routing, route handlers, layouts, or proxy behavior.

Main areas:

- `app/` contains App Router pages and API route handlers.
- `components/` contains the large client-side CAD/MDT workstations.
- `src/lib/` contains shared server helpers for auth, permissions, audit logging, maintenance, and Supabase admin access.
- `supabase/` contains additive SQL schema/setup files intended to be run manually in Supabase SQL Editor.

Auth/session flow:

- Supabase browser auth signs users in on `/login`.
- `/api/auth/session` writes the `sb-access-token` HTTP-only cookie for server routes/layouts.
- `/api/auth/landing` returns `/cad` when the logged-in user has `cad:access`, otherwise `/membership`.
- `/cad/layout.tsx` validates the cookie, resolves the user, and redirects users without `cad:access` back to `/membership`.
- `/membership/page.tsx` now redirects users with `cad:access` to `/cad`.

Permissions:

- Permission keys are centralized in `src/lib/permissions.ts`.
- `getUserPermissions()` combines founder/system roles, `access_roles`, `access_certifications`, and legacy `profiles.role = admin`.
- Admin API routes should use `requirePermission()` where granular permissions matter, or `requireAdmin()` for legacy admin-only areas.

Data model:

- Existing membership/access schema is in `supabase/membership-access-schema.sql`.
- Existing dispatch/civilian/audit schemas are in `supabase/dispatch-schema.sql`, `supabase/civilian-schema.sql`, and `supabase/audit-log-schema.sql`.
- New department/FTO/partner additions are in `supabase/department-fto-partner-schema.sql`.

## Completed Work

Login and membership routing:

- Added `GET /api/auth/landing`.
- Updated `/login` to route accepted/CAD-approved users directly to `/cad`.
- Updated `/membership` to server-redirect users with `cad:access` to `/cad`.

Staff bypass:

- Extended `POST /api/admin/users` with `bypass_approved`, optional role IDs, and optional certification IDs.
- Added `PATCH /api/admin/users/[userId]/bypass-access`.
- Bypass sets `profiles.membership_status = interview_accepted`, creates/updates a membership application row, grants the `member` role, optionally assigns role/cert IDs, and writes a `membership_bypassed` audit event.
- `components/admin-dashboard/UsersAccessAdmin.tsx` now supports creating approved users and bypassing selected existing users.

Departments, ranks, certs, and permissions:

- Added `supabase/department-fto-partner-schema.sql`.
- Added `access_departments`.
- Extended `access_roles` with `department_key`, `rank_order`, and `role_kind`.
- Extended `access_certifications` with `department_key` and `certification_kind`.
- Seeded departments and many rank roles/certs from the provided departments Google Doc.
- Added permission keys: `departments:manage`, `fto:manage`, `cad:fto`, `reports:write`, `reports:review`.
- Updated role/cert admin APIs and `AccessManager` UI to expose department and kind fields.

FTO:

- Added `/cad/fto` using `components/fto/FtoMdt.tsx`.
- Added `/admin/fto` using `components/admin-dashboard/FtoAdmin.tsx`.
- Added `/api/fto` for FTO-assigned trainee data, notes, and checklist progress.
- Added `/api/admin/fto` for staff assignment and checklist item management.
- SQL adds FTO templates, checklist items, assignments, progress, and notes.
- Default checklist categories include orientation, officer safety, ethics, force policy, vehicle ops, community relations, radio, report writing, custody, patrol, investigations, tactical communication, traffic, self-initiated activity, and agency-specific items.

Partner system:

- Added `/api/partner` for partner request, accept, and end actions.
- SQL adds `partner_requests` and `partner_sessions`.
- Officer MDT now includes a Partner Unit panel.
- Accepting a partner request creates a combined dispatch unit with partner metadata and removes individual dispatch unit rows for those callsigns.

Audit logs:

- `/api/admin/audit-logs` now accepts `limit` and `cursor`.
- Default page size is 50, max 100.
- `AuditAdmin` has a fixed-height scroll area, next/previous controls, and in-memory page caching by search/cursor.

Dispatch tones:

- Removed `tone-board` from the dispatch module type and module rail.
- Added a main `Tones` button in dispatch terminal header and command center quick actions.
- Existing audio behavior is reused inside a compact popout.

MDT reports:

- Report actions from lookup context open the writer directly.
- Report drafts now store `mentions`, `officers`, and structured `parties` metadata.
- Suspects/witnesses/vehicles/weapons are duplicate-safe and removable.
- Officers involved are prefilled with the reporting officer and can be added/removed.
- Saved report review renders mentions and officers involved.

Verification completed:

- `npm.cmd run lint` passes.
- `npm.cmd run build` passes.

## Pending Tasks / Follow-Up

Database rollout:

- Run `supabase/department-fto-partner-schema.sql` manually in Supabase.
- Confirm RLS needs after real deployment. Most new FTO/partner work goes through server APIs with service-role access, but direct table reads/writes may need tighter policies later.

Dev server:

- There was an existing Next dev server lock for this repo on port `3000` with PID `55684`, but localhost probes timed out.
- Next refused a second dev server for the same repo. Stop the stale process before running `npm.cmd run dev`.

FTO polish:

- FTO workspace currently links to normal MDT instead of embedding a full trainee CAD view.
- Admin FTO checklist supports adding items but not full item deletion/reordering/template creation yet.
- Add assignment completion/paused flows and staff-facing progress summaries.

Partner polish:

- Partner sessions are server-backed, but restoring original callsigns after session end depends on local storage for the current browser.
- Add explicit decline/cancel actions.
- Add dispatcher-side partner controls if desired.
- Consider preserving individual unit history instead of deleting individual unit rows when a combined unit activates.

Reports polish:

- Mentions are saved and insertable into narrative, but no rich-text editor exists yet.
- Mention chips do not deep-link to every entity type yet.
- Report metadata is stored in `civilian_records.metadata`; no standalone reports table exists yet.

Departments/roles:

- The seed file includes the major ranks/certs from the document, but future department edits should happen through admin UI or SQL updates.
- Some document sections, especially DOJ/Government/SATR/Civilian ranks, may need more complete rank-role seeding depending on how the community wants access structured.

## Important Implementation Details

Do not bypass permission helpers:

- Use `requirePermission()` for granular server routes.
- Use `getUserPermissions()` for CAD access decisions.
- Keep service-role Supabase access in server-only code.

Next 16 conventions:

- Route handler dynamic params are promises, e.g. `params: Promise<{ userId: string }>`.
- `proxy.ts` is the supported middleware-equivalent file.
- Route handlers are not cached by default.

Audit:

- Use `writeAuditLog()` for sensitive admin/member/access changes.
- Current audit event types are listed in `src/lib/auditLog.ts`.

SQL:

- Schema files should remain additive and rerunnable.
- Avoid dropping or truncating existing Supabase data.
- New schema file is intentionally separate: `supabase/department-fto-partner-schema.sql`.

Large client components:

- `components/officer-mdt/OfficerMdt.tsx` and `components/dispatch/DispatchWorkstation.tsx` are large, stateful client components.
- Keep edits scoped and run both lint and build after changing them.
- The React lint config flags direct synchronous state-setting loads in effects; use the repo pattern of deferring initial loads with `setTimeout(..., 0)` or queueing work.

Windows local commands:

- PowerShell blocks `npm.ps1`; use `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run dev`.
