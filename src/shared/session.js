/* =========================================================================
   Sign-in control.

   Static Web Apps exposes the signed-in user at /.auth/me. On the Free plan
   any Microsoft account can complete a sign-in, so being signed in means
   nothing on its own - the "editor" custom role is what grants access, and
   it is granted per person from Role Management in the Azure portal. The
   /edit route and the publish API are both gated on that role server-side;
   this file only decides what the top bar offers.
   ========================================================================= */

function sessionPrincipal(){
  return fetch('/.auth/me', { headers: { 'Accept': 'application/json' } })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){ return (j && j.clientPrincipal) || null; })
    .catch(function(){ return null; });
}

function mountSession(id){
  var el = document.getElementById(id || 'session');
  if (!el || el.dataset.mounted === '1') return;
  el.dataset.mounted = '1';

  sessionPrincipal().then(function(p){
    var here    = encodeURIComponent(location.pathname + location.search);
    var editing = location.pathname.indexOf('/edit') === 0;

    if (!p){
      el.innerHTML = '<a class="sess-in" href="/.auth/login/aad?post_login_redirect_uri=' + here + '">Sign in</a>';
      return;
    }

    var canEdit = (p.userRoles || []).indexOf('editor') !== -1;
    var who     = esc(p.userDetails || 'Signed in');

    el.innerHTML =
      (canEdit && !editing ? '<a class="sess-in" href="/edit">Edit roadmap</a>' : '') +
      (editing            ? '<a href="/">View portal</a>' : '') +
      '<span class="sess-who" title="' + who + '">' + who + '</span>' +
      '<a href="/.auth/logout?post_logout_redirect_uri=/">Sign out</a>';
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
