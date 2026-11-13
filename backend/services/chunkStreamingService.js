const {
  getIO
} = require('../socket');

const streamChunkGeometry = (
  jobId,
  chunkId,
  vertices,
  metadata = {}
) => {
  const io = getIO();

  io.emit(`job:${jobId}:chunk`, {
    chunkId,
    vertices,
    ...metadata
  });
};

const streamJobProgress = (
  jobId,
  progress
) => {
  const io = getIO();

  io.emit(`job:${jobId}:progress`, {
    progress
  });
};

const streamWorkerChunk = (jobId, metadata) => {
  getIO().emit(`job:${jobId}:worker-chunk`, metadata);
};

module.exports = {
  streamWorkerChunk,
  streamChunkGeometry,
  streamJobProgress
};