const jobQueue = require('../queues/jobQueue');

const getQueueMetrics = async () => {
  const waiting = await jobQueue.getWaitingCount();
  const active = await jobQueue.getActiveCount();
  const completed = await jobQueue.getCompletedCount();
  const failed = await jobQueue.getFailedCount();

  return {
    waiting,
    active,
    completed,
    failed
  };
};

module.exports = {
  getQueueMetrics
};