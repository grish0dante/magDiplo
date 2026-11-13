const Model = require('../models/Model');

const appendChunkGeometry = async (
  jobId,
  triangles
) => {
  let model = await Model.findOne({
    jobId
  });

  if (!model) {
    model = await Model.create({
      jobId,
      triangles: []
    });
  }

  model.triangles = triangles.slice(0, 50);

  model.trianglesCount =
    model.triangles.length;

  await model.save();
};

module.exports = {
  appendChunkGeometry
};