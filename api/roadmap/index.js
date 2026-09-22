/* GET /api/roadmap            the live roadmap, or the supplied one if nothing
                               has been published yet
   GET /api/roadmap?withSeed=1 the same, plus the pristine supplied copy that
                               the editor needs for Reset                       */

const store = require('../shared/store');
const seed  = require('../shared/seed.json');

module.exports = async function (context, req) {
  try {
    const raw = await store.readText(store.CURRENT_JSON);
    const rec = raw ? JSON.parse(raw) : null;

    const payload = {
      data:        rec ? rec.data : seed,
      publishedAt: rec ? rec.publishedAt : null,
      publishedBy: rec ? rec.publishedBy : null,
      isSeed:      !rec
    };
    if (req.query && req.query.withSeed === '1') payload.seed = seed;

    context.res = {
      status:  200,
      headers: {
        'Content-Type':  'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, max-age=0, must-revalidate'
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
