/* =========================================================================
   What an anonymous caller is allowed to see.

   The board markup hides internal fields by rendering with editable:false,
   but that only protects the page - /api/roadmap is public, so anything left
   in the payload is readable by anyone who opens the URL directly. This
   strips it at the source instead.

   Keep this in step with laneHTML/regionsHTML: every field those helpers
   gate behind `editable` or `showAll` must be removed here too. The board is
   shared outside the company and `requestor` holds customer names.
   ========================================================================= */

const INTERNAL_ITEM_FIELDS = ['br', 'requestor', 'pm'];

function publicView(data){
  const out = JSON.parse(JSON.stringify(data));

  (out.trains || []).forEach(t => {
    (t.items || []).forEach(i => {
      INTERNAL_ITEM_FIELDS.forEach(f => { delete i[f]; });
    });
  });

  if (out.cloud && Array.isArray(out.cloud.regions)){
    out.cloud.regions = out.cloud.regions.filter(r => r.publish !== false);
  }

  return out;
}

module.exports = { publicView, INTERNAL_ITEM_FIELDS };
