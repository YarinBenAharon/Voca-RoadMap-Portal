# Using the Voca CIC roadmap portal

A guide for the people who maintain the roadmap and anyone who needs to
understand how it behaves. No technical background assumed.

**Portal:** https://vocacic-roadmap.voca.cloud
**Editor:** https://vocacic-roadmap.voca.cloud/edit

---

## In one minute

The portal has two sides.

**The public board** is what anyone sees at the portal address. No sign-in, no
password. It is read-only.

**The editor** is the same board with editing controls, open only to named
people. You change things there, and they stay private to you until you press
**Publish**. Publishing replaces the public board immediately.

That single idea explains almost everything else in this guide:

> **Nothing you do in the editor is visible to anyone until you press Publish.**

---

## Who can do what

| | Sees the public board | Can sign in | Can edit | Can publish |
| --- | :---: | :---: | :---: | :---: |
| Anyone with the link | yes | — | no | no |
| Signed in, no editor role | yes | yes | no | no |
| Signed in, editor role | yes | yes | yes | yes |

Signing in on its own grants nothing — any Microsoft account can do it. Editing
requires being granted the **editor** role individually. Ask the portal owner
to add you; it takes them about a minute.

Once you have the role, a **Edit roadmap** link appears in the top right of
the public board.

---

## Making a change

1. Go to the editor and sign in with your Microsoft account.
2. Change what you need — the controls are described below.
3. Check your work with the **Customer preview** switch.
4. Press **Publish**.

Everything between steps 2 and 4 is private to you.

### What you can change

| Where | How |
| --- | --- |
| A capability (the tiles on the board) | Click the tile, then **Edit** in the panel that opens |
| Who asked for a capability, and which PM owns it | **Requested by** and **Responsible PM** in the same Edit form. Both suggest names already used elsewhere on the roadmap, so spelling stays consistent. |
| Move a capability up or down, or to another release train | Click the tile, then **Move up** / **Move down**, or change the train in **Edit** |
| Add a capability | **Add capability** at the bottom of a release train |
| A release train (version, target quarter, status, heading) | **Edit train** in the train's header |
| Reorder release trains | the **←** and **→** buttons in the train's header |
| Add a release train | **Add release train**, at the far right of the board |
| Maintenance builds | **Maintenance builds** / **Add builds** at the bottom of a train |
| The page heading, intro text, current release, "updated" date | **Header** in the top bar |
| The "Under evaluation" list | **Edit** on any card in that section, or **Add item** at the end of it |
| Regional deployment status | the ✎ button on a region card |

Target quarters are planning intentions. The footer of the public board says so
in full legal terms, so the board itself is not a commitment.

---

## What happens if you edit but don't publish

This is the most important thing to understand, and the most common source of
confusion.

Your changes are saved **continuously and automatically** — first into this
browser, then a second or two later to your own private copy on the server.
The top bar shows **Saving…** and then **Saved**. There is no save button and
nothing to remember.

| | |
| --- | --- |
| Can customers see it? | **No.** The public board still shows the last published version. |
| Can other editors see it? | **No.** Your draft is private to your account. |
| Will it survive closing the tab? | **Yes.** |
| Will it survive restarting the computer? | **Yes.** |
| Will I see it on a different computer? | **Yes.** Sign in to the editor anywhere and your draft is there. |
| Will it survive clearing my browsing data? | **Yes** — the server copy is fetched again when you next open the editor. |
| Could it be lost? | Only if you discard it yourself, by publishing or by choosing **Load it**. |

While you have an unpublished draft, the top bar says **Local draft, not
published yet**. That text is your reminder that the public board has not
moved — the draft itself is safe.

If the top bar ever reads **Saved on this device only**, the server copy could
not be written — usually a brief network problem. Your work is still in this
browser and will sync on its own; just don't switch machines until it says
**Saved** again.

---

## When two people edit

There is no locking. Two editors can work at the same time, and each sees only
their own draft.

**The portal warns you rather than letting you overwrite blindly.** When you
open the editor, if the live roadmap has been published more recently than your
draft was last saved, the top bar says **Newer version published by [name]**
with a **Load it** link. Loading it replaces your draft with the published
version — you will be asked to confirm, because your own unpublished work is
discarded at that point.

If you ignore the warning and publish, **your version wins** and the other
person's published changes are replaced. The previous version is still
recoverable (see below), but the public board will have changed.

In practice: for anything larger than a small edit, tell the other editors
first.

---

## What customers never see

These are stripped from the public board automatically. You do not have to
remember to remove them.

- **Jira / BR references.** Visible on tiles in the editor, never on the public
  board, and not searchable there either.
- **Requested by** and **Responsible PM.** Shown as badges on the tile and in
  the detail panel while editing; absent from the public board entirely. This
  matters — *Requested by* usually holds a customer or account name, and the
  board is shared outside the company.
- **Regions marked internal.** A region card with the orange *internal* tag is
  editor-only. Set this with the ✎ button on the card.
- **Editing controls** themselves, obviously.

The **Customer preview** switch in the top bar shows you exactly what a
customer sees, without leaving the editor. Use it before every publish. It is
the honest check — it hides precisely what the public board hides.

Separately, capabilities can be flagged **Customer facing** (the star badge).
That flag does *not* hide anything; it drives the "Customer facing" filter that
visitors can toggle on the public board. Both flagged and unflagged
capabilities are public.

---

## Publishing

Press **Publish**. It takes a second or two, then the button reports success
and the top bar shows **Published [time] by [you]**.

- The change is live **immediately**.
- Anyone already looking at the public board sees the old version until they
  refresh the page. There is no automatic refresh.
- Every publish is recorded with who did it and when.

If publishing fails, the message says why and **nothing is changed** — the
public board keeps showing the previous version. The usual cause is a network
problem; try again.

---

## Reading the top bar

| Indicator | Meaning |
| --- | --- |
| **Saved** | Your draft is safely stored in this browser |
| **Saving…** | Momentary, while a change is written |
| **Could not save locally** | This browser is refusing to store the draft — often private browsing mode. The server copy still protects you. |
| **Saved on this device only** | The server copy could not be written. Your work is in this browser and will sync by itself; avoid switching machines until it clears. |
| **Showing the published roadmap** | What you see matches what the public sees |
| **Local draft, not published yet** | You have changes the public cannot see |
| **Newer version published by [name]** | Someone else published while you were away |
| **Published [time] by [name]** | Confirmation of your publish just now |
| **Offline** | The editor could not reach the service; reload the page |

---

## Recovering an earlier version

**Every publish is kept permanently**, so a bad publish is always reversible —
but not by you, from the editor. This is deliberate: the roadmap is edited in
place and there is nothing in the interface that can overwrite it with an old
copy by accident.

You can *see* the history. Signed in as an editor, open:

```
https://vocacic-roadmap.voca.cloud/api/snapshots
```

That lists every publish, newest first, each with an `id`, who published it and
when. Add an id to read that version in full:

```
https://vocacic-roadmap.voca.cloud/api/snapshots?id=THE-ID
```

**To actually restore one, ask whoever maintains the portal.** It is a quick
job for them. Note the id of the version you want and roughly when it was
good.

If you simply want to abandon your own unpublished changes and go back to
what is live, that does not need a restore — use the **Load it** link in the
top bar, described above.

---

## If something goes wrong

**I signed in but there is no Edit link, or /edit says I am not an editor.**
Your account has not been granted the editor role. Note that invitations are
issued to your **UPN**, which in our tenant is not the same as your email
address — the portal owner has the details.

**My changes have vanished.**
Drafts follow your account, so this is rare. Check the top bar: *Showing the
published roadmap* means you have no draft at all — which happens after you
publish, or after choosing **Load it**, both of which deliberately discard the
draft. Also make sure you are signed in as the same person; a draft belongs to
one account.

**I published something by mistake.**
Restore the previous snapshot as described above and publish again. The wrong
version was live in the meantime, so if it was sensitive, say so promptly.

**The public board shows a loading message and never finishes.**
The service behind the board is not responding. Reload; if it persists, the
portal owner needs to check the Azure resources.

**Someone tells me the board is out of date.**
Ask them to refresh the page. If it is still stale, check the top bar in the
editor — the change may be sitting in your browser unpublished.

---

## What the board is made of

Useful vocabulary when discussing changes.

- **Release train** — a version with a target quarter, one column on the board.
  Marked *Available now*, *Committed, in development*, or *Planned*.
- **Capability** — one tile inside a train. Has a description, an area, and
  optionally the maintenance build it shipped in and a Jira reference.
- **Area** — the category used by the colour dots and the filter buttons:
  Agent experience, Routing and queues, AI and automation, Channels and
  integrations, Reporting, Administration and platform.
- **Maintenance builds** — the point releases listed at the bottom of a train.
- **Regions** — the deployment status cards, showing which build each region is
  running.
- **Under evaluation** — requested capabilities being assessed, deliberately
  not tied to any release train.
