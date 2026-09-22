# Deploying the Voca CIC roadmap portal

Target shape, at **https://vocacic-roadmap.voca.cloud**:

| URL | Who | What |
| --- | --- | --- |
| `/` | anyone, no sign-in | the published roadmap, read-only |
| `/edit` | accounts holding the `editor` role | the editor, unchanged |
| `/api/roadmap` | anyone | the published roadmap as JSON |
| `/api/publish` | `editor` only | replaces the live roadmap, instantly |
| `/api/snapshots` | `editor` only | past publishes, for rollback |

Running cost: the Static Web App is on the **Free** plan; the storage account
holds a few hundred KB and costs cents per month.

Do the steps in order. The custom domain comes before handing out editor
access on purpose — an invitation link embeds whichever hostname you pick when
you generate it, so adding the domain first saves re-issuing them.

---

## 1. Prerequisites

- An Azure subscription with permission to create a Static Web App and a
  storage account.
- A GitHub account that can create a repository.
- Ability to add a **CNAME** record in the `voca.cloud` DNS zone.
- Nothing needs installing locally — the GitHub Actions pipeline builds the API.

## 2. Push the code to GitHub

Create an **empty** private repository on GitHub (no README, no .gitignore),
then from `C:\PythonProjects\Roadmap Portal`:

```bash
git init -b main
git add .
git commit -m "Voca CIC roadmap portal: static web app, SSO editing, publishing"
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

The first push will not deploy anything yet — the deployment token comes next.

## 3. Create the Static Web App

Azure portal → **Create a resource** → **Static Web App**:

| Field | Value |
| --- | --- |
| Plan type | **Free** |
| Deployment source | **Other** |
| Region | pick the one nearest your users |

Choosing **Other** rather than GitHub stops Azure generating its own workflow
file, which would conflict with the one already in `.github/workflows/`.

Once created: **Overview → Manage deployment token** → copy it. In GitHub go to
**Settings → Secrets and variables → Actions → New repository secret**:

- Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Value: the deployment token

Then re-run the workflow (**Actions** tab → latest run → **Re-run all jobs**),
or push any commit. The site deploys in about two minutes.

From the **Overview** page, copy the generated URL — something like
`happy-sand-0a1b2c3d4.azurestaticapps.net`. You need it in step 5. Open it: the
roadmap loads, showing the content **as originally supplied**, because the API
falls back to `api/shared/seed.json` until the first publish.

## 4. Create the storage account for published content

Azure portal → **Create a resource** → **Storage account**:

| Field | Value |
| --- | --- |
| Performance | Standard |
| Redundancy | LRS is plenty |
| Region | same as the Static Web App |

Leave public blob access **disabled** — the API reads and writes with the
connection string; nothing is served from the storage account directly.

Copy **Security + networking → Access keys → key1 → Connection string**.

Back on the Static Web App: **Settings → Environment variables** (older portals
call it *Configuration*) → add:

| Name | Value |
| --- | --- |
| `ROADMAP_STORAGE` | the connection string you just copied |

Optionally `ROADMAP_CONTAINER` if you want a container name other than
`roadmap`. The container is created automatically on first use.

Save. The API restarts within a few seconds.

## 5. Custom domain: vocacic-roadmap.voca.cloud

This is a subdomain, so a single **CNAME** is all that is needed — the TXT
record you may have seen in Azure's documentation applies only to apex
(root) domains.

**First, in DNS.** In the `voca.cloud` zone, add:

| Setting | Value |
| --- | --- |
| Type | `CNAME` |
| Host / Name | `VocaCIC-Roadmap` |
| Value / Points to | the `…azurestaticapps.net` hostname from step 3 |
| TTL | leave at the default |

Hostnames are case-insensitive, so `VocaCIC-Roadmap` and `vocacic-roadmap`
are the same record. Azure displays it lowercase.

**Then, in Azure.** Static Web App → **Settings → Custom domains** → **+ Add**
→ **Custom domain on other DNS**:

1. Enter `vocacic-roadmap.voca.cloud`, then **Next**
2. Hostname record type: **CNAME**
3. **Add**

Azure checks the record is visible in public DNS and then issues a free TLS
certificate automatically. If validation fails, the record has not propagated
yet — wait and retry rather than changing anything. Propagation is usually
minutes but can take considerably longer depending on the zone's TTL.

Set it as the default domain once it resolves, so the `azurestaticapps.net`
URL redirects to it. The Free plan allows two custom domains.

## 6. Grant people the editor role

Sign-in itself is open — on the Free plan Microsoft's pre-configured provider
lets any Microsoft account complete a login. Access is decided by the `editor`
role, which you grant per person:

1. Static Web App → **Settings → Role management** → **Invite**
2. Authorization provider: **Microsoft Entra ID** (`aad`)
3. Invitee: the person's **email address**
4. Domain: **vocacic-roadmap.voca.cloud**
5. Role: `editor` — spelled exactly, lowercase
6. Validity: up to 168 hours (7 days)
7. **Generate**, then send the invite link to that person

They open the link, sign in once, and the role sticks. Someone who signs in
without the role sees a page explaining they are not an editor; `/edit` and
the publish API both refuse them.

Removing someone: same screen, select their row, **Delete**. Access is revoked
within a few minutes.

> The invitation system caps at **25 users** — a platform limit of the Free and
> Standard plans alike. Going beyond it needs the Standard plan and a roles
> function.

## 7. Verify

- [ ] `https://vocacic-roadmap.voca.cloud` loads the board in a private window,
      with no sign-in, over HTTPS with a valid certificate
- [ ] the board scrolls sideways, area filters work, search works, tiles open
- [ ] **Sign in** appears top-right; signing in with a non-editor account and
      visiting `/edit` shows the "not an editor" page
- [ ] an invited editor sees **Edit roadmap** top-right and reaches `/edit`
- [ ] the editor makes a change and clicks **Publish**; a private window on `/`
      shows it after a refresh
- [ ] no Jira/BR reference appears anywhere on `/` — check a tile you know has one
- [ ] a region marked internal (`publish: false`) does not appear on `/`

---

## Operating it

**Rolling back.** Every publish writes an immutable snapshot to
`snapshots/<timestamp>.json` and `.html` in the container. `GET /api/snapshots`
lists them newest first; `GET /api/snapshots?id=<timestamp>` returns one. To
restore, load that JSON into the editor with **Import JSON** and hit
**Publish**. The standalone `.html` beside it is also directly openable if you
just need to read or forward an old version.

**Two editors at once.** Drafts stay in each editor's own browser, as before.
On opening `/edit`, if the live roadmap was published more recently than your
local draft was saved, the bar says so and offers to load it — so nobody
silently publishes over someone else's work. There is no locking; coordinate
before large edits.

**Nothing published yet, or storage misconfigured.** `/api/roadmap` falls back
to the supplied roadmap, so the portal always renders something. If **Publish**
fails with a storage message, check the `ROADMAP_STORAGE` app setting.

**Where content actually lives.** `api/shared/seed.json` is the frozen starting
point committed to the repo; everything published after that exists only in the
storage account. Back the container up if the roadmap matters — the repository
alone will not restore it.

**Changing the site.** Push to `main` and Actions redeploys. The pipeline runs
`tools/verify_shared_assets.py` first and **fails the deploy** if the
stylesheet, board runtime or markup helpers have drifted from the original
design. See `CLAUDE.md`.
