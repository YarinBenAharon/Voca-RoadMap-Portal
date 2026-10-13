/* =========================================================================
   Local test server: the portal with a fake sign-in, no Azure needed.

     node tools/dev_server.js [--data path/to/roadmap.json] [--port 8765]

   Serves src/ and runs the real API functions (api/NAME/index.js), with the
   Static Web Apps parts imitated well enough to test the portal end to end:

   - /.auth/login/aad   a page to pick a test user (no password)
   - /.auth/me          the picked user, as Static Web Apps returns it
   - /.auth/logout      forgets the user
   - every route needs a user; /edit* and the editor APIs need "editor";
     the same 401 -> sign-in and 403 -> 403.html behaviour as the config

   Storage is a local folder (os.tmpdir()/voca-roadmap-devstore) instead of
   blob storage, so drafts and Publish work and survive a restart. Delete
   the folder to start again from --data (or seed.json when not given).

   Test users are fixed below. Nothing here is deployed: tools/ is outside
   app_location and api_location.
   ========================================================================= */

const fs   = require('fs');
const http = require('http');
const os   = require('os');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const SRC   = path.join(ROOT, 'src');
const STORE = path.join(os.tmpdir(), 'voca-roadmap-devstore');

const arg  = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const PORT = Number(arg('--port')) || 8765;
const DATA = arg('--data');

const USERS = {
  pm:   { label: 'Voca PM',      note: 'editor: can edit and publish', userId: 'dev-pm',
          userDetails: 'voca.pm@audiocodes.com', roles: ['editor'] },
  user: { label: 'Regular user', note: 'AudioCodes viewer, read-only',  userId: 'dev-user',
          userDetails: 'viewer@audiocodes.com',  roles: [] }
};

/* ── a folder that behaves like the blob store ───────────────────────── */
const storeFile = name => path.join(STORE, name);
const devStore = {
  CURRENT_JSON: 'current/roadmap.json',
  CURRENT_HTML: 'current/roadmap.html',
  async readText(name){ try { return fs.readFileSync(storeFile(name), 'utf8'); } catch (e){ return null; } },
  async writeText(name, text){ fs.mkdirSync(path.dirname(storeFile(name)), { recursive: true }); fs.writeFileSync(storeFile(name), text); },
  async remove(name){ try { fs.unlinkSync(storeFile(name)); } catch (e){} },
  async listSnapshots(limit){
    let names = [];
    try { names = fs.readdirSync(storeFile('snapshots')).filter(f => f.endsWith('.json')); } catch (e){}
    const out = names.map(f => {
      const st = fs.statSync(storeFile('snapshots/' + f));
      return { id: f.slice(0, -'.json'.length), size: st.size, at: st.mtime };
    }).sort((a, b) => (a.id < b.id ? 1 : -1));                  /* newest first, like store.js */
    return limit ? out.slice(0, limit) : out;
  }
};
const storePath = require.resolve(path.join(ROOT, 'api/shared/store.js'));
require.cache[storePath] = { id: storePath, filename: storePath, loaded: true, exports: devStore };

if (!fs.existsSync(path.join(ROOT, 'api/shared/assets/render.js'))){
  console.error('Run  python tools/sync_api_assets.py  first (publish needs the synced assets).');
  process.exit(1);
}

/* first run: start from --data, so the board has real content to test */
if (DATA && !fs.existsSync(storeFile(devStore.CURRENT_JSON))){
  const raw  = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const data = raw.data && raw.trains === undefined ? raw.data : raw;
  devStore.writeText(devStore.CURRENT_JSON,
    JSON.stringify({ publishedAt: new Date().toISOString(), publishedBy: 'dev_server (--data)', data }));
}

const FUNCS = {};
['roadmap', 'publish', 'snapshots', 'draft'].forEach(n => {
  const f = path.join(ROOT, 'api', n, 'index.js');
  if (fs.existsSync(f)) FUNCS[n] = require(f);
});

/* ── helpers ─────────────────────────────────────────────────────────── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function who(req){
  const m = /(?:^|;\s*)devuser=(\w+)/.exec(req.headers.cookie || '');
  return m && USERS[m[1]] ? m[1] : null;
}
function principal(key){
  const u = USERS[key];
  return { identityProvider: 'aad', userId: u.userId, userDetails: u.userDetails,
           userRoles: ['anonymous', 'authenticated'].concat(u.roles) };
}
function send(res, status, body, headers){
  res.writeHead(status, Object.assign({ 'Cache-Control': 'no-store' }, headers || {}));
  res.end(body);
}
function redirect(res, to, extra){ send(res, 302, '', Object.assign({ Location: to }, extra || {})); }
function file(res, p, status){
  fs.readFile(p, (err, buf) => err ? send(res, 404, 'Not found')
    : send(res, status || 200, buf, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }));
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function loginPage(res, back){
  const opt = k => `<a class="u" href="/.auth/dev-pick?u=${k}&back=${encodeURIComponent(back)}">
      <b>${USERS[k].label}</b><span>${USERS[k].userDetails}</span><i>${USERS[k].note}</i></a>`;
  send(res, 200, `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Test sign-in</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>body{font-family:Poppins,sans-serif;background:#F4F6FA;color:#0E1020;display:flex;justify-content:center;padding-top:90px;margin:0}
.box{background:#fff;border:1px solid #E3E8F0;border-radius:20px;padding:34px 36px;width:420px;box-shadow:0 10px 40px rgba(20,28,54,.08)}
h1{font-size:20px;margin:0 0 6px}p{font-size:13px;color:#7C8397;margin:0 0 22px}
.u{display:flex;flex-direction:column;gap:2px;text-decoration:none;color:inherit;border:1px solid #E3E8F0;border-radius:14px;padding:14px 18px;margin-bottom:10px}
.u:hover{border-color:#6C5CE0;background:#F7F6FE}.u b{font-size:15px}.u span{font-size:13px;color:#464C61}.u i{font-size:12px;color:#7C8397;font-style:normal}</style></head>
<body><div class="box"><h1>Test sign-in</h1><p>Local test server only. Pick who to sign in as.</p>${opt('pm')}${opt('user')}</div></body></html>`,
  { 'Content-Type': 'text/html; charset=utf-8' });
}

async function callFunction(name, req, res, url, key){
  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed = body;
  try { parsed = body ? JSON.parse(body) : undefined; } catch (e){}
  const fReq = { method: req.method, query: Object.fromEntries(url.searchParams), body: parsed,
    headers: Object.assign({}, req.headers, key ? { 'x-ms-client-principal':
      Buffer.from(JSON.stringify(principal(key))).toString('base64') } : {}) };
  const log = (...a) => console.log('  [' + name + ']', ...a);
  log.error = (...a) => console.error('  [' + name + ']', ...a);
  const ctx = { log, res: null };
  await FUNCS[name](ctx, fReq);
  const r = ctx.res || { status: 204 };
  send(res, r.status || 200, r.body == null ? '' : r.body, r.headers);
}

/* ── routing, after staticwebapp.config.json ─────────────────────────── */
const EDITOR_ONLY = [/^\/edit/, /^\/api\/publish/, /^\/api\/snapshots/, /^\/api\/draft/];

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  const key = who(req);
  try {
    if (p === '/.auth/login/aad' || p === '/login'){
      let back = url.searchParams.get('post_login_redirect_uri') || '/';
      if (back === '.referrer') back = req.headers.referer ? new URL(req.headers.referer).pathname : '/';
      return loginPage(res, back);
    }
    if (p === '/.auth/dev-pick'){
      const u = USERS[url.searchParams.get('u')] ? url.searchParams.get('u') : 'user';
      const back = url.searchParams.get('back') || '/';
      return redirect(res, back.startsWith('/') ? back : '/', { 'Set-Cookie': 'devuser=' + u + '; Path=/; HttpOnly; SameSite=Lax' });
    }
    /* the public page frozen on its first-paint loader, for looking at it */
    if (p === '/.dev/loader'){
      const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').replace(/^\s*load\(\);\s*$/m, '');
      return send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8' });
    }
    if (p === '/.auth/me')
      return send(res, 200, JSON.stringify({ clientPrincipal: key ? principal(key) : null }), { 'Content-Type': 'application/json' });
    if (p === '/.auth/logout' || p === '/logout')
      return redirect(res, url.searchParams.get('post_logout_redirect_uri') || '/', { 'Set-Cookie': 'devuser=; Path=/; Max-Age=0' });

    if (!key){
      if (p.startsWith('/api/')) return send(res, 401, 'Sign in required.');
      return redirect(res, '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent(p + url.search));
    }
    if (EDITOR_ONLY.some(rx => rx.test(p)) && USERS[key].roles.indexOf('editor') === -1){
      if (p.startsWith('/api/')) return send(res, 403, 'Editor role required.');
      return file(res, path.join(SRC, '403.html'), 403);
    }

    const api = /^\/api\/([a-z]+)/.exec(p);
    if (api) return FUNCS[api[1]] ? callFunction(api[1], req, res, url, key) : send(res, 404, 'No such API');

    let f = path.join(SRC, p);
    if (!f.startsWith(SRC)) return send(res, 403, 'Forbidden');
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (fs.existsSync(f)) return file(res, f);
    if (p.startsWith('/shared/') || path.extname(p)) return send(res, 404, 'Not found');
    return file(res, path.join(SRC, 'index.html'));              /* navigationFallback */
  } catch (err){
    console.error(err);
    send(res, 500, 'Dev server error: ' + err.message);
  }
}).listen(PORT, () => {
  console.log('Voca roadmap portal (test sign-in) on http://localhost:' + PORT);
  console.log('  users: ' + Object.keys(USERS).map(k => USERS[k].label + ' <' + USERS[k].userDetails + '>').join(', '));
  console.log('  store: ' + STORE + (DATA ? '   (first run seeded from ' + DATA + ')' : ''));
});
