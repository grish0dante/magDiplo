const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  status: {
    type: String,
    default: 'Pending'
  },

  error: {type:String,default:''},
  progress: {
    type: Number,
    default: 0
  },

  formula: {
    type: String,
    default: 'x*x + y*y + z*z - 25'
  },

  gridField: { type: mongoose.Schema.Types.Mixed, default: null },

  isoValue: {
    type: Number,
    default: 0
  },

  resolution: {
    type: Number,
    default: 16
  },

  volumeSize: {
    type: Number,
    required: true,
    default: 16
  },

  chunkSize: {
    type: Number,
    required: true,
    default: 4
  },

  chunksTotal: {
    type: Number,
    default: 0
  },

  completedChunkIds: {type:[String],default:[]},
  startedAt: Date,
  finishedAt: Date,
  chunksCompleted: {
    type: Number,
    default: 0
  },

  vertices: {
    type: [Number],
    default: []
  }
});

module.exports = mongoose.model(
  'Job',
  JobSchema
);