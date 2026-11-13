const Worker = require('../models/Worker');

const heartbeat = async (req, res) => {
  const {
    workerId,
    cpuLoad,
    memoryUsage
  } = req.body;

  await Worker.findOneAndUpdate(
    { workerId },
    {
      workerId,
      cpuLoad,
      memoryUsage,
      lastSeen: new Date(),
      status: 'Active'
    },
    {

      upsert: true,
      returnDocument: 'after'
    }
  );

  res.json({
    success: true
  });
};

const getWorkers = async (req, res) => {
  const workers = await Worker.find().sort({
    updatedAt: -1
  });

  res.json(workers);
};

module.exports = {
  heartbeat,
  getWorkers
};
