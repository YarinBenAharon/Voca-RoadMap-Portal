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

/* Internal R&D group: sees items marked rnd:true, which every other viewer
   is denied (publicView). Granted like editor, by Role management invitation. */
const RND_ROLE = 'internal_rnd_group';

function isRnd(req){
  const p = principal(req);
  return !!(p && Array.isArray(p.userRoles) &&
            p.userRoles.some(r => String(r).toLowerCase() === RND_ROLE));
}

function nameOf(req){
  const p = principal(req);
  return (p && p.userDetails) || null;
}

/* The Free plan's Microsoft sign-in accepts any Microsoft account, so the
   roadmap is limited to AudioCodes ones by the sign-in name's domain. A
   personal account cannot be created on a domain verified in a company's
   Entra tenant, so the name is a fair, though not cryptographic, signal.
   Editors pass regardless: their role was granted deliberately. */
const AUDIOCODES_DOMAINS = ['audiocodes.com'];

function isAudioCodes(req){
  const p = principal(req);
  if (!p || p.identityProvider !== 'aad' || !p.userDetails) return false;
  const domain = String(p.userDetails).toLowerCase().split('@').pop();
  return AUDIOCODES_DOMAINS.indexOf(domain) !== -1;
}

module.exports = { principal, isEditor, isRnd, nameOf, isAudioCodes, AUDIOCODES_DOMAINS, RND_ROLE };
