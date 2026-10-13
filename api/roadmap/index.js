/* GET /api/roadmap            the live roadmap, or the supplied one if nothing
                               has been published yet
   GET /api/roadmap?withSeed=1 the same, plus the pristine supplied copy that
                               the editor needs for Reset                       */

const auth  = require('../shared/auth');
const store = require('../shared/store');
const seed  = require('../shared/seed.json');
const { publicView } = require('../shared/publicView');

module.exports = async function (context, req) {
  /* Signed-in callers only. The route rule already refuses anyone else; this
     is the second lock, so a routing mistake alone cannot expose the board. */
  const p = auth.principal(req);
  if (!p || !Array.isArray(p.userRoles) || p.userRoles.indexOf('authenticated') === -1){
    context.res = { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'Sign in required.' };
    return;
  }
  /* signed in, but with a non-AudioCodes Microsoft account: the page frame
     loads, the roadmap does not (index.html explains why) */
  if (!auth.isEditor(req) && !auth.isAudioCodes(req)){
    context.res = {
      status:  403,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body:    JSON.stringify({ error: 'audiocodes-only', signedInAs: p.userDetails || null })
    };
    return;
  }

  try {
    const raw = await store.readText(store.CURRENT_JSON);
    const rec = raw ? JSON.parse(raw) : null;

    /* Only AudioCodes accounts and editors get this far. Editors get the
       working copy; AudioCodes viewers get every item field (shown read-only)
       but not the internal regions. */
    const editor = auth.isEditor(req);
    const shown  = d => (editor ? d : publicView(d));

    const payload = {
      data:        shown(rec ? rec.data : seed),
      publishedAt: rec ? rec.publishedAt : null,
      publishedBy: (editor && rec) ? rec.publishedBy : null,
      isSeed:      !rec
    };
    if (editor && req.query && req.query.withSeed === '1') payload.seed = seed;

    context.res = {
      status:  200,
      headers: {
        'Content-Type':  'application/json; charset=utf-8',
        /* the body differs for editors, so it must never be held in a
           shared cache and replayed to someone else */
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify(payload)
    };
  } catch (err){
    context.log.error('roadmap read failed', err);
    context.res = {
      status:  500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body:    'The roadmap could not be read. ' + (err.message || '')
    };
  }
};
