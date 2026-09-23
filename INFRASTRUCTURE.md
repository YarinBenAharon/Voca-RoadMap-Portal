# Infrastructure

What actually exists in Azure for the Voca CIC roadmap portal. `DEPLOYMENT.md`
covers how it was built; this file is the reference for operating it.

## Resources

| | |
| --- | --- |
| Resource group | `VocaCIC-Roadmap-Portal-RG` |
| Static Web App | `VocaCIC-Roadmap` (Free plan) |
| Storage account | `vocacicroadmapportal` |
| Blob container | `roadmap` (created automatically on first publish) |

## Addresses

| | |
| --- | --- |
| Public URL | https://vocacic-roadmap.voca.cloud |
| Azure default hostname | https://delightful-river-06a551903.1.azurestaticapps.net |
| Editor | https://vocacic-roadmap.voca.cloud/edit |
| Signed-in identity | https://vocacic-roadmap.voca.cloud/.auth/me |

The custom domain is a `CNAME` on `VocaCIC-Roadmap` in the `voca.cloud` zone,
pointing at the Azure default hostname above.

## Application settings

Set on the Static Web App under **Settings → Environment variables**.

| Name | Purpose |
| --- | --- |
| `ROADMAP_STORAGE` | Connection string for `vocacicroadmapportal`. Without it, publishing fails and the portal serves the seed roadmap. |
| `ROADMAP_CONTAINER` | Optional. Container name, defaults to `roadmap`. |

`AZURE_STATIC_WEB_APPS_API_TOKEN` is the deployment token, and lives as a
GitHub Actions repository secret rather than an Azure app setting.

## What lives where

| Content | Location |
| --- | --- |
| Live roadmap data | `roadmap/current/roadmap.json` in blob storage |
| Live roadmap as a standalone file | `roadmap/current/roadmap.html` |
| Every past publish | `roadmap/snapshots/<timestamp>.{json,html}` |
| Each editor's unpublished draft | `roadmap/drafts/<user id>.json`, private to that person |
| The originally supplied roadmap | `api/shared/seed.json` in the repository |

Published content exists **only in the storage account**. The repository holds
the seed and nothing more, so restoring from git alone would roll the roadmap
back to its original content. Back up the container if the roadmap matters.

## Identity

Sign-in uses the pre-configured Microsoft Entra ID provider, so **any**
Microsoft account can complete a login. That grants nothing on its own.
Editing requires the custom **`editor`** role, granted per person under
**Settings → Role management**.

> Invitations must be issued to the person's **UPN**, which in this tenant is
> not the same as their email address. See `DEPLOYMENT.md` section 6.

The GitHub provider is disabled by a 404 route rule, so Microsoft accounts are
the only way in.

## Editors

Keep this list current as people are added and removed in Role management.

| UPN | Added | Notes |
| --- | --- | --- |
| | | |
