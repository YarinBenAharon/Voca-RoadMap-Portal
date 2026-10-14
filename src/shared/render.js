/* ── helpers ──────────────────────────────────────────────────────────── */
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function phaseClass(p, status){
  if (p === 'now') return 'p-now';
  if (p === 'next') return 'p-next';
  return /direction/i.test(status || '') ? 'p-dir' : 'p-later';
}
function cmpVer(a, b){
  const A = String(a||'').split('.').map(Number), B = String(b||'').split('.').map(Number);
  for (let i = 0; i < Math.max(A.length, B.length); i++){
    const x = A[i]||0, y = B[i]||0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function regionStatus(r, latest){
  if (cmpVer(r.version, latest) >= 0) return { cls:'cur', label:'Current' };
  const a = String(r.version||'').split('.'), b = String(latest||'').split('.');
  if (a[0] !== b[0] || a[1] !== b[1]) return { cls:'old', label:'Major update due' };
  return { cls:'roll', label:'Update scheduled' };
}
function fmtDate(iso){
  if (!iso) return '—';
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p = String(iso).split('-');
  return p.length === 3 ? `${Number(p[2])} ${M[Number(p[1])-1]} ${p[0]}` : iso;
}
function catLabel(data, id){
  const c = (data.categories||[]).find(c => c.id === id);
  return c ? c.label : id;
}
function initials(n){
  return String(n||'').trim().split(/\s+/).slice(0,2).map(w => w[0] ? w[0].toUpperCase() : '').join('');
}
function yearOf(q){ const m = String(q||'').match(/(\d{4})/); return m ? m[1] : ''; }

/* Year ruler above the lanes: one cell per run of same-year trains */
function axisHTML(trains){
  const groups = [];
  (trains||[]).forEach(t => {
    const y = yearOf(t.quarter);
    const last = groups[groups.length-1];
    if (last && last.y === y) last.n++; else groups.push({ y, n:1 });
  });
  return groups.map(g =>
    `<div class="axis-cell" style="width:calc(${g.n} * var(--lane-w) + ${g.n-1} * var(--lane-gap))"><b>${esc(g.y)}</b></div>`
  ).join('');
}

/* ── one lane ─────────────────────────────────────────────────────────── */
function laneHTML(data, t, opts){
  const editable = !!(opts && opts.editable);
  const tiles = (t.items||[]).map((it, ii) => {
    const key = (it.name + ' ' + it.desc + ' ' + catLabel(data, it.cat) + ' ' + (it.audience||'') + (it.cf ? ' customer facing' : '')
      + ' ' + (editable ? [it.br||'', it.requestor||'', it.pm||''].join(' ') : '')).toLowerCase();
    return `<button class="tile" data-cat="${esc(it.cat)}" data-k="${esc(key)}"
      data-t="${esc(t.id)}" data-i="${ii}"
      data-name="${esc(it.name)}" data-desc="${esc(it.desc)}"
      data-catlabel="${esc(catLabel(data, it.cat))}" data-audience="${esc(it.audience||'')}"
      data-train="${esc(t.ver)}" data-q="${esc(t.quarter)}"
      data-status="${esc(t.status)}" data-build="${esc(it.patch||'')}" data-cf="${it.cf ? '1' : '0'}"
      ${editable ? `data-br="${esc(it.br||'')}" data-requestor="${esc(it.requestor||'')}" data-pm="${esc(it.pm||'')}"` : ''}>
      <span class="tile-name">${esc(it.name)}</span>
      <span class="tile-meta">
        ${it.cf ? '<span class="tile-cf" title="Customer facing feature"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 1.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.2.8-4.7L1.2 6.2l4.7-.7z"/></svg>Customer facing</span>' : ''}
        <span class="tile-area"><span class="dot c-${esc(it.cat)}"></span><span class="tile-cat">${esc(catLabel(data, it.cat))}</span></span>
        ${it.patch ? '<span class="tile-build">'+esc(it.patch)+'</span>' : ''}
      </span>
      ${editable && (it.requestor || it.pm) ? `<span class="tile-people">
        ${it.requestor ? '<span class="tile-req" title="Requested by '+esc(it.requestor)+'"><svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1.5c-2.7 0-5 1.4-5 3.1V14h10v-1.4c0-1.7-2.3-3.1-5-3.1z"/></svg><b>'+esc(it.requestor)+'</b></span>' : ''}
        ${it.pm ? '<span class="tile-pm" title="Responsible PM: '+esc(it.pm)+'"><i>'+esc(initials(it.pm))+'</i>'+esc(it.pm.split(' ')[0])+'</span>' : ''}
      </span>` : ''}
    </button>`;
  }).join('');

  const maint = t.maint ? `<div class="lane-maint">
      <h4>${esc(t.maint.title)}</h4>
      <p>${esc(t.maint.note)}</p>
      <div class="drops">${(t.maint.drops||[]).map(d => `<div class="drop">${esc(d.ver)}</div>`).join('')}</div>
    </div>` : '';

  return `<section class="lane ${phaseClass(t.phase, t.status)}" data-lane="${esc(t.id)}">
    <div class="lane-head">
      <div class="lane-topline">
        <span class="lane-ver">${esc(t.ver)}</span>
        <span class="lane-q">${esc(t.quarter)}</span>
      </div>
      <span class="lane-pill">${esc(t.status)}</span>
      <div class="lane-theme">${esc(t.head)}</div>
      <div class="lane-count"><span data-count>${(t.items||[]).length}</span> capabilities</div>
      ${editable ? `<div class="ed-tools">
        <button class="tbtn" data-act="tup" data-t="${esc(t.id)}" title="Move earlier">←</button>
        <button class="tbtn" data-act="tdown" data-t="${esc(t.id)}" title="Move later">→</button>
        <button class="tbtn" data-act="tedit" data-t="${esc(t.id)}">Edit train</button>
      </div>` : ''}
    </div>
    <div class="lane-body">
      ${tiles}
      <p class="lane-empty" hidden>Nothing here in this view.</p>
      ${maint}
      ${editable ? `<div class="ed-tools">
        <button class="tbtn add" data-act="iadd" data-t="${esc(t.id)}">Add capability</button>
        <button class="tbtn add" data-act="maint" data-t="${esc(t.id)}">${t.maint ? 'Maintenance builds' : 'Add builds'}</button>
      </div>` : ''}
    </div>
  </section>`;
}

/* ── regions ──────────────────────────────────────────────────────────── */
function regionsHTML(data, opts){
  const showAll = !!(opts && opts.showAll);
  const editable = !!(opts && opts.editable);
  const latest = data.cloud.latestVersion;
  const cards = (data.cloud.regions||[])
    .filter(r => showAll || r.publish !== false)
    .map(r => {
      const s = regionStatus(r, latest);
      const idx = data.cloud.regions.indexOf(r);
      return `<div class="region">
        <div class="region-top">
          <span class="flag">${esc(r.flag||'')}</span>
          <span class="nm">${esc(r.name)}</span>
          ${r.publish === false ? '<span class="internal">internal</span>' : ''}
          ${editable ? `<button class="iconb" data-act="redit" data-i="${idx}" style="margin-left:auto">✎</button>` : ''}
        </div>
        <div class="region-build">${esc(r.version)}</div>
        <div class="region-when">Deployed ${esc(fmtDate(r.lastDeploy))}</div>
        <div class="region-foot">
          <span class="st ${s.cls}">${s.label}</span>
          ${r.nextVersion ? `<span class="region-next">next<b>${esc(r.nextVersion)}</b>${r.nextDate ? esc(fmtDate(r.nextDate)) : ''}</span>` : ''}
        </div>
      </div>`;
    }).join('');

  return `<div class="sec-head">
      <div>
        <h2>Where each region is today</h2>
        <p class="sub">${esc(data.cloud.note||'')}</p>
      </div>
      <div class="latest"><span class="k">Latest build</span><b>${esc(latest)}</b></div>
    </div>
    <div class="regions">${cards}${editable ? '<div class="region" style="border-style:dashed;display:flex;align-items:center;justify-content:center"><button class="tbtn add" data-act="radd">Add region</button></div>' : ''}</div>`;
}

/* Shown under the page title, on the board and in the PDF download. */
const DISCLAIMER = 'This roadmap describes our current plans and is provided for planning purposes only. ' +
  'It is not a commitment, promise or legal obligation, and it does not form part of any contract. ' +
  'Content, sequencing and timing can change without notice. ' +
  'Do not base purchasing decisions on capabilities that have not yet been released.';

/* Shown above the DISCLAIMER, in the same places: this board is for
   AudioCodes accounts only; customers get the public roadmap (/public),
   linked from the board's top bar. */
const INTERNAL_NOTICE = 'Internal use only. Do not share this roadmap, or screenshots, PDFs or exports of it, ' +
  'outside AudioCodes. For customers, send the public roadmap link (see page header).';

/* Between the filter bar and the board: what the Customer facing flag means.
   HTML, not escaped. */
const CF_NOTE = '<b>Note:</b> Features marked ' +
  '<span class="tile-cf"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 1.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.2.8-4.7L1.2 6.2l4.7-.7z"/></svg>Customer facing</span> ' +
  'appear on the public roadmap and are visible to all customers.';

/* Hard-coded at the owner's request: on the board the IO region is always
   shown first and named "Trial cloud", whatever the data says. The editor
   still shows and edits the regions as stored. */
const TRIAL_REGION_ID = 'io', TRIAL_REGION_NAME = 'Trial cloud';
function withTrialRegionFirst(data){
  const regions = (data.cloud && data.cloud.regions) || [];
  const i = regions.findIndex(r => r.id === TRIAL_REGION_ID);
  if (i === -1) return data;
  const trial = Object.assign({}, regions[i], { name: TRIAL_REGION_NAME });
  return Object.assign({}, data, { cloud: Object.assign({}, data.cloud,
    { regions: [trial].concat(regions.filter((_, j) => j !== i)) }) });
}

/* The detail panel's "Area" and "For" labels live in the frozen board.js; this
   renames them to "Product Area" and "Used by" each time the panel opens.
   Registered after initDrawer(), so it runs after the panel has been filled. */
function relabelDrawer(){
  document.addEventListener('click', function(e){
    if (!e.target.closest('.tile') || e.target.closest('[data-act]')) return;
    document.querySelectorAll('#drawer .dmeta .k').forEach(function(k){
      if (k.textContent === 'Area') k.textContent = 'Product Area';
      else if (k.textContent === 'For') k.textContent = 'Used by';
    });
  });
}

/* ── published body  (shared by the live site and the standalone export) ──
   The markup below is the body of buildPublishHTML() moved here verbatim so
   the hosted page and the exported file are generated from one source.     */
function buildBodyHTML(data, opts){
  const sessionSlot = (opts && opts.session) ? '<div class="sess" id="session"></div>' : '';
  /* live page only: the standalone exported file has no /public to point at */
  const publicLink = (opts && opts.session)
    ? '<a class="pub-link" href="/public/" target="_blank" rel="noopener" title="The customer-facing roadmap, no sign-in needed">' +
      'Public roadmap<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7.5 8.5"/></svg></a>'
    : '';
  /* only the live page loads xlsx.js and pdf.js; the published standalone file has no download */
  const dlIcon = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 2v8M4.5 6.8 8 10.3l3.5-3.5M2.5 13.5h11"/></svg>';
  const downloadBtn = (opts && opts.download)
    ? '<button class="xl-btn" id="dlXlsx" title="Download the roadmap as an Excel workbook">' + dlIcon + 'Excel</button>' +
      '<button class="xl-btn" id="dlPdf" title="Download the roadmap as a PDF">' + dlIcon + 'PDF</button>'
    : '';
  const m = data.meta;
  const segs = ['<button data-cat="all" aria-pressed="true">All</button>']
    .concat((data.categories||[]).map(c =>
      `<button data-cat="${esc(c.id)}" aria-pressed="false" title="${esc(c.label)}">${esc(c.short||c.label)}</button>`)).join('');
  const lanes = (data.trains||[]).map(t => laneHTML(data, t, { editable:false })).join('\n');
  /* animated WebP, with the static last frame for reduced motion; the
     exported file passes data URIs instead (see publishHtml.js) */
  const L = (opts && opts.logos) || {
    ac:   '/shared/brand/webp/audiocodes-white.webp', acStill:   '/shared/brand/static/audiocodes-white.png',
    voca: '/shared/brand/webp/voca-mixed.webp',       vocaStill: '/shared/brand/static/voca-mixed.png' };
  const logo = (src, still, alt, w, h) =>
    `<picture><source srcset="${still}" media="(prefers-reduced-motion: reduce)"><img src="${src}" alt="${alt}" width="${w}" height="${h}"></picture>`;
  return `<div class="topbar">
  <div class="wrap">
    <span class="logo brand">${logo(L.voca, L.vocaStill, 'Voca', 112, 30)}<span class="brand-sep"></span>${logo(L.ac, L.acStill, 'AudioCodes', 173, 24)}</span>
    <span class="nda">AudioCodes users only</span>
    ${publicLink}
    ${sessionSlot}
  </div>
</div>

<header class="hero">
  <div class="wrap">
    <h1>${esc(m.product)} Release Roadmap</h1>
    <p class="lede internal-notice">${esc(INTERNAL_NOTICE)}</p>
    <p class="lede">${esc(DISCLAIMER)}</p>
    <div class="hero-facts">
      <div class="hfact"><div class="k">Current release</div><div class="v">${esc(m.currentRelease)}</div></div>
      <div class="hfact"><div class="k">Next release</div><div class="v">${esc(m.nextTrain)}</div></div>
      <div class="hfact"><div class="k">Updated</div><div class="v plain">${esc(m.updated)}</div></div>
    </div>
  </div>
</header>

<div class="filterbar">
  <div class="wrap">
    <div class="seg" role="group" aria-label="Filter by area">${segs}</div>
    <button class="cf-toggle" id="cfToggle" aria-pressed="false" title="Show only customer-facing features"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 1.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.2.8-4.7L1.2 6.2l4.7-.7z"/></svg>Customer facing <span class="cf-n">${(data.trains||[]).reduce((a,t)=>a+(t.items||[]).filter(i=>i.cf).length,0)}</span></button>
    <div class="fb-end">
      <div class="finder">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="7" cy="7" r="4.7"/><path d="M10.5 10.5 14.5 14.5"/></svg>
        <input type="search" id="finder" placeholder="Search capabilities" aria-label="Search capabilities">
      </div>
      ${downloadBtn}
    </div>
  </div>
</div>

<section class="boardsec" id="board-section">
  <p class="cf-note">${CF_NOTE}</p>
  <div class="bleed">
    <button class="navb prev" aria-label="Earlier releases">&lsaquo;</button>
    <button class="navb next" aria-label="Later releases">&rsaquo;</button>
    <div class="scroller" id="scroller" tabindex="0" aria-label="Release timeline, scrolls horizontally">
      <div>
        <div class="axis">${axisHTML(data.trains||[])}</div>
        <div class="board" id="board">${lanes}</div>
      </div>
    </div>
  </div>
  <div class="progress"><i></i></div>
  <p class="boardhint">Scroll sideways or swipe.<span class="kbd-only"> The left and right arrow keys work too.</span> Select any capability for detail.</p>
  <p class="noresult" id="noresult">Nothing matches that filter. Clear the search or choose another area.</p>
</section>

<section class="section alt" id="regions">
  <div class="wrap">${regionsHTML(withTrialRegionFirst(data), { showAll:false, editable:false })}</div>
</section>

<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Capability detail">
  <button class="dclose" aria-label="Close">&#10005;</button>
  <div class="drawer-head"><div class="eyebrow"></div><h3></h3></div>
  <div class="drawer-body"></div>
</aside>`;
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { DISCLAIMER, INTERNAL_NOTICE, withTrialRegionFirst, relabelDrawer, esc, phaseClass, cmpVer, regionStatus, fmtDate, catLabel,
                     yearOf, initials, axisHTML, laneHTML, regionsHTML, buildBodyHTML };
}
