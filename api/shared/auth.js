/* =========================================================================
   Who is calling.

   Static Web Apps validates the sign-in and forwards the result in the
   x-ms-client-principal header as base64 JSON. Route rules in
   staticwebapp.config.json already refuse non-editors before a request
   reaches the publish function; the check here is the second lock, so that
   a routing mistake alone cannot make the roadmap writable.
   ========================================================================= */

function principal(req){
  const header = req.headers && (req.headers['x-ms-client-principal'] ||
                                 req.headers['X-MS-CLIENT-PRINCIPAL']);
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  } catch (err){
    return null;
  }
}

function isEditor(req){
  const p = principal(req);
  return !!(p && Array.isArray(p.userRoles) && p.userRoles.indexOf('editor') !== -1);
}

function nameOf(req){
  const p = principal(req);
  return (p && p.userDetails) || null;
}

module.exports = { principal, isEditor, nameOf };
