const fs = require('fs/promises');
const path = require('path');
const ROOT = path.resolve(process.env.CHUNK_STORE_DIR || path.join(__dirname, '..', 'data', 'chunks'));
const safe = value => { if (!/^[a-zA-Z0-9:_-]+$/.test(String(value))) throw Error('Invalid identifier'); return String(value); };
async function save(jobId, chunkId, vertices) {
 const dir = path.join(ROOT, safe(jobId)); await fs.mkdir(dir, {recursive:true});
 const target = path.join(dir, safe(chunkId) + '.json');
 const temp = target + '.' + process.pid + '.' + Date.now() + '.tmp';
 await fs.writeFile(temp, JSON.stringify(vertices)); await fs.rename(temp, target);
}
async function list(jobId) {
 const dir = path.join(ROOT, safe(jobId));
 let names; try { names = await fs.readdir(dir); } catch (e) { if(e.code==='ENOENT') return []; throw e; }
 return names.filter(n=>n.endsWith('.json')).sort().map(n=>n.slice(0,-5));
}
async function load(jobId, chunkId) { return JSON.parse(await fs.readFile(path.join(ROOT,safe(jobId),safe(chunkId)+'.json'),'utf8')); }
module.exports={save,list,load};
