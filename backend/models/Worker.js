const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      unique: true
    },

    status: {
      type: String,
      default: 'Idle'
    },

    cpuLoad: Number,

    memoryUsage: Number,

    lastSeen: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Worker', WorkerSchema);