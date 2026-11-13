const { Worker } = require('bullmq');
const IORedis = require('ioredis');

const processChunk = require('./processors/processChunk');
const { startHeartbeat } = require('./services/heartbeat');

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  maxRetriesPerRequest: null
});

const worker = new Worker(
  'marching-cubes',
  async (job) => {
    return processChunk(job.data);
  },
  {
    connection,
    concurrency: 1
  }
);

worker.on('completed', (job) => {
  console.log(`Completed ${job.id}`);
});

worker.on('failed', async (job, err) => {
 console.error(`Failed ${job?.id}:`, err.message);
 if(!job || job.attemptsMade < (job.opts.attempts||1))return;
 try {await require('axios').post(`${process.env.BACKEND_URL}/job/fail`,
  {jobId:job.data.jobId,error:err.message},
  {headers:{'x-worker-secret':process.env.WORKER_SECRET},timeout:10000});}
 catch(e){console.error('Failed to report job failure:',e.message);}
});

startHeartbeat();

console.log('Worker Started');

// Allow in-flight chunks to finish when Kubernetes scales the Deployment down.
let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: waiting for active BullMQ chunk to finish`);
  try {
    await worker.close();
    await connection.quit();
    process.exit(0);
  } catch (error) {
    console.error('Worker shutdown failed:', error);
    process.exit(1);
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
