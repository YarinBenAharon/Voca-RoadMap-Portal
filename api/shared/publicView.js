/* =========================================================================
   What a signed-in viewer without the editor role is allowed to see.

   api/roadmap only answers AudioCodes accounts and editors (auth.isAudioCodes),
   so viewers get every item field, including the internal ones (br, requestor,
   pm): they are shown read-only in the detail panel. What stays editor-only is
   the internal regions - publish:false - which the board leaves out anyway.

   requestor holds customer names. That is acceptable only because the domain
   check keeps the payload inside AudioCodes; do not relax that check without
   stripping requestor here again.
   ========================================================================= */

function publicView(data){
  const out = JSON.parse(JSON.stringify(data));

  if (out.cloud && Array.isArray(out.cloud.regions)){
    out.cloud.regions = out.cloud.regions.filter(r => r.publish !== false);
  }

  return out;
}

module.exports = { publicView };
