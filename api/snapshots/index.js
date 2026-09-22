/* GET /api/snapshots         editors only. Lists past publishes, newest first.
   GET /api/snapshots?id=...  returns that snapshot so the editor can load it
                              back in and republish it.                       */

const auth  = require('../shared/auth');
const store = require('../shared/store');

const text = (status, body) => ({
  status, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body
});

const json = body => ({
  status: 200,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' },
  body: JSON.stringify(body)
});

module.exports = async function (context, req) {
  if (!auth.isEditor(req)){
    context.res = text(403, 'Version history requires the editor role.');
    return;
  }

  const id = req.query && req.query.id;

  try {
    if (!id){
      context.res = json({ snapshots: await store.listSnapshots(60) });
      return;
    }

    if (!/^[0-9TZ_-]+$/.test(id)){
      context.res = text(400, 'That is not a snapshot id.');
      return;
    }

    const raw = await store.readText('snapshots/' + id + '.json');
    if (!raw){ context.res = text(404, 'No snapshot with that id.'); return; }

    context.res = json(JSON.parse(raw));
  } catch (err){
    context.log.error('snapshot read failed', err);
    context.res = text(500, 'Version history could not be read. ' + (err.message || ''));
  }
};
