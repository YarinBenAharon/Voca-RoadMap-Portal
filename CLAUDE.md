# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

The **Voca CIC release roadmap portal**: a public read-only roadmap board with
a Microsoft-SSO-gated editor behind it, hosted on Azure Static Web Apps. No
framework, no bundler, no transpilation — plain browser JavaScript plus three
Node Azure Functions. Python appears only in `tools/` (build helpers); the
`.venv` and `.idea` folders are leftover PyCharm scaffolding.

See `DEPLOYMENT.md` for the Azure and GitHub setup procedure,
`INFRASTRUCTURE.md` for the resources it was actually deployed to, and
`USING-THE-PORTAL.md` for the non-technical guide given to editors — keep that
one accurate if you change the editor's wording or publishing behavior.

## Standing constraint: the design does not change

This portal was built by slicing an existing single-file editor apart, not by
rewriting it. The stylesheet, the board runtime and the markup helpers that
ship are **byte-identical** to the originals, and they must stay that way.

`tools/verify_shared_assets.py` enforces this and runs in CI before every
deploy. Do not "improve" the layout, copy, colours or interaction patterns
while working on infrastructure. If a feature genuinely cannot be built
without changing the look or the flow, raise it rather than deciding alone.

`Voca_CIC_Release_Roadmap_EDITOR-3.html` at the repository root is the
**frozen original** — the standalone editor the portal is cut from, and the
reference the verification diffs against. `..._edit_mode.html` and
`..._view_mode.html` are its superseded predecessors, kept for history. All
three are outside `app_location` and are never deployed. Do not edit them.

When a new standalone editor supersedes this one, update `ORIGINAL`, the line
ranges and the anchors at the top of `tools/verify_shared_assets.py`, then
re-cut the shared assets and `seed.json` from it rather than hand-merging.
The anchor check exists so a stale line number fails loudly instead of
silently slicing the wrong bytes.

## Layout

```
src/                            app_location — everything served to browsers
├── index.html                  public board; fetches /api/roadmap, renders it
├── 403.html                    signed in but no editor role
├── edit/index.html             the editor, gated on the "editor" role
├── staticwebapp.config.json    routes, role gating, headers
└── shared/
    ├── base.css                THE stylesheet  (frozen slice)
    ├── board.js                initBoard + initDrawer  (frozen slice)
    ├── render.js               markup helpers (frozen slice) + buildBodyHTML
    └── session.js              the sign-in control
api/                            managed Azure Functions, Node 20
├── roadmap/                    GET  /api/roadmap        anonymous
├── publish/                    POST /api/publish        editor only
├── snapshots/                  GET  /api/snapshots      editor only
├── draft/                      GET/PUT/DELETE /api/draft  editor only, per user
└── shared/
    ├── seed.json               the roadmap as originally supplied
    ├── store.js                blob storage
    ├── auth.js                 x-ms-client-principal parsing
    ├── validate.js             structural check on an incoming roadmap
    ├── publishHtml.js          the standalone exported file
    └── assets/                 GENERATED copy of src/shared — git-ignored
tools/
├── sync_api_assets.py          copies src/shared into api/shared/assets
└── verify_shared_assets.py     proves the design has not drifted
```

## The one rule that matters: one copy of the design

`src/shared/` is the single source for the stylesheet, the board runtime and
the markup helpers. Three things consume them and must never get their own
copy:

1. the public page, via `<link>`/`<script src>`
2. the editor, the same way
3. `api/shared/publishHtml.js`, which inlines them into the standalone
   exported file

The API is a separate deployment unit and cannot read `src/`, so
`tools/sync_api_assets.py` copies the three files into `api/shared/assets/` at
build time. That directory is **generated and git-ignored** — never edit or
commit it. Run the sync locally if you are testing the API:

```bash
python tools/sync_api_assets.py
python tools/verify_shared_assets.py
```

The original file had the board runtime duplicated (once as a string, once
live) and the stylesheet triplicated. That is gone. Do not reintroduce it.

## Data model

One JSON document, seeded from `api/shared/seed.json` and thereafter stored in
blob storage as `current/roadmap.json`, wrapped as
`{ publishedAt, publishedBy, data }`.

```
meta      { product, vendor, title, lede, updated, currentRelease, latestBuild, nextTrain }
categories[] { id, label, short }            // filter segments and dot colors
trains[]  { id, ver, quarter, phase: now|next|later, status, head, note,
            maint: { title, note, drops: [{ ver, when }] },
            items: [{ name, desc, cat, patch, br, cf, requestor, pm }] }
evaluation[] { t, d }
cloud     { note, latestVersion, regions: [{ id, name, flag, version,
                                             lastDeploy, nextVersion, nextDate, publish }] }
```

Fields with non-obvious behavior:

- `br`, `requestor`, `pm` — internal Jira reference, requesting customer and
  responsible PM. **None of them reach the public page.** `laneHTML` emits
  their `data-` attributes and the requester/PM badges only when `editable` is
  true, the drawer rows are gated on `opts.showBr`, and they are excluded from
  the public search key. The public page always passes `editable:false`.
  Anything similarly sensitive added later must follow the same pattern —
  `requestor` in particular holds customer names on an NDA board.
- `cf` — "customer facing", drives the star badge and the filter toggle. It
  does *not* hide anything.
- `withCf()` backfills `cf`, `requestor` and `pm` on drafts saved before those
  fields existed, matching by feature *name* against the seed — so renaming a
  feature loses its backfill. This is why the editor still fetches the seed
  (`/api/roadmap?withSeed=1`) even though Reset is gone.
- `publish: false` marks a region internal. `regionsHTML({ showAll })` keeps it
  in the editor with an `internal` pill and drops it from the public page.
- Train `id`s come from `uid()`; dates are ISO and render through `fmtDate()`;
  versions compare with `cmpVer()`.

`api/shared/validate.js` rejects a malformed roadmap before it can replace the
live one. Extend it when you add a required field.

## Auth model

Free plan, Microsoft's pre-configured Entra ID provider. Two consequences that
drive the whole design:

- **Any Microsoft account can sign in**, including personal ones. Signing in
  therefore grants nothing. The GitHub provider is disabled by a 404 route rule.
- Authorization is the custom **`editor`** role, granted per person through
  Role Management invitations in the Azure portal (25-user platform cap).

`/edit*` and `/api/publish` are gated by `allowedRoles` in
`staticwebapp.config.json`. `api/shared/auth.js` re-checks the role from
`x-ms-client-principal` inside the publish function, so a routing mistake
alone cannot make the roadmap writable. Keep both locks.

Restricting sign-in to the AudioCodes tenant would require a custom Entra app
registration, which is **Standard plan only**. That was a deliberate trade.

## Editor conventions

Unchanged from the original, and worth preserving:

- **Mutate through `touch()`**, never bare. It memoizes horizontal scroll,
  marks dirty, saves the draft, and re-renders. Re-render replaces `#app`
  wholesale, which is why scroll is restored by hand.
- **Actions are event-delegated.** One document-level `click` handler switches
  on `data-act` (`iedit`, `iadd`, `iup`, `idown`, `icf`, `idel`, `tedit`,
  `tup`, `tdown`, `maint`, `eedit`, `eadd`, `redit`, `radd`) plus `data-t` and
  `data-i`. Add affordances by emitting a `data-act` button and a branch, not
  by wiring `onclick` into render output.
- **All editing goes through `openModal(title, bodyHTML, onSave, extraFooter)`.**
  Return `false` from `onSave` to keep it open on validation failure; read
  fields with `val(m, name)`.
- **Escape everything interpolated** with `esc()`.
- `toast(msg)` for feedback; `confirm()` before anything destructive.
- **Customer preview** is CSS-only: `body.preview` hides `.ed-tools`,
  `.iconb`, `.tile-br`, `.internal`, `.dedit`, `.lane-add` and
  `.region.is-internal`. Any new editor chrome inside the board must be added
  to that rule, or preview starts lying about what customers see.

The editor top bar is deliberately minimal: **Add train**, **Header**,
**Customer preview**, the publish state, **Publish**, and the session control.

**The constraint is horizontal space, not capability.** The bar scrolls
sideways once it overflows, and users were having to drag it left to reach
controls — so Export/Import JSON, Reset and the Under evaluation modal were
cut. Anything added here costs width and pushes **Publish** out of view.

So: do not add a top-level button. If the editor needs another action, put it
behind a single overflow control, or inside an existing modal. Capability is
welcome; width is not.

One consequence: nothing in the UI can now load a roadmap over the live one,
and rollback is an operator task via `/api/snapshots`.

### Drafts and publishing

Drafts are written to `localStorage` immediately and mirrored to
`drafts/<userId>.json` in blob storage after a 1.5s debounce, so a draft is
not trapped in one browser. `boot()` fetches the published roadmap and both
drafts, and takes whichever draft was written last; if `publishedAt` is newer
than that, the bar offers to load the published copy. There is no locking.

Drafts are **private per user** — the blob is keyed on the caller's own
`userId` from the client principal, and `api/draft` will not read or write
anyone else's. They are deliberately **not** validated: a draft is work in
progress and may be incomplete. Shape is enforced only at publish.

Publishing, and the "Load it" link, both **delete** the draft — once the work
is live or abandoned there is no draft, and the bar says so. Keep that
invariant; a lingering draft that equals the published copy makes the status
line lie.

**Publish** POSTs the data to `/api/publish`, which validates it, writes an
immutable snapshot, then overwrites `current/roadmap.{json,html}`. It is live
immediately — `/api/roadmap` is sent `no-cache`.

## Verifying a change

There is no test suite. After editing:

1. `python tools/verify_shared_assets.py` — must pass, or the design drifted.
2. `python tools/sync_api_assets.py` if you touched `src/shared/`.
3. Open the editor, exercise the affected modal or board behavior.
4. Toggle **Customer preview**; confirm no internal chrome, `br` reference or
   internal region leaks.
5. Publish, then load `/` in a private window — that is the real check that the
   public page, the editor and the exported file still agree.
