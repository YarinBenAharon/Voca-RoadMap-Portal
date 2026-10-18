/* =========================================================================
   What a signed-in viewer without the editor role is allowed to see.

   api/roadmap only answers AudioCodes accounts and editors (auth.isAudioCodes),
   so viewers get every item field, including the internal ones (br, requestor,
   pm): they are shown read-only in the detail panel. What stays editor-only is
   the internal regions - publish:false - which the board leaves out anyway.

   requestor holds customer names. That is acceptable only because the domain
   check keeps the payload inside AudioCodes; do not relax that check without
   stripping requestor here again.

   Internal R&D items (rnd:true) are removed unless opts.rnd is set (the
   caller has the internal_rnd_group role). The board, Excel and PDF are all
   built from this payload, so this one filter covers all three.
   ========================================================================= */

function publicView(data, opts){
  const out = JSON.parse(JSON.stringify(data));
  const rnd = !!(opts && opts.rnd);

  if (out.cloud && Array.isArray(out.cloud.regions)){
    out.cloud.regions = out.cloud.regions.filter(r => r.publish !== false);
  }

  if (!rnd && Array.isArray(out.trains)){
    out.trains.forEach(t => {
      if (Array.isArray(t.items)) t.items = t.items.filter(it => !(it && it.rnd === true));
    });
  }

  return out;
}

module.exports = { publicView };
