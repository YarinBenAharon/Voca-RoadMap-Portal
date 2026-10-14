/* GET /api/public-roadmap   the customer view of the live roadmap, for the
                             public page. No sign-in: the route rule lets
                             anyone in, so everything returned must be safe
                             for customers. customerView() is the gate.     */

const store = require('../shared/store');
const seed  = require('../shared/seed.json');
const { customerView } = require('../shared/customerView');

module.exports = async function (context, req) {
  try {
    const raw = await store.readText(store.CURRENT_JSON);
    const rec = raw ? JSON.parse(raw) : null;

    context.res = {
      status:  200,
      headers: {
        'Content-Type':  'application/json; charset=utf-8',
        /* the same body for everyone, so a short shared cache is fine */
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify((v => v.blocked ? v : Object.assign(v, { publishedAt: rec ? rec.publishedAt : null }))(
                             customerView(rec ? rec.data : seed)))
    };
  } catch (err){
    context.log.error('public roadmap read failed', err);
    context.res = {
      status:  500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body:    'The roadmap could not be read.'
    };
  }
};
