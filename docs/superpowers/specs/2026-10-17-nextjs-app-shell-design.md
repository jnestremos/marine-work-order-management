# Phase 1: Next.js application shell

## Purpose

Build the foundation for the Marine Work Order Management dashboard: a Next.js App Router app whose sticky reviewer bar can switch vessel, role, and member, and whose main area shows an empty workspace for that member. Data lives in a typed fixture. The authenticated user lives in a Zustand store. Supabase, cookie auth, management screens, and work orders come in later phases.

This phase is done when a reviewer can open the app, switch among the sample people, see the matching empty workspace, refresh without losing that session, and use the same flow on a narrow screen.

## Later phases

These are out of this spec:

1. Supabase schema, row level security, seed data, and the entity relationship diagram.
2. Cookie-backed session storage, swapped in behind the storage adapter below.
3. Admin management of users, roles, vessels, and assignments.
4. Work order lifecycle: create, progress, solution, attest, and reject.
5. Production deployment and the live URL.

## Stack

- Next.js App Router, TypeScript, ESLint, and Tailwind CSS, created with `create-next-app` at the repository root (no `src` directory).
- shadcn/ui for `Select` and `Skeleton`.
- Zustand with the `persist` middleware.
- Vitest for store tests.
- npm as the package manager.
- The `@/` import alias points at the repository root.

## Architecture

`app/layout.tsx` and `app/page.tsx` are Server Components. They render structure and pass slots. They do not read the session.

The authenticated user lives in a Zustand store. Only client components import that store. The store holds `vesselId`, `role`, and `memberId`. The member is the authenticated user. Actions on the store keep the three dropdowns valid.

Persistence uses Zustand `persist` through a storage adapter. This phase’s adapter is `localStorage`. The Supabase phase replaces the adapter with a cookie implementation. The store shape, the bar, and the views stay as they are.

The store is created with `skipHydration: true`. `SessionReady` calls `rehydrate()` once after mount. The store exposes `hasHydrated`, set to true at the end of rehydration whether the saved payload was valid or had to be replaced. `SessionReady` renders a skeleton until `hasHydrated` is true. The server HTML never paints one member and then swaps to the stored member.

A fixture module with no browser APIs describes vessels, members, and assignments. The store validates every selection against that fixture.

## Component boundaries

The server layout renders one client boundary, `SessionReady`, and passes the bar and the page through as children. After hydration, `SessionReady` shows those children.

`SessionBar` is a client island in the layout. It composes `VesselSelect`, `RoleSelect`, `MemberSelect`, and `ActiveIdentity`. Each select reads the slice it needs and writes through one store action.

The home page renders `SessionSwitch` and passes four server views as slots: `AdminHome`, `CaptainHome`, `CrewHome`, and `EmptyRole`. `SessionSwitch` reads the store and chooses one slot. When `memberId` is set, it chooses the slot for that member’s role. When `memberId` is empty, it renders `EmptyRole`.

Personalized identity stays in `ActiveIdentity`. The role views contain static copy.

## File hierarchy

React components use PascalCase. Modules under `lib` use camelCase. App Router files keep the names Next.js requires. shadcn files keep the names the CLI writes.

```text
app/
  layout.tsx                      Server. Document shell, renders SessionReady
  page.tsx                        Server. Passes the four view slots
  globals.css

components/
  session/
    SessionReady.tsx              Client. Rehydrates the store, then shows the app
    SessionBar.tsx                Client. Sticky bar
    VesselSelect.tsx              Client
    RoleSelect.tsx                Client
    MemberSelect.tsx              Client
    ActiveIdentity.tsx            Client
    SessionSwitch.tsx             Client. Chooses one server slot
  views/
    AdminHome.tsx                 Server
    CaptainHome.tsx               Server
    CrewHome.tsx                  Server
    EmptyRole.tsx                 Server
  ui/                             shadcn output (select.tsx, skeleton.tsx)

lib/
  utils.ts                        shadcn class name helper
  fixtures/
    marine.ts                     Vessels, members, assignments
  session/
    types.ts                      Role, member, vessel, and session types
    store.ts                      Store factory, resolveSession, and app singleton
    storage.ts                    Persist adapter
    store.test.ts                 Vitest tests
```

`app/layout.tsx` imports `SessionReady` and `SessionBar`. `app/page.tsx` imports `SessionSwitch` and the four views. Later phases add feature folders beside these, such as `components/work-orders/` and `lib/supabase/`, and add routes under `app/`. The session bar remains in the root layout so those routes inherit it.

## Session model

```ts
type Role = "admin" | "captain" | "crew"

type SessionState = {
  vesselId: string
  role: Role
  memberId: string | null
}
```

Display labels for roles are Admin, Captain, and Crew. Stored values are the lowercase union above.

`createSessionStore({ vessels, members, assignments, storage })` returns a Zustand store. The app singleton `useSessionStore` is created with the marine fixture and the `localStorage` adapter. Tests call the factory with a memory adapter. The persisted slice is `vesselId`, `role`, and `memberId` under the key `marine-session`.

`resolveSession(raw, fixture)` is a pure function. It returns the session to keep and whether that session must be written back. The persist rehydration path and the tests both call it.

The storage adapter matches Zustand’s synchronous storage shape: `getItem`, `setItem`, and `removeItem`. `storage.ts` exports the `localStorage` adapter used by the app. Store writes catch a throwing `setItem` and leave the in-memory state in place.

### Fixture

Array order is the selection order. “First” means the first item in these arrays that passes the filter.

Vessels:

| id | name | active |
| --- | --- | --- |
| `vessel_horizon` | MV Horizon | yes |
| `vessel_aurora` | MV Aurora | yes |
| `vessel_retired` | MV Retired | no |

Members:

| id | name | role | active |
| --- | --- | --- | --- |
| `member_avery` | Avery Chen | admin | yes |
| `member_blake` | Blake Ortiz | captain | yes |
| `member_casey` | Casey Nguyen | crew | yes |
| `member_drew` | Drew Patel | captain | yes |
| `member_eden` | Eden Brooks | crew | no |

Assignments:

| member | vessels |
| --- | --- |
| Avery Chen | MV Horizon, MV Aurora |
| Blake Ortiz | MV Horizon |
| Casey Nguyen | MV Horizon |
| Drew Patel | MV Aurora |
| Eden Brooks | MV Horizon |

MV Aurora has no active crew member, so the empty-role state is reachable in the running app. Eden Brooks is inactive and assigned to MV Horizon, so the member list must ignore them. MV Retired is inactive and must not appear in the vessel select.

The default session is `vessel_horizon`, `admin`, `member_avery`.

### Who appears in each select

- Vessel options are the active vessels, in fixture order.
- Role options are always Admin, Captain, and Crew, in that order.
- Member options are members who are active, whose role equals the selected role, and who are assigned to the selected vessel, in fixture order.

### Actions

**Set vessel.** An id that is missing or belongs to an inactive vessel leaves the state unchanged. For an active vessel, keep the current role when at least one member option exists for that role on the new vessel, and set `memberId` to the first of those members. Otherwise walk Admin, Captain, Crew and take the first role that has a member option, then set `memberId` to the first of those members. When the vessel has no active assigned members, leave the role as it was and set `memberId` to `null`.

**Set role.** Set the role, then set `memberId` to the first member option for that role on the current vessel. When there is no option, set `memberId` to `null`. A value outside `admin`, `captain`, and `crew` leaves the state unchanged.

**Set member.** Set `memberId` when the member is active, their role equals the current role, and they are assigned to the current vessel. Any other id leaves the state unchanged.

Changing vessel from MV Horizon while Casey Nguyen (crew) is selected lands on Avery Chen (admin) for MV Aurora, because Aurora has no active crew and Admin is the first role that has a member. Changing vessel from MV Horizon while Blake Ortiz (captain) is selected lands on Drew Patel (captain) for MV Aurora, because captain still has a member there.

### Restoring a session

On rehydration, replace the payload with the default session and write that default back when any of these are true:

- The payload is missing or is not valid JSON.
- `vesselId` is missing from the fixture or the vessel is inactive.
- `role` is not `admin`, `captain`, or `crew`.
- `memberId` is non-null and that member is missing, inactive, not assigned to the stored vessel, or has a role other than the stored role.

A payload with a valid vessel, a valid role, and `memberId: null` is kept when that role has no member options on that vessel. It is replaced with the default when that role does have member options, so a refresh does not sit on an empty role that could be filled.

When `setItem` throws, keep the in-memory session and continue to apply the dropdown rules. If a restore decided to write the default and that write throws, the in-memory session is still the default.

## Interface

The bar is sticky to the top of the viewport, full width, with a bottom border and padding.

On viewports at least 640px wide, the bar is one row: three selects with visible labels (Vessel, Role, Member), then `ActiveIdentity` aligned to the end of the row. Each select trigger has a minimum width of 10rem.

Below 640px, the three selects stack at full width, in the same order, and `ActiveIdentity` sits on the following line. The skeleton uses that same layout, with skeleton blocks in place of the three triggers, the identity line, and the page heading.

`ActiveIdentity` shows `{name} · {Role label} · {vessel name}` when a member is selected. When `memberId` is null it shows `{Role label} · {vessel name} · No member selected`.

The member select’s empty item reads `No active members for this role.` It is not a selectable member.

Each select uses the shadcn `Select` component so mouse and keyboard operation, focus, and the listbox behavior come from that primitive. Labels are visible text associated with each control.

`SessionReady` shows that skeleton until `hasHydrated` is true, so the page does not jump from an empty header to the real bar.

View copy:

| View | Heading | Body |
| --- | --- | --- |
| `AdminHome` | Admin | User, role, vessel, and assignment management will be added in a later phase. |
| `CaptainHome` | Captain | Creating and reviewing work orders will be added in a later phase. |
| `CrewHome` | Crew | Assigned work orders will be added in a later phase. |
| `EmptyRole` | No member selected | No active members for this role on this vessel. |

## Error handling

Phase 1 has no network and no write API. The failure paths are the restore rules and a throwing storage adapter, both specified above. The fixture always contains the default admin on an active vessel, and this phase has no delete path, so the default session always resolves.

## Testing

`lib/session/store.test.ts` runs under Vitest. Action cases use `createSessionStore` with the marine fixture and a memory storage adapter. Restore cases call `resolveSession` with the marine fixture. The tests do not touch `localStorage`.

Required cases:

- A new store resolves to MV Horizon, Admin, and Avery Chen.
- Changing from MV Horizon to MV Aurora while Blake Ortiz is selected keeps the captain role and selects Drew Patel.
- Changing from MV Horizon to MV Aurora while Casey Nguyen is selected selects Avery Chen and the admin role.
- Changing role to captain on MV Horizon selects Blake Ortiz.
- Changing role to crew on MV Aurora sets `memberId` to null.
- MV Retired is absent from vessel options. Eden Brooks is absent from MV Horizon’s crew options.
- A missing payload, malformed JSON, an inactive vessel, and an inactive member each restore the default session and write it back.
- A stored Aurora crew session (`vessel_aurora`, `crew`, `null`) is kept, because that role has no member options.
- A stored Horizon crew session with `memberId: null` is replaced with the default, because Casey Nguyen is a valid option.
- A `setItem` that throws leaves the in-memory session usable, including a following role change.

Responsive layout, keyboard use of the selects, and the hydration skeleton are verified in the browser while the shell is built. An automated browser suite waits until a later phase has real workflows.

## Decisions

- One Zustand store in a single layout, with `localStorage` behind an adapter, so cookie auth can replace storage later without rewriting the shell.
- Server Components own the layout, the page, and the four views. Client components are the hydration gate, the bar, the selects, the identity line, and the slot switch.
- PascalCase applies to components we author. `lib` stays camelCase. `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/ui/*`, and `lib/utils.ts` keep the framework and CLI names.
