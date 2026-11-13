const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1200 },
    visibility: {
      type: String,
      enum: ['private', 'unlisted', 'public'],
      default: 'private',
      index: true,
    },
    formula: { type: String, required: true, maxlength: 240 },
    isoValue: { type: Number, default: 0 },
    resolution: { type: Number, min: 16, max: 64 },
    chunkSize: { type: Number, min: 2, max: 8 },
    volumeSize: { type: Number, default: 32 },
    color: { type: String, default: '#29c7c7' },
    vertices: { type: [Number], default: undefined },
    triangleCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

schema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('SavedModel', schema);

