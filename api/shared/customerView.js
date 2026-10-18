/* =========================================================================
   What the public, no-sign-in roadmap is allowed to see.

   A whitelist, not a blacklist: only the fields named below leave this
   function, so a field added to the data model later stays internal until
   someone adds it here on purpose. br, requestor (customer names), pm,
   patch, the regions and every cf:false item never reach the public page.

   Each item lands in one section, from its train's status and its month
   ("YYYY-MM": the item's own month if set, otherwise its train's),
   measured from `now`:

     released   Available trains, or items with a delivered build (patch),
                released in the last 12 months. No month: the first month
                of the train's quarter.
     progress   In development trains, up to 6 months ahead
     upcoming   Planned trains, up to 3 months ahead
     planned    Planned trains, 4 to 6 months ahead

   Hidden: Direction trains, anything further than 6 months out, and
   anything still to come that has no month.
   ========================================================================= */

const SECTIONS = [
  { id: 'released', label: 'Recently released' },
  { id: 'progress', label: 'In progress' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'planned',  label: 'Planned' }
];

const BACK = 12, AHEAD = 6, SOON = 3;               /* months */

const MONTH_RX = /^(\d{4})-(0[1-9]|1[0-2])$/;

/* "2027-03" -> a month count, so months compare and subtract as numbers */
function monthIndex(s){
  const m = MONTH_RX.exec(String(s || '').trim());
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null;
}
function monthOf(index){
  return Math.floor(index / 12) + '-' + String(index % 12 + 1).padStart(2, '0');
}
/* "Q4 2026 (Oct 11th)" -> 2026-10 */
function quarterStart(q){
  const m = /Q([1-4])\s*(\d{4})/i.exec(String(q || ''));
  return m ? Number(m[2]) * 12 + (Number(m[1]) - 1) * 3 : null;
}

function sectionOf(train, item, at, now){
  const status = String(train.status || '');
  if (/available/i.test(status) || item.patch){
    if (at == null) at = quarterStart(train.quarter);
    return at != null && at > now - BACK && at <= now + AHEAD ? 'released' : null;
  }
  if (/direction/i.test(status) || at == null || at > now + AHEAD) return null;
  if (/development/i.test(status)) return 'progress';
  return at <= now + SOON ? 'upcoming' : 'planned';
}

function customerView(data, now){
  /* PM switch "Block public roadmap": the page shows an under-construction
     screen, and the feed carries no roadmap data at all */
  if (data.meta && data.meta.publicBlocked === true) return { blocked: true };
  const d = now || new Date();
  const nowIdx = d.getUTCFullYear() * 12 + d.getUTCMonth();
  const buckets = {};
  SECTIONS.forEach(s => { buckets[s.id] = []; });

  (data.trains || []).forEach(t => (t.items || []).forEach(it => {
    if (it.cf !== true || it.rnd === true) return;     /* Internal R&D never goes public */
    let at = monthIndex(it.month);
    if (at == null) at = monthIndex(t.month);
    const sec = sectionOf(t, it, at, nowIdx);
    if (!sec) return;
    if (at == null) at = quarterStart(t.quarter);
    buckets[sec].push({
      name:     String(it.name || ''),
      desc:     String(it.desc || ''),
      cat:      String(it.cat || ''),
      audience: String(it.audience || ''),
      requires: String(it.requires || ''),
      month:    monthOf(at),
      ver:      String(t.ver || '')
    });
  }));

  /* released: newest first; everything else: soonest first */
  Object.keys(buckets).forEach(k => buckets[k].sort((a, b) =>
    k === 'released' ? (a.month < b.month ? 1 : a.month > b.month ? -1 : 0)
                     : (a.month < b.month ? -1 : a.month > b.month ? 1 : 0)));

  const m = data.meta || {};
  return {
    product:    String(m.product || ''),
    title:      String(m.title || ''),
    updated:    String(m.updated || ''),
    asOf:       monthOf(nowIdx),
    categories: (data.categories || []).map(c => ({ id: String(c.id), label: String(c.label || ''), short: String(c.short || c.label || '') })),
    sections:   SECTIONS.map(s => ({ id: s.id, label: s.label, items: buckets[s.id] }))
  };
}

module.exports = { customerView, monthIndex, MONTH_RX, SECTIONS };
