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

`Voca_CIC_Release_Roadmap_EDITOR-4.html` at the repository root is the
**frozen original** — the standalone editor the portal is cut from, and the
reference the verification diffs against. It is EDITOR-3 plus the `audience`
("For") item field. `..._EDITOR-3.html`, `..._edit_mode.html` and
`..._view_mode.html` are its superseded predecessors, kept for history. All
four are outside `app_location` and are never deployed. Do not edit them.

When a new standalone editor supersedes this one, update `ORIGINAL`, the line
ranges and the anchors at the top of `tools/verify_shared_assets.py`, then
re-cut the shared assets and `seed.json` from it rather than hand-merging.
The anchor check exists so a stale line number fails loudly instead of
silently slicing the wrong bytes.

Deliberate design changes asked for by the product owner do not touch the
frozen slices. CSS goes in `src/shared/portal.css`, loaded after `base.css`
everywhere `base.css` is (public page, editor, inlined into the exported
file); markup changes go in `buildBodyHTML` and the editor's `render()`. So
far: lane heads reserve two theme lines so lane bodies align; the hero title
is "<product> Release Roadmap" on one line with the `DISCLAIMER` (in
`render.js`) beneath it instead of `meta.lede`, led by the bold
`INTERNAL_NOTICE` (internal only, don't share outside AudioCodes, send
customers the public link once it exists), also in the editor hero and the
PDF; the public roadmap at `/public` never shows it, and the internal board
keeps it, since that board is still internal; the Latest build fact is gone
and Next train reads Next release; the footer is gone; the Under evaluation
section is gone from the board, the editor, the Excel and the PDF (the
`evaluation` data stays); the Regions "Latest build" box is hidden by CSS
(it is in the frozen `regionsHTML`); the filter bar wraps instead of clipping
the area pills; on the board and in the exported file the `io` region is
always shown first and named "Trial cloud" (`withTrialRegionFirst` in
`render.js`, hard-coded at the owner's request; the editor shows the stored
order and name); the editor adds a ✎ at the end of the Regions note
(`cloud.note`, `editCloudNote`), appended after render because the section
head is in the frozen `regionsHTML`; the detail panel's "Area" label reads "Product Area" and "For" reads "Used by"
(`relabelDrawer` in `render.js`, run after `initDrawer`, because the labels are
in the frozen `board.js`); the top bar has no Roadmap / Regions links and its badge
reads "AudioCodes users only", followed by a **Public roadmap** link to `/public`
(live page only, not the standalone export); on the board page the top bar stays
pinned while scrolling, with the filter bar sticking below it (`index.html`); the top bar
shows the animated Voca logo on the left, then the AudioCodes logo beside it,
instead of the "ac" mark; the editor bar shows smaller copies (AudioCodes
hidden under 900px), and `403.html`, on white, uses the untouched `-color`
originals; the board's first-paint loader (`index.html`) shows
`voca-loader.webp`, the colour logo's 3 s stripe motion (frames 0-59, the
text never moves) looped without the 17 s hold, with a gradient "Loading
the roadmap" title and a sliding bar; under `prefers-reduced-motion` the
logo and the bar stand still. The loader stays up at least 3 s from page
open (`LOADER_MIN_MS`), or longer if the roadmap takes longer to arrive. Logos live in `src/shared/brand/` (WebP with a
static PNG for `prefers-reduced-motion`); the exported file carries them as
data URIs. `voca-mixed` is composed frame by frame at the owner's request:
everything from the white logo except the violet-blue accent stripe, which
comes from the colour logo (pixels with x < 96 and blue - red > 60; the
colour logo's slate stripes were lost on the dark bar), with the GIF's timing (60 x 50 ms, then a 17 s hold). They are raster
brand assets from a sales deck: don't otherwise redraw, recolor or crop them,
and swap in Marketing's official masters if they become available.

## Layout

```
src/                            app_location — everything served to browsers
├── index.html                  internal board; fetches /api/roadmap, renders it
├── public/                     the public roadmap, no sign-in (see Public roadmap)
│   ├── index.html, public.js   fetches /api/public-roadmap; sections, filters, PDF
│   └── public.css              on top of base.css
├── 403.html                    signed in but no editor role
├── edit/index.html             the editor, gated on the "editor" role
├── staticwebapp.config.json    routes, role gating, headers
└── shared/
    ├── base.css                THE stylesheet  (frozen slice)
    ├── portal.css              owner-requested overrides on top of base.css
    ├── brand/                  top bar logos: webp/ animated, static/ still
    ├── board.js                initBoard + initDrawer  (frozen slice)
    ├── render.js               markup helpers (frozen slice) + buildBodyHTML
    ├── session.js              the sign-in control
    ├── xlsx.js                 the public page's Excel download (no library;
    │                           public fields, plus BR when the payload has
    │                           br, i.e. for editors; not synced into the API)
    └── pdf.js                  the public page's PDF download (no library;
                                same fields as xlsx.js, CONFIDENTIAL watermark
                                and export timestamp; not synced into the API.
                                downloadPublicRoadmapPdf is the public variant)
api/                            managed Azure Functions, Node 20
├── roadmap/                    GET  /api/roadmap        AudioCodes accounts and editors
├── public-roadmap/             GET  /api/public-roadmap anyone, no sign-in (customerView)
├── publish/                    POST /api/publish        editor only
├── snapshots/                  GET  /api/snapshots      editor only
├── draft/                      GET/PUT/DELETE /api/draft  editor only, per user
└── shared/
    ├── seed.json               the roadmap as originally supplied
    ├── store.js                blob storage
    ├── auth.js                 x-ms-client-principal parsing
    ├── validate.js             structural check on an incoming roadmap
    ├── customerView.js         the public feed: whitelist of fields, cf items, sections
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
`tools/sync_api_assets.py` copies them (plus `portal.css`) into `api/shared/assets/` at
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
meta      { product, vendor, title, lede, updated, currentRelease, latestBuild, nextTrain, publicBlocked? }
          // lede and latestBuild are no longer shown or edited; kept because validate.js requires them
categories[] { id, label, short }            // filter segments and dot colors
trains[]  { id, ver, quarter, month, phase: now|next|later, status, head, note,
            maint: { title, note, drops: [{ ver, when }] },
            items: [{ name, desc, cat, patch, br, cf, rnd, audience, month, requires, requestor, pm }] }
evaluation[] { t, d }
cloud     { note, latestVersion, regions: [{ id, name, flag, version,
                                             lastDeploy, nextVersion, nextDate, publish }] }
```

Fields with non-obvious behavior:

- `br`, `requestor`, `pm` — internal Jira reference, requesting customer and
  responsible PM. **Every viewer sees them read-only** in the board's detail
  panel (Jira, Requested by, Responsible PM, and "Customer facing: No", which
  `relabelDrawer` shortens from the frozen "No, internal" so that "internal"
  is never confused with Internal R&D), at the owner's request; only editors can change them.
  - **Rendering** — `laneHTML` (frozen) still emits their `data-` attributes
    and the tile badges only when `editable` is true. The public page renders
    with `editable:false`, then `withInternalFields()` in `index.html` adds the
    three attributes and search terms to each tile from the data, and opens
    the drawer with `showBr:true`. Tiles show no requester/PM badges.
  - **The payload** — this is safe only because `/api/roadmap` answers
    AudioCodes accounts and editors alone (`auth.isAudioCodes`, see Auth
    model). `publicView.js` now only drops `publish:false` regions for
    non-editors, and `publishedBy` stays blank for them.
    `verify_shared_assets.py` fails if the API loses the domain check.
    `requestor` holds customer names: never relax that check without
    stripping it from the payload again. (The endpoint was once public and
    briefly served real `br` values and customer names to anyone.)
  - **Downloads** — Excel and PDF carry a BR column for everyone, but never
    `requestor` or `pm`, because files travel.
  - **The standalone exported file** still renders with `editable:false` and
    no drawer fields, so it carries none of the three.
- `cf` — "customer facing". On the internal board it drives the star badge
  and the filter toggle and hides nothing. On the public roadmap only `cf:true`
  items appear.
- `rnd` — "Internal R&D". Such items reach only editors and the
  `internal_rnd_group` role: `publicView(data, { rnd })` drops them for
  everyone else, so the board, Excel and PDF lose them together, and
  `customerView` drops them even if `cf` is set. `validate.js` rejects
  `rnd` with `cf`; the edit form clears and locks cf when rnd is ticked.
  The badge, `data-rnd` and search term are added after render by
  `markRnd()` in `render.js` (laneHTML is frozen); Customer preview hides
  `rnd` tiles. An **Internal R&D** filter chip beside Customer facing
  (`initRndFilter()`, layered after the frozen board.js filters; the two
  chips exclude each other) shows in the editor, and on the board when
  `/api/roadmap` returns `seesRnd` (editor or R&D role). Excel and PDF add an Internal R&D column only when the
  payload has `rnd` items. `verify_shared_assets.py` probes both views.
- `month` — `"YYYY-MM"`, on trains and items. The train's month (or, for a
  released train, its release month) is what the public roadmap shows for
  every item in it, as "March 2027". An item's own month overrides it, for a
  capability that ships in another month; normally it is empty. Both are
  edited as **Target month** (train form, item form); `validate.js` checks the
  format. It decides the public section (see Public roadmap), so In
  development and Planned trains need one, or their items don't appear.
- `requires` — optional one-line prerequisite ("A WhatsApp Business Account"),
  shown as "Requires: ..." on the public card and PDF.
- `audience` — free text, who in the customer's organization uses the
  capability ("Administrators, Supervisors"). Shown as **Used by** in the drawer
  (relabelled from the frozen "For" by `relabelDrawer`), the edit form, Excel
  and PDF, only when set, and included in the search key. Public, so it is deliberately
  *not* in `INTERNAL_ITEM_FIELDS` or behind `editable`. Named `audience` rather
  than `for` because `for` is a JS keyword.
- `withCf()` backfills `cf`, `audience`, `requestor` and `pm` (and empty `month`
  and `requires`) on drafts saved before those
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
  A second custom role, **`internal_rnd_group`** (`auth.isRnd`, matched
  case-insensitively), adds read access to Internal R&D items; it grants no
  editing.

**Every route requires sign-in, except the public roadmap.** Rules at the top
of `staticwebapp.config.json` allow `anonymous` on `/public*`,
`GET /api/public-roadmap`, and the four shared files the public page loads
(`base.css`, `render.js`, `pdf.js`, `brand/*`). They must stay above the
`/api/*` (editor) and `/*` rules. Everything else: a catch-all `/*` rule (plus
`/shared/*` and `/api/roadmap*`) allows only `authenticated`, and the 401 override sends
anyone else to the Microsoft sign-in. There is no Sign in button. The top bar
shows a quiet **Sign out** link for everyone, plus a **Voca PM** tag and an
**Edit** button for editors (`session.js`). `api/roadmap` re-checks
`authenticated` itself as a second lock.

**The roadmap is limited to AudioCodes accounts by domain.** Because any
Microsoft account can sign in, `api/roadmap` returns the data only when
`auth.isAudioCodes()` holds (provider `aad`, sign-in name ending in a domain
in `AUDIOCODES_DOMAINS`, today `audiocodes.com`) or the caller is an editor.
Anyone else gets `403 {error:"audiocodes-only"}`, and `index.html` shows "This
roadmap is for AudioCodes accounts only" with a Sign out button. The page
frame and shared assets still load for any signed-in account; only the data
is withheld. Add a domain to `AUDIOCODES_DOMAINS` if some AudioCodes sign-in
names use another one.

`/edit*` and `/api/publish` are gated by `allowedRoles` in
`staticwebapp.config.json`. `api/shared/auth.js` re-checks the role from
`x-ms-client-principal` inside the publish function, so a routing mistake
alone cannot make the roadmap writable. Keep both locks.

Restricting sign-in to the AudioCodes tenant would require a custom Entra app
registration, which is **Standard plan only**. That was a deliberate trade.

## Public roadmap

`/public` is for customers and resellers, with no sign-in. It reads
`/api/public-roadmap`, which returns `customerView(data)` from
`api/shared/customerView.js`. That function is a **whitelist**: items carry
only `name, desc, cat, audience, requires, month, ver`, plus the categories
and `meta.product/title/updated`. `br`, `requestor`, `pm`, `patch`, `cf`, the
regions, `evaluation` and `publishedBy` never leave it, and neither do
`cf:false` items. Add a field to the public page by adding it there on
purpose. `verify_shared_assets.py` runs it on the seed with marker values and
fails on any leak.

**Block public roadmap** (editor top bar) sets `meta.publicBlocked: true`; it
takes effect at Publish like any edit. While it is on, `customerView()` returns
only `{ blocked: true }`, no roadmap data at all, and `/public` shows an
under-construction page (animated Voca logo, "Our roadmap is being updated",
contact your account manager). `verify_shared_assets.py` checks that a
blocked feed is exactly `{"blocked":true}`. Turning it off deletes the key.

Sections are computed on the server from the current month:

| Section | Items |
| --- | --- |
| Recently released | Available trains, or items with `patch`, released in the last 12 months (no month: first month of the train's quarter) |
| In progress | In development trains, up to 6 months ahead |
| Upcoming | Planned trains, up to 3 months ahead |
| Planned | Planned trains, 4 to 6 months ahead |

An item's month is its own `month`, else its train's. Direction trains,
anything more than 6 months out, and anything still to come without a month
are hidden. The page filters by category, by section
(All, Recently released, In progress, Upcoming, Planned; empty sections get no
pill) and by keyword (name, description, category, requires, Used by,
month). Each section heading folds and unfolds its cards (open by default,
remembered while filtering; the PDF still includes folded sections). Its PDF
(`downloadPublicRoadmapPdf` in `pdf.js`) is the filtered view, grouped by
section, with an "AudioCodes" watermark and the export timestamp and no
confidentiality marking. The feed is never cached (`Cache-Control: no-store`,
and the page fetches it with `cache:'no-store'`), and the `/public*` files are
`no-cache` (revalidated on every load), so a publish, including Block public
roadmap, reaches visitors on their next page load. An earlier 5-minute cache
made unblocking look broken.

## Editor conventions

Unchanged from the original, and worth preserving:

- **Mutate through `touch()`**, never bare. It memoizes horizontal scroll,
  marks dirty, saves the draft, and re-renders. Re-render replaces `#app`
  wholesale, which is why scroll is restored by hand.
- **Actions are event-delegated.** One document-level `click` handler switches
  on `data-act` (`iedit`, `iadd`, `iup`, `idown`, `icf`, `idel`, `tedit`,
  `irnd`, `tup`, `tdown`, `maint`, `eedit`, `eadd`, `redit`, `radd`) plus `data-t` and
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

For a local end-to-end check, `node tools/dev_server.js [--data roadmap.json]`
(after `python tools/sync_api_assets.py`) serves `src/` on
http://localhost:8765 with a fake sign-in page offering two test users,
**Voca PM** (editor) and **Regular user** (AudioCodes viewer). It runs the
real API functions with a local folder (`%TEMP%\voca-roadmap-devstore`) in
place of blob storage, so drafts and Publish work. Delete that folder to
start again from `--data`. Keep `--data` files containing customer names out
of this repo.

There is no test suite. After editing:

1. `python tools/verify_shared_assets.py` — must pass, or the design drifted.
2. `python tools/sync_api_assets.py` if you touched `src/shared/`.
3. Open the editor, exercise the affected modal or board behavior.
4. Toggle **Customer preview**; confirm no internal chrome, `br` reference or
   internal region leaks.
5. Publish, then load `/` in a private window — that is the real check that the
   public page, the editor and the exported file still agree.
