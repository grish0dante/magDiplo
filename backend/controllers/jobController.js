const Job = require('../models/Job');
const chunkStore = require('../services/chunkStore');
const jobQueue = require('../queues/jobQueue');
const generateChunks = require('../utils/chunkGenerator');
const { compileFormula } = require('../../shared/marching-cubes/formulaField');
const { validateGridField } = require('../../shared/marching-cubes/gridField');

const {
  streamChunkGeometry,
  streamJobProgress,
  streamWorkerChunk
} = require('../services/chunkStreamingService');

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(number, min), max);
};

const createJob = async (req, res) => {
  try {
    const formula = String(
      req.body.formula || 'x*x + y*y + z*z - 25'
    );

    const isoValue = Number(req.body.isoValue ?? 0);
    const resolution = Number(req.body.resolution ?? 16);
    const volumeSize = Number(req.body.volumeSize ?? 32);
    const chunkSize = Number(req.body.chunkSize ?? 8);

    const invalidParameters = (
      !Number.isFinite(isoValue) ||
      !Number.isInteger(resolution) ||
      resolution < 16 ||
      resolution > 512 ||
      !Number.isInteger(chunkSize) ||
      chunkSize < 2 ||
      chunkSize > 64 ||
      !Number.isFinite(volumeSize) ||
      volumeSize <= 0 ||
      volumeSize > 1000
    );

    if (invalidParameters) {
      return res.status(400).json({ error: 'Invalid numeric parameters' });
    }

    // Bound queue overhead even when users enter extreme custom settings.
    const plannedChunks = Math.ceil(resolution / chunkSize) ** 3;
    if (plannedChunks > 8192) {
      return res.status(400).json({
        error: `Забагато chunks (${plannedChunks}). Максимум 8192. Збільште chunk size.`
      });
    }

    const gridField = req.body.gridField ?? null;
    try {
      if (gridField) validateGridField(gridField);
      else compileFormula(formula);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const chunks = generateChunks(resolution, chunkSize);

    const job = await Job.create({
      formula,
      gridField,
      isoValue,
      resolution,
      volumeSize,
      chunkSize,
      chunksTotal: chunks.length,
      status: 'Pending'
    });
        console.log({
      formula,
      isoValue,
      resolution,
      volumeSize,
      chunkSize
    });
    console.log('CREATED JOB:', job);
    res.status(201).json({
      success: true,
      
      job
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
const startJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }
    console.log('START JOB CALLED:', req.params.id);
    if(job.status !== 'Pending') return res.status(409).json({error:'Job has already started'});
    const chunks = generateChunks(
      job.resolution,
      job.chunkSize
    );

    job.status = 'Running';
    job.chunksTotal = chunks.length;
    job.chunksCompleted = 0;
    job.progress = 0;
    job.startedAt = new Date();

    await job.save();
    console.log('ADDING CHUNKS:', chunks.length);
    // Batch queue writes to avoid one Redis round-trip per chunk.
    const batchSize = 200;
    for (let offset = 0; offset < chunks.length; offset += batchSize) {
      await jobQueue.addBulk(chunks.slice(offset, offset + batchSize).map(chunk => ({
        name: 'chunk-job',
        data: {
          jobId: job._id.toString(), chunk, isoValue: job.isoValue,
          resolution: job.resolution, volumeSize: job.volumeSize,
          formula: job.formula, gridField: job.gridField
        },
        opts: {
          attempts: 3, backoff: { type: 'exponential', delay: 1500 },
          removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 }
        }
      })));
    }

    res.json({
      success: true,
      chunksTotal: chunks.length
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

const updateProgress = async (req, res) => {
 try {
  const {jobId,chunkId,vertices} = req.body;
  const workerId = String(req.body.workerId || 'unknown').slice(0,80);
  const durationMs = Math.max(0,Math.min(3600000,Number(req.body.durationMs)||0));
  if(!/^[0-9a-f]{24}$/i.test(String(jobId)) || !/^\d+:\d+:\d+$/.test(String(chunkId)) ||
    !Array.isArray(vertices) || vertices.length>3000000 || vertices.length%9!==0 ||
    !vertices.every(v=>typeof v==='number' && Number.isFinite(v)))
   return res.status(400).json({error:'Invalid chunk payload'});
  const job=await Job.findById(jobId);
  if(!job) return res.status(404).json({error:'Job not found'});
  if(job.status==='Cancelled'||job.status==='Failed') return res.status(409).json({error:'Job not active'});
  if(job.status==='Completed'||job.completedChunkIds.includes(chunkId)) return res.json({success:true,duplicate:true,progress:job.progress});
  // Persist before claiming completion so replay works after a websocket disconnect.
  await chunkStore.save(jobId,chunkId,vertices);
  const updated=await Job.findOneAndUpdate({_id:jobId,status:'Running',completedChunkIds:{$ne:chunkId}},
   {$addToSet:{completedChunkIds:chunkId},$inc:{chunksCompleted:1}},{new:true});
  if(!updated) return res.json({success:true,duplicate:true});
  const progress=Math.min(100,Math.floor(updated.chunksCompleted/Math.max(1,updated.chunksTotal)*100));
  const completed=updated.chunksCompleted>=updated.chunksTotal;
  await Job.updateOne({_id:jobId,status:'Running'},{$max:{progress},...(completed?{$set:{status:'Completed',finishedAt:new Date()}}:{})});
  streamChunkGeometry(jobId,chunkId,vertices,{workerId,durationMs});
  streamWorkerChunk(jobId,{chunkId,workerId,durationMs,triangles:vertices.length/9});
  streamJobProgress(jobId,progress);
  return res.json({success:true,progress});
 } catch(e){console.error(e);return res.status(500).json({error:'Could not save chunk'});}
};
const getModelGeometry = async (req,res) => {
 try {
  const job=await Job.findById(req.params.id).select('_id');
  if(!job)return res.sendStatus(404);
  const ids=await chunkStore.list(req.params.id);
  // Page by chunk to bound response size.
  const offset=Math.max(0,Math.min(100000,Number.parseInt(req.query.offset,10)||0));
  const limit=Math.max(1,Math.min(8,Number.parseInt(req.query.limit,10)||4));
  const chunks=await Promise.all(ids.slice(offset,offset+limit).map(async chunkId=>({chunkId,vertices:await chunkStore.load(req.params.id,chunkId)})));
  res.json({chunks,nextOffset:offset+chunks.length,hasMore:offset+chunks.length<ids.length});
 }catch(e){console.error(e);res.status(500).json({error:'Geometry unavailable'});}
};
const cancelJob=async(req,res)=>{
 const job=await Job.findOneAndUpdate({_id:req.params.id,status:{$in:['Pending','Running']}},{$set:{status:'Cancelled',finishedAt:new Date()}},{new:true});
 if(!job)return res.status(409).json({error:'Job cannot be cancelled'});
 streamJobProgress(String(job._id),job.progress);
 res.json({job});
};
const failJob=async(req,res)=>{
 const {jobId,error}=req.body;
 if(!/^[0-9a-f]{24}$/i.test(String(jobId)))return res.sendStatus(400);
 const job=await Job.findOneAndUpdate({_id:jobId,status:'Running'},{$set:{status:'Failed',error:String(error||'Worker failed').slice(0,500),finishedAt:new Date()}},{new:true});
 res.json({success:true,job});
};
module.exports = {
  createJob,
  getJob,
  updateProgress,
  getModelGeometry,
  startJob, cancelJob, failJob
};
