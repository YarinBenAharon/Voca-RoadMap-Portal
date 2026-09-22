# Deploying the Voca CIC roadmap portal

Target shape:

| URL | Who | What |
| --- | --- | --- |
| `/` | anyone, no sign-in | the published roadmap, read-only |
| `/edit` | accounts holding the `editor` role | the editor, unchanged |
| `/api/roadmap` | anyone | the published roadmap as JSON |
| `/api/publish` | `editor` only | replaces the live roadmap, instantly |
| `/api/snapshots` | `editor` only | past publishes, for rollback |

Running cost: the Static Web App is on the **Free** plan; the storage account
holds a few hundred KB and costs cents per month.

---

## 1. Prerequisites

- An Azure subscription with permission to create a Static Web App and a
  storage account.
- A GitHub account that can create a repository.
- Nothing needs installing locally. The GitHub Actions pipeline builds the API.

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
file, which would conflict with the one in `.github/workflows/`.

Once created: **Overview → Manage deployment token** → copy it. In GitHub go to
**Settings → Secrets and variables → Actions → New repository secret**:

- Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Value: the deployment token

Then re-run the workflow (**Actions** tab → latest run → **Re-run all jobs**),
or push any commit. The site deploys in about two minutes.

At this point `/` loads and shows the roadmap **as originally supplied** — the
API falls back to `api/shared/seed.json` until the first publish.

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

## 5. Grant people the editor role

Sign-in itself is open — on the Free plan Microsoft's pre-configured provider
lets any Microsoft account complete a login. Access is decided by the `editor`
role, which you grant per person:

1. Static Web App → **Settings → Role management** → **Invite**
2. Authorization provider: **Microsoft Entra ID** (`aad`)
3. Invitee: the person's **email address**
4. Domain: your custom domain once step 6 is done, otherwise the
   `*.azurestaticapps.net` one
5. Role: `editor` — spelled exactly, lowercase
6. Validity: up to 168 hours (7 days)
7. **Generate**, then email the invite link to that person

They open the link, sign in once, and the role sticks. Someone who signs in
without the role sees a page explaining they are not an editor; `/edit` and
the publish API both refuse them.

Removing someone: same screen, select their row, **Delete**. Access is revoked
within a few minutes.

> The invitation system caps at **25 users**, which is a platform limit of the
> Free and Standard plans alike. Going beyond that needs the Standard plan and
> a roles function.

## 6. Custom domain

Static Web App → **Settings → Custom domains** → **Add**. Azure gives you the
records to create; typically:

- a **CNAME** from your hostname to the `*.azurestaticapps.net` default hostname
- a **TXT** record for validation

Create them with whoever runs your DNS, then hit **Validate**. HTTPS is issued
automatically. The Free plan allows two custom domains.

After the domain is live, issue future role invitations against it so the
invite links point at the right host.

## 7. Verify

- [ ] `/` loads the board with no sign-in, in a private browsing window
- [ ] the board scrolls sideways, area filters work, search works, tiles open
- [ ] **Sign in** appears top-right; signing in with a non-editor account shows
      the "not an editor" page at `/edit`
- [ ] an invited editor sees **Edit roadmap** top-right and reaches `/edit`
- [ ] the editor makes a change and clicks **Publish**; a private window on `/`
      shows it after a refresh
- [ ] no Jira/BR reference appears anywhere on `/` (check a tile you know has one)
- [ ] a region marked internal (`publish: false`) does not appear on `/`

## Operating it

**Rolling back.** Every publish writes an immutable snapshot to
`snapshots/<timestamp>.json` and `.html` in the container. `GET /api/snapshots`
lists them newest first; `GET /api/snapshots?id=<timestamp>` returns one. To
restore, load that JSON into the editor with **Import JSON** and hit
**Publish**. The standalone `.html` beside it is also directly openable if you
just need to see or send an old version.

**Two editors at once.** Drafts stay in each editor's own browser, as before.
On opening `/edit`, if the live roadmap has been published more recently than
your local draft was saved, the bar says so and offers to load it — so nobody
silently publishes over someone else's work. There is no locking; coordinate
before large edits.

**Nothing published yet / storage misconfigured.** `/api/roadmap` falls back to
the supplied roadmap, so the portal always renders something. If `Publish`
fails with a storage message, check the `ROADMAP_STORAGE` app setting.

**Where content actually lives.** `api/shared/seed.json` is the frozen starting
point committed to the repo; everything published after that lives only in the
storage account. Back the container up if the roadmap matters — the repo alone
will not restore it.
