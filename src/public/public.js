/* =========================================================================
   The public roadmap: no sign-in, customer-facing items only.

   Reads /api/public-roadmap, which is already stripped and sorted into
   sections by api/shared/customerView.js; this page only filters it.
   Uses esc() and DISCLAIMER from render.js, and monthLabel() and
   downloadPublicRoadmapPdf() from pdf.js.
   ========================================================================= */

(function(){
  const app = document.getElementById('app');
  const state = { cat: 'all', sec: 'all', q: '' };
  let view = null;

  const plain = html => { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, ' '); return d.textContent; };
  const catOf = id => (view.categories.find(c => c.id === id) || { label: id }).label;

  function matches(it){
    if (state.cat !== 'all' && it.cat !== state.cat) return false;
    if (!state.q) return true;
    const key = [it.name, plain(it.desc), catOf(it.cat), it.requires, it.audience, monthLabel(it.month)].join(' ').toLowerCase();
    return state.q.split(/\s+/).every(w => key.indexOf(w) !== -1);
  }
  function filtered(){
    return Object.assign({}, view, { sections: view.sections.map(s =>
      Object.assign({}, s, { items: state.sec === 'all' || state.sec === s.id ? s.items.filter(matches) : [] })) });
  }

  function cardHTML(it){
    return `<article class="pcard">
      <div class="pcard-top">
        <span class="pcard-month">${esc(monthLabel(it.month))}</span>
        <span class="pcard-area"><span class="dot c-${esc(it.cat)}"></span>${esc(catOf(it.cat))}</span>
      </div>
      <h3>${esc(it.name)}</h3>
      <div class="pcard-desc">${it.desc}</div>
      ${it.requires ? `<p class="pcard-req"><b>Requires:</b> ${esc(it.requires)}</p>` : ''}
      ${it.audience ? `<p class="pcard-for">Used by ${esc(it.audience)}</p>` : ''}
    </article>`;
  }

  function renderSections(){
    const f = filtered();
    const shown = f.sections.filter(s => s.items.length);
    document.getElementById('sections').innerHTML = shown.length
      ? shown.map(s => `<section class="psec psec-${esc(s.id)}">
          <div class="wrap">
            <h2>${esc(s.label)} <span class="psec-n">${s.items.length}</span></h2>
            <div class="pgrid">${s.items.map(cardHTML).join('')}</div>
          </div>
        </section>`).join('')
      : '<p class="pnone">Nothing matches that filter. Clear the search or choose another area or time.</p>';
  }

  /* the same loader as the internal board: up for at least 3 s from page
     open, however fast the roadmap arrives */
  const LOADER_MIN_MS = 3000;
  function loaderShown(){
    const left = LOADER_MIN_MS - performance.now();
    return left > 0 ? new Promise(r => setTimeout(r, left)) : Promise.resolve();
  }

  const TOPBAR = `<div class="topbar">
  <div class="wrap">
    <span class="logo brand">
      <picture><source srcset="/shared/brand/static/voca-mixed.png" media="(prefers-reduced-motion: reduce)"><img src="/shared/brand/webp/voca-mixed.webp" alt="Voca" width="112" height="30"></picture>
      <span class="brand-sep"></span>
      <picture><source srcset="/shared/brand/static/audiocodes-white.png" media="(prefers-reduced-motion: reduce)"><img src="/shared/brand/webp/audiocodes-white.webp" alt="AudioCodes" width="173" height="24"></picture>
    </span>
  </div>
</div>`;

  function render(){
    const pills = (name, list, cur) => list.map(([v, l]) =>
      `<button data-${name}="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('');
    document.title = view.product + ' Roadmap';
    app.innerHTML = TOPBAR + `
<header class="hero">
  <div class="wrap">
    <h1>${esc(view.product)} Roadmap</h1>
    <p class="lede">${esc(DISCLAIMER)}</p>
    ${view.updated ? `<div class="hero-facts"><div class="hfact"><div class="k">Updated</div><div class="v plain">${esc(view.updated)}</div></div></div>` : ''}
  </div>
</header>
<div class="filterbar">
  <div class="wrap">
    <div class="seg" role="group" aria-label="Filter by area">${pills('cat',
      [['all', 'All']].concat(view.categories.map(c => [c.id, c.short || c.label])), state.cat)}</div>
    <div class="seg" role="group" aria-label="Filter by section">${pills('sec',
      [['all', 'All']].concat(view.sections.filter(s => s.items.length).map(s => [s.id, s.label])), state.sec)}</div>
    <div class="fb-end">
      <div class="finder">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="7" cy="7" r="4.7"/><path d="M10.5 10.5 14.5 14.5"/></svg>
        <input type="search" id="finder" placeholder="Search capabilities" aria-label="Search the roadmap">
      </div>
      <button class="xl-btn" id="dlPdf" title="Download this view as a PDF"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 2v8M4.5 6.8 8 10.3l3.5-3.5M2.5 13.5h11"/></svg>PDF</button>
    </div>
  </div>
</div>
<div id="sections"></div>`;

    app.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const key = b.dataset.cat !== undefined ? 'cat' : 'sec';
      state[key] = b.dataset[key];
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      renderSections();
    }));
    document.getElementById('finder').addEventListener('input', e => {
      state.q = e.target.value.trim().toLowerCase(); renderSections();
    });
    document.getElementById('dlPdf').addEventListener('click', () => downloadPublicRoadmapPdf(filtered()));
    renderSections();
  }

  fetch('/api/public-roadmap', { headers: { 'Accept': 'application/json' } })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(v => loaderShown().then(() => { view = v; render(); }))
    .catch(() => loaderShown().then(() => {
      app.innerHTML = TOPBAR + '<div class="boot"><h2>The roadmap could not be loaded</h2>' +
        '<p>Please try again in a moment.</p><button class="retry" onclick="location.reload()">Try again</button></div>';
    }));
})();
