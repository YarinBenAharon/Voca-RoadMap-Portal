/* =========================================================================
   Shape check for an incoming roadmap.

   Only structural: enough to be sure a malformed or truncated body never
   replaces the live roadmap. Content is the editors' business.
   ========================================================================= */

const META_KEYS = ['product', 'vendor', 'title', 'lede', 'updated',
                   'currentRelease', 'latestBuild', 'nextTrain'];

function validateRoadmap(data){
  const fail = m => { const e = new Error(m); e.invalid = true; throw e; };

  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Body is not a roadmap object.');
  if (!data.meta || typeof data.meta !== 'object')              fail('Missing "meta".');

  for (const k of META_KEYS){
    if (typeof data.meta[k] !== 'string') fail('meta.' + k + ' must be a string.');
  }

  if (!Array.isArray(data.categories) || !data.categories.length) fail('"categories" must be a non-empty array.');
  if (!Array.isArray(data.trains))                                fail('"trains" must be an array.');
  if (!Array.isArray(data.evaluation))                            fail('"evaluation" must be an array.');
  if (!data.cloud || !Array.isArray(data.cloud.regions))          fail('"cloud.regions" must be an array.');

  data.categories.forEach((c, i) => {
    if (!c || typeof c.id !== 'string' || typeof c.label !== 'string')
      fail('categories[' + i + '] needs an id and a label.');
  });

  const ids = new Set();
  data.trains.forEach((t, i) => {
    if (!t || typeof t.id !== 'string' || !t.id) fail('trains[' + i + '] needs an id.');
    if (ids.has(t.id))                           fail('Two release trains share the id "' + t.id + '".');
    ids.add(t.id);
    if (typeof t.ver !== 'string')               fail('trains[' + i + '] needs a version.');
    if (!Array.isArray(t.items))                 fail('trains[' + i + '].items must be an array.');
    t.items.forEach((it, j) => {
      if (!it || typeof it.name !== 'string' || !it.name.trim())
        fail('trains[' + i + '].items[' + j + '] needs a name.');
    });
  });

  data.cloud.regions.forEach((r, i) => {
    if (!r || typeof r.name !== 'string') fail('cloud.regions[' + i + '] needs a name.');
  });

  return data;
}

module.exports = { validateRoadmap };
