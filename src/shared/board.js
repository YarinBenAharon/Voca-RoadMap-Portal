function initBoard(){
  var scroller = document.getElementById('scroller');
  var board    = document.getElementById('board');
  if(!board) return null;
  var segs   = [].slice.call(document.querySelectorAll('.seg button'));
  var tiles  = [].slice.call(board.querySelectorAll('.tile'));
  var lanes  = [].slice.call(board.querySelectorAll('.lane'));
  var finder = document.getElementById('finder');
  var none   = document.getElementById('noresult');
  var bar    = document.querySelector('.progress i');
  var prev   = document.querySelector('.navb.prev');
  var next   = document.querySelector('.navb.next');
  var cat = window.__cat || 'all';
  var cfBtn = document.getElementById('cfToggle');
  var cfOnly = !!window.__cfOnly;

  function apply(){
    var term = finder ? finder.value.trim().toLowerCase() : '';
    var any = false, cfCount = 0;
    tiles.forEach(function(t){
      var base = (cat==='all' || t.dataset.cat===cat) && (!term || (t.dataset.k||'').indexOf(term)!==-1);
      var isCf = t.dataset.cf === '1';
      if(base && isCf) cfCount++;
      var ok = base && (!cfOnly || isCf);
      t.classList.toggle('hidden', !ok);
      if(ok) any = true;
    });
    if(cfBtn){
      var cn = cfBtn.querySelector('.cf-n'); if(cn) cn.textContent = cfCount;
      cfBtn.setAttribute('aria-pressed', String(cfOnly));
    }
    lanes.forEach(function(l){
      var n = l.querySelectorAll('.tile:not(.hidden)').length;
      var c = l.querySelector('[data-count]'); if(c) c.textContent = n;
      var e = l.querySelector('.lane-empty'); if(e) e.hidden = n !== 0;
      var m = l.querySelector('.lane-maint'); if(m) m.style.display = (cat==='all' && !term && !cfOnly) ? '' : 'none';
    });
    if(none) none.classList.toggle('show', !any);
    sync();
  }
  segs.forEach(function(b){
    b.setAttribute('aria-pressed', String(b.dataset.cat === cat));
    b.addEventListener('click', function(){
      cat = b.dataset.cat; window.__cat = cat;
      segs.forEach(function(o){ o.setAttribute('aria-pressed', String(o===b)); });
      apply();
    });
  });
  if(finder) finder.addEventListener('input', apply);
  if(cfBtn) cfBtn.addEventListener('click', function(){
    cfOnly = !cfOnly; window.__cfOnly = cfOnly; apply();
  });

  function step(){
    var l = board.querySelector('.lane:not(.hidden)');
    return l ? l.getBoundingClientRect().width + 18 : 320;
  }
  function sync(){
    if(!scroller) return;
    var max = scroller.scrollWidth - scroller.clientWidth;
    if(bar){
      var frac = scroller.clientWidth / Math.max(scroller.scrollWidth, 1);
      bar.style.width = Math.min(100, frac*100) + '%';
      bar.style.marginLeft = (max > 0 ? (scroller.scrollLeft/max)*(100 - frac*100) : 0) + '%';
    }
    if(prev) prev.disabled = scroller.scrollLeft <= 4;
    if(next) next.disabled = scroller.scrollLeft >= max - 4;
    scroller.classList.toggle('fade-l', scroller.scrollLeft > 4);
    scroller.classList.toggle('fade-r', scroller.scrollLeft < max - 4);
  }
  if(prev) prev.addEventListener('click', function(){ scroller.scrollLeft -= step(); });
  if(next) next.addEventListener('click', function(){ scroller.scrollLeft += step(); });
  if(scroller){
    scroller.addEventListener('scroll', sync, { passive:true });
    scroller.addEventListener('keydown', function(e){
      if(e.key==='ArrowRight'){ scroller.scrollLeft += step(); e.preventDefault(); }
      if(e.key==='ArrowLeft'){ scroller.scrollLeft -= step(); e.preventDefault(); }
    });
  }
  var seg = document.querySelector('.seg');
  function segFade(){
    if(seg) seg.classList.toggle('overflowing', seg.scrollWidth > seg.clientWidth + 2);
  }
  if(seg) seg.addEventListener('scroll', function(){
    if(seg.scrollLeft + seg.clientWidth >= seg.scrollWidth - 2) seg.classList.remove('overflowing');
    else segFade();
  }, { passive:true });
  window.addEventListener('resize', function(){ sync(); segFade(); });
  if(window.ResizeObserver && seg) new ResizeObserver(segFade).observe(seg);
  segFade();
  apply();
  return { apply: apply, sync: sync };
}

function initDrawer(opts){
  var scrim = document.getElementById('scrim');
  var dr    = document.getElementById('drawer');
  if(!dr) return null;
  function close(){
    dr.classList.remove('open'); scrim.classList.remove('open');
    dr.style.transition = ''; dr.style.transform = '';
  }
  scrim.addEventListener('click', close);

  /* bottom-sheet: drag down to dismiss (phones only) */
  var sy = null, dy = 0;
  function isSheet(){ return window.matchMedia('(max-width:640px)').matches; }
  dr.addEventListener('touchstart', function(e){
    if(!isSheet()) return;
    var body = dr.querySelector('.drawer-body');
    if(body && body.scrollTop > 0) return;
    sy = e.touches[0].clientY; dy = 0;
  }, { passive:true });
  dr.addEventListener('touchmove', function(e){
    if(sy === null) return;
    dy = e.touches[0].clientY - sy;
    if(dy > 0){ dr.style.transition = 'none'; dr.style.transform = 'translateY(' + dy + 'px)'; }
  }, { passive:true });
  dr.addEventListener('touchend', function(){
    if(sy === null) return;
    dr.style.transition = ''; dr.style.transform = '';
    if(dy > 110) close();
    sy = null; dy = 0;
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') close(); });
  var cl = dr.querySelector('.dclose'); if(cl) cl.addEventListener('click', close);

  document.addEventListener('click', function(e){
    if(e.target.closest('[data-act]')) return;
    var t = e.target.closest('.tile');
    if(!t) return;
    var d = t.dataset;
    var rows = [['Area', d.catlabel, ''], ['Release train', d.train, 'mono'],
                ['Target', d.q, ''], ['Confidence', d.status, '']];
    if(d.build) rows.push(['Delivered in build', d.build, 'mono']);
    if(d.cf === '1') rows.push(['Customer facing', 'Yes', '']);
    else if(opts && opts.showBr) rows.push(['Customer facing', 'No, internal', '']);
    if(opts && opts.showBr && d.br) rows.push(['Jira', d.br, 'mono']);
    dr.querySelector('.drawer-body').innerHTML =
      '<p class="desc">' + (d.desc || 'No description yet.') + '</p>' +
      '<div class="dmeta">' + rows.map(function(r){
        return '<div><span class="k">'+r[0]+'</span><span class="v '+r[2]+'">'+r[1]+'</span></div>';
      }).join('') + '</div>' +
      '<p class="dnote">Target quarters are planning intentions, not commitments. Sequencing can change.</p>' +
      ((opts && opts.editFooter) ? opts.editFooter(d) : '');
    dr.querySelector('.eyebrow').innerHTML =
      '<span class="dot c-'+d.cat+'"></span>' + d.catlabel + ' &nbsp;&middot;&nbsp; ' + d.train;
    dr.querySelector('h3').textContent = d.name;
    dr.classList.add('open'); scrim.classList.add('open');
  });
  return { close: close };
}
