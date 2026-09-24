/* GET /api/roadmap            the live roadmap, or the supplied one if nothing
                               has been published yet
   GET /api/roadmap?withSeed=1 the same, plus the pristine supplied copy that
                               the editor needs for Reset                       */

const auth  = require('../shared/auth');
const store = require('../shared/store');
const seed  = require('../shared/seed.json');
const { publicView } = require('../shared/publicView');

module.exports = async function (context, req) {
  try {
    const raw = await store.readText(store.CURRENT_JSON);
    const rec = raw ? JSON.parse(raw) : null;

    /* This route is anonymous, so anything returned here is public. Editors
       get the working copy; everyone else gets it with the internal fields
       and internal regions removed. */
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
