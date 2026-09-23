/* =========================================================================
   Blob storage for the published roadmap.

   Layout inside the container:
     current/roadmap.json        the live record: { publishedAt, publishedBy, data }
     current/roadmap.html        the live board as a standalone file
     snapshots/<stamp>.json      one record per publish, never overwritten
     snapshots/<stamp>.html      the matching standalone file
   ========================================================================= */

const { BlobServiceClient } = require('@azure/storage-blob');

const CONTAINER    = process.env.ROADMAP_CONTAINER || 'roadmap';
const CURRENT_JSON = 'current/roadmap.json';
const CURRENT_HTML = 'current/roadmap.html';

let containerPromise = null;

function container(){
  if (!containerPromise){
    const cs = process.env.ROADMAP_STORAGE;
    if (!cs){
      return Promise.reject(new Error(
        'Storage is not configured. Set the ROADMAP_STORAGE application setting ' +
        'on the Static Web App to the storage account connection string.'));
    }
    const client = BlobServiceClient.fromConnectionString(cs).getContainerClient(CONTAINER);
    containerPromise = client.createIfNotExists()
      .then(() => client)
      .catch(err => { containerPromise = null; throw err; });
  }
  return containerPromise;
}

async function readText(name){
  const c = await container();
  try {
    const buf = await c.getBlockBlobClient(name).downloadToBuffer();
    return buf.toString('utf8');
  } catch (err){
    if (err.statusCode === 404) return null;
    throw err;
  }
}

async function writeText(name, body, contentType){
  const c = await container();
  const buf = Buffer.from(body, 'utf8');
  await c.getBlockBlobClient(name).upload(buf, buf.length, {
    blobHTTPHeaders: { blobContentType: contentType, blobCacheControl: 'no-cache' }
  });
}

async function remove(name){
  const c = await container();
  await c.getBlockBlobClient(name).deleteIfExists();
}

async function listSnapshots(limit){
  const c = await container();
  const out = [];
  for await (const b of c.listBlobsFlat({ prefix: 'snapshots/' })){
    if (!b.name.endsWith('.json')) continue;
    out.push({
      id:   b.name.slice('snapshots/'.length, -'.json'.length),
      size: b.properties.contentLength,
      at:   b.properties.lastModified
    });
  }
  out.sort((a, b) => (a.id < b.id ? 1 : -1));       // newest first
  return limit ? out.slice(0, limit) : out;
}

module.exports = {
  CURRENT_JSON, CURRENT_HTML,
  readText, writeText, remove, listSnapshots
};
