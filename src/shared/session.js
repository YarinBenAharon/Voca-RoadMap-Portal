/* =========================================================================
   Session control.

   Every route requires a sign-in (staticwebapp.config.json), so by the time
   this runs the visitor is signed in and there is no Sign in button. On the
   Free plan any Microsoft account can complete that sign-in; the "editor"
   custom role, granted per person from Role Management in the Azure portal,
   is what grants editing. The /edit route and the publish API are both gated
   on that role server-side; this file only decides what the top bar offers:
   a "Voca PM" tag and an Edit button for editors, and a quiet Sign out link
   for everyone (the account name shows on hover).
   ========================================================================= */

function sessionPrincipal(){
  /* no-store: a cached answer would show the previous account after a switch */
  return fetch('/.auth/me', { cache: 'no-store', headers: { 'Accept': 'application/json' } })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){ return (j && j.clientPrincipal) || null; })
    .catch(function(){ return null; });
}

function mountSession(id){
  var el = document.getElementById(id || 'session');
  if (!el || el.dataset.mounted === '1') return;
  el.dataset.mounted = '1';

  sessionPrincipal().then(function(p){
    if (!p){ el.innerHTML = ''; return; }
    var editing = location.pathname.indexOf('/edit') === 0;
    var canEdit = (p.userRoles || []).indexOf('editor') !== -1;
    var who     = esc(p.userDetails || 'Signed in');
    var out     = '<a class="sess-out" href="/.auth/logout?post_logout_redirect_uri=/" title="Signed in as ' + who + '">Sign out</a>';

    /* inside the editor everyone is an editor, and its bar is short on width */
    el.innerHTML = !canEdit ? out : editing ? '<a href="/">View portal</a>' + out :
      '<span class="sess-tag" title="Signed in as ' + who + '">Voca PM</span>' +
      '<a class="sess-in" href="/edit">Edit</a>' + out;
  });
}

/* The editor's #session lives in static markup, so it can mount straight
   away. The public page builds its top bar from data and calls mountSession()
   itself once the board is on screen. */
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ mountSession(); });
} else {
  mountSession();
}
