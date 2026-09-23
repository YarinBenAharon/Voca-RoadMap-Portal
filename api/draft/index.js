/* Per-editor working copy, so a draft is not trapped in one browser.

   GET    /api/draft   the caller's draft, or 204 if they have none
   PUT    /api/draft   store the caller's draft
   DELETE /api/draft   discard it, after publishing or loading the live copy

   Drafts are private: the blob is keyed on the caller's own user id, and
   nothing here will read or write another person's. They are unvalidated on
   purpose - a draft is work in progress and may legitimately be incomplete.
   The shape is only enforced at publish time. */

const auth  = require('../shared/auth');
const store = require('../shared/store');

const text = (status, body) => ({
  status, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body
});

function blobFor(req){
  const p = auth.principal(req);
  const id = p && p.userId;
  if (!id) return null;
  /* user ids are opaque; keep them to a safe blob path segment regardless */
  const safe = String(id).replace(/[^A-Za-z0-9_-]/g, '');
  return safe ? 'drafts/' + safe + '.json' : null;
}

module.exports = async function (context, req) {
  if (!auth.isEditor(req)){
    context.res = text(403, 'Drafts are only kept for editors.');
    return;
  }

  const blob = blobFor(req);
  if (!blob){
    context.res = text(400, 'Could not identify the signed-in user.');
    return;
  }

  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET'){
      const raw = await store.readText(blob);
      context.res = raw
        ? { status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8',
                       'Cache-Control': 'no-store' },
            body: raw }
        : { status: 204, headers: { 'Cache-Control': 'no-store' } };
      return;
    }

    if (method === 'PUT' || method === 'POST'){
      let data = req.body;
      if (typeof data === 'string'){
        try { data = JSON.parse(data); }
        catch (err){ context.res = text(400, 'The draft is not valid JSON.'); return; }
      }
      if (!data || typeof data !== 'object'){
        context.res = text(400, 'The draft is empty.');
        return;
      }

      const savedAt = new Date().toISOString();
      await store.writeText(blob,
        JSON.stringify({ savedAt, savedBy: auth.nameOf(req), data }),
        'application/json; charset=utf-8');

      context.res = {
        status:  200,
        headers: { 'Content-Type': 'application/json; charset=utf-8',
                   'Cache-Control': 'no-store' },
        body:    JSON.stringify({ savedAt })
      };
      return;
    }

    if (method === 'DELETE'){
      await store.remove(blob);
      context.res = { status: 204, headers: { 'Cache-Control': 'no-store' } };
      return;
    }

    context.res = text(405, 'Method not allowed.');
  } catch (err){
    context.log.error('draft ' + method + ' failed', err);
    context.res = text(500, 'The draft could not be saved. ' + (err.message || ''));
  }
};
