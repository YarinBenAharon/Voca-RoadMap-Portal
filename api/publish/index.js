/* POST /api/publish   editors only. Replaces the live roadmap and keeps a
                       snapshot of every publish.                            */

const auth    = require('../shared/auth');
const store   = require('../shared/store');
const { validateRoadmap }  = require('../shared/validate');
const { buildPublishHTML } = require('../shared/publishHtml');

const text = (status, body) => ({
  status, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body
});

module.exports = async function (context, req) {
  if (!auth.isEditor(req)){
    context.res = text(403, 'Publishing the roadmap requires the editor role.');
    return;
  }

  let data = req.body;
  if (typeof data === 'string'){
    try { data = JSON.parse(data); }
    catch (err){ context.res = text(400, 'The request body is not valid JSON.'); return; }
  }

  try {
    validateRoadmap(data);
  } catch (err){
    if (err.invalid){ context.res = text(400, 'That roadmap was rejected: ' + err.message); return; }
    throw err;
  }

  const publishedAt = new Date().toISOString();
  const publishedBy = auth.nameOf(req);
  const stamp       = publishedAt.replace(/[:.]/g, '-');

  try {
    const record = JSON.stringify({ publishedAt, publishedBy, data });
    const html   = buildPublishHTML(data);

    /* Snapshots first: if the run dies half way, the live copy is still the
       previous good one rather than a half-written new one. */
    await store.writeText('snapshots/' + stamp + '.json', record, 'application/json; charset=utf-8');
    await store.writeText('snapshots/' + stamp + '.html', html,   'text/html; charset=utf-8');
    await store.writeText(store.CURRENT_JSON, record, 'application/json; charset=utf-8');
    await store.writeText(store.CURRENT_HTML, html,   'text/html; charset=utf-8');

    context.log('roadmap published by ' + publishedBy + ' at ' + publishedAt);
    context.res = {
      status:  200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body:    JSON.stringify({ publishedAt, publishedBy, snapshot: stamp })
    };
  } catch (err){
    context.log.error('publish failed', err);
    context.res = text(500, 'The roadmap could not be published. ' + (err.message || ''));
  }
};
