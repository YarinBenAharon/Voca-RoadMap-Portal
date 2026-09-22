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
| Move a capability up or down, or to another release train | Click the tile, then **Move up** / **Move down**, or change the train in **Edit** |
| Add a capability | **Add capability** at the bottom of a release train |
| A release train (version, target quarter, status, heading) | **Edit train** in the train's header |
| Reorder release trains | the **←** and **→** buttons in the train's header |
| Add a release train | **Add release train**, at the far right of the board |
| Maintenance builds | **Maintenance builds** / **Add builds** at the bottom of a train |
| The page heading, intro text, current release, "updated" date | **Header** in the top bar |
| The "Under evaluation" list | **Under evaluation** in the top bar |
| Regional deployment status | the ✎ button on a region card |

Target quarters are planning intentions. The footer of the public board says so
in full legal terms, so the board itself is not a commitment.

---

## What happens if you edit but don't publish

This is the most important thing to understand, and the most common source of
confusion.

Your changes are saved **continuously, into your own browser only**. The top
bar shows **Saved** a moment after each edit. Nothing is sent anywhere.

| | |
| --- | --- |
| Can customers see it? | **No.** The public board still shows the last published version. |
| Can other editors see it? | **No.** Not even them. Drafts are per person, per browser. |
| Will it survive closing the tab? | **Yes.** Reopen the editor and your draft is still there. |
| Will it survive restarting the computer? | **Yes.** |
| Will I see it on a different computer? | **No.** The draft lives in the browser you made it in. |
| Will I see it in a different browser on the same computer? | **No.** Same reason. |
| Could it be lost? | **Yes** — clearing your browsing data, or using private/incognito mode, discards it. |

While you have an unpublished draft, the top bar says **Local draft, not
published yet**. That text is your reminder that the public board has not
moved.

**If a draft matters and you are not ready to publish**, press **Export JSON**
in the top bar. That downloads a file you can keep or send to a colleague, and
load later with **Import JSON**. It is the only way to move work between
machines or hand it to someone else.

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

Three things are stripped from the public board automatically. You do not have
to remember to remove them.

- **Jira / BR references.** Visible on tiles in the editor, never on the public
  board, and not searchable there either.
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
| **Could not save locally** | Your browser is refusing to store the draft — often private browsing mode. Your work is at risk; export it. |
| **Showing the published roadmap** | What you see matches what the public sees |
| **Local draft, not published yet** | You have changes the public cannot see |
| **Newer version published by [name]** | Someone else published while you were away |
| **Published [time] by [name]** | Confirmation of your publish just now |
| **Offline** | The editor could not reach the service; reload the page |

---

## Recovering an earlier version

Every publish is kept permanently, so a bad publish is always reversible.

The simple habit that makes this painless: press **Export JSON** before any
large change. Restoring is then **Import JSON** followed by **Publish**.

If you did not export, earlier versions can still be retrieved. While signed in
as an editor, open:

```
https://vocacic-roadmap.voca.cloud/api/snapshots
```

That lists every publish, newest first, each with an `id`. To fetch one, add
its id:

```
https://vocacic-roadmap.voca.cloud/api/snapshots?id=THE-ID
```

Save that page as a file, load it with **Import JSON**, check it, and
**Publish**. If that feels fiddly, it is — ask whoever maintains the portal to
do it.

---

## A warning about Reset

The red **Reset** button does **not** return you to the currently published
roadmap. It returns to the roadmap **as originally supplied** in September
2026, discarding everything published since.

It only affects your own draft, so the public board is untouched until you
press Publish. But if you Reset and then Publish, the live roadmap goes back to
its original content.

If what you actually want is "undo my draft and start from what is live",
that is the **Load it** link in the top bar, or simply Reset and then reload
one of the snapshots above. When in doubt, Export JSON first.

---

## If something goes wrong

**I signed in but there is no Edit link, or /edit says I am not an editor.**
Your account has not been granted the editor role. Note that invitations are
issued to your **UPN**, which in our tenant is not the same as your email
address — the portal owner has the details.

**My changes have vanished.**
Almost always a different browser, a different computer, or cleared browsing
data. Drafts do not travel. Check whether the top bar says *Showing the
published roadmap*, which means there is no draft in this browser.

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
