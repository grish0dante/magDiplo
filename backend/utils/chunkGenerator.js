const generateChunks = (
  resolution,
  chunkSize,
  maxChunks = Infinity
) => {
  const chunks = [];

  for (let x = 0; x < resolution; x += chunkSize) {
    for (let y = 0; y < resolution; y += chunkSize) {
      for (let z = 0; z < resolution; z += chunkSize) {
        chunks.push({
          x,
          y,
          z,
          size: chunkSize,
          sizeX: Math.min(chunkSize, resolution - x),
          sizeY: Math.min(chunkSize, resolution - y),
          sizeZ: Math.min(chunkSize, resolution - z)
        });

        if (chunks.length >= maxChunks) {
          return chunks;
        }
      }
    }
  }

  return chunks;
};

module.exports = generateChunks;
