const mongoose = require('mongoose');

const ModelSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },

    triangles: {
      type: Array,
      default: []
    },

    verticesCount: Number,

    trianglesCount: Number
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'Model',
  ModelSchema
);