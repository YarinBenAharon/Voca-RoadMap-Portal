/* POST /api/public-preview   editor only: the public roadmap as /public would
                              show it, for the editor's Preview public roadmap.

   The body is the editor's draft; an empty body previews the published
   roadmap. Block public roadmap is ignored, so a PM can check the page while
   customers still see the under-construction screen; `blocked` says whether
   it is on. The output is customerView() like the public feed, so the
   preview cannot show anything the real page would not. */

const auth  = require('../shared/auth');
const store = require('../shared/store');
const seed  = require('../shared/seed.json');
const { customerView } = require('../shared/customerView');

const text = (status, body) => ({
  status, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body
});

module.exports = async function (context, req) {
  if (!auth.isEditor(req)){
    context.res = text(403, 'The preview is for editors only.');
    return;
  }

  let data = req.body;
  if (typeof data === 'string'){
    try { data = data.trim() ? JSON.parse(data) : null; }
    catch (err){ context.res = text(400, 'The draft is not valid JSON.'); return; }
  }
  const draft = !!(data && typeof data === 'object' && Array.isArray(data.trains));

  try {
    if (!draft){
      const raw = await store.readText(store.CURRENT_JSON);
      data = raw ? JSON.parse(raw).data : seed;
    }
    const blocked = !!(data.meta && data.meta.publicBlocked === true);
    const view = customerView(Object.assign({}, data,
      { meta: Object.assign({}, data.meta, { publicBlocked: false }) }));
    context.res = {
      status:  200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body:    JSON.stringify(Object.assign(view, { preview: { draft, blocked } }))
    };
  } catch (err){
    context.log.error('public preview failed', err);
    context.res = text(500, 'The preview could not be built.');
  }
};
