const axios = require('axios');

const marchingCubes = require(
  '/shared/marching-cubes/marchingCubes'
);

const trianglesToVertices = (triangles) => {
  const vertices = [];

  for (const triangle of triangles) {
    for (const vertex of triangle) {
      if (!vertex) continue;

      vertices.push(
        Number(vertex.x),
        Number(vertex.y),
        Number(vertex.z)
      );
    }
  }

  return vertices;
};

const processChunk = async (data) => {
  const {
    jobId,
    chunk,
    isoValue,
    resolution,
    volumeSize,
    formula,
    gridField
  } = data;

  const chunkId = `${chunk.x}:${chunk.y}:${chunk.z}`;

  console.log(`Chunk ${chunkId}`);

  const startedAt = Date.now();
  const triangles = marchingCubes(
    chunk,
    isoValue,
    resolution,
    formula,
    volumeSize,
    gridField
  );

  const vertices = trianglesToVertices(
    triangles
  );

  console.log('Triangles:', triangles.length);
  console.log('Vertices:', vertices.length);

  await axios.post(
    `${process.env.BACKEND_URL}/job/progress`,
    {
      jobId,
      chunkId,
      vertices,
      workerId: require('node:os').hostname(),
      durationMs: Date.now() - startedAt
    }, {headers:{'x-worker-secret':process.env.WORKER_SECRET},timeout:30000}
  );

  return {
    success: true
  };
};

module.exports = processChunk;