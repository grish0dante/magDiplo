const polygonise = require('./polygonise');
const { buildGridField } = require('./gridField');

const {
  buildFormulaField
} = require('./formulaField');

const marchingCubes = (
  chunk,
  isoLevel,
  resolution,
  formula,
  volumeSize = resolution,
  gridField = null
) => {
  const triangles = [];

  const field = gridField
    ? buildGridField(gridField, volumeSize)
    : buildFormulaField(formula);

  const MAX_TRIANGLES_PER_CHUNK = 1000000;

  const centerOffset = resolution / 2;
  const scale = resolution > 0 ? volumeSize / resolution : 1;

  const vertexOffsets = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1]
  ];

  for (
    let x = chunk.x;
    x < chunk.x + (chunk.sizeX ?? chunk.size);
    x++
  ) {
    for (
      let y = chunk.y;
      y < chunk.y + (chunk.sizeY ?? chunk.size);
      y++
    ) {
      for (
        let z = chunk.z;
        z < chunk.z + (chunk.sizeZ ?? chunk.size);
        z++
      ) {
        const points = [];
        const values = [];

        for (let i = 0; i < 8; i++) {
          const px =
            x + vertexOffsets[i][0];

          const py =
            y + vertexOffsets[i][1];

          const pz =
            z + vertexOffsets[i][2];

          const fx = (px - centerOffset) * scale;
          const fy = (py - centerOffset) * scale;
          const fz = (pz - centerOffset) * scale;

          points.push({
            x: fx,
            y: fy,
            z: fz
          });

          values.push(
            field(fx, fy, fz)
          );
        }

        const tris = polygonise(
          {
            points,
            values
          },
          isoLevel
        );

        if (tris.length) {
          triangles.push(...tris);
        }

        if (
          triangles.length >=
          MAX_TRIANGLES_PER_CHUNK
        ) {
          return triangles.slice(
            0,
            MAX_TRIANGLES_PER_CHUNK
          );
        }
      }
    }
  }

  return triangles;
};

module.exports = marchingCubes;