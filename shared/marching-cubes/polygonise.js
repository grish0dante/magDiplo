const edgeTable = require('./edgeTable');
const triTable = require('./triTable');
const interpolateVertex = require('./interpolateVertex');

const edgeConnections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7]
];

const polygonise = (grid, isoLevel) => {
  let cubeIndex = 0;

  if (grid.values[0] < isoLevel) cubeIndex |= 1;
  if (grid.values[1] < isoLevel) cubeIndex |= 2;
  if (grid.values[2] < isoLevel) cubeIndex |= 4;
  if (grid.values[3] < isoLevel) cubeIndex |= 8;
  if (grid.values[4] < isoLevel) cubeIndex |= 16;
  if (grid.values[5] < isoLevel) cubeIndex |= 32;
  if (grid.values[6] < isoLevel) cubeIndex |= 64;
  if (grid.values[7] < isoLevel) cubeIndex |= 128;

  const edges = edgeTable[cubeIndex];

  if (edges === 0) {
    return [];
  }

  const vertList = new Array(12);

  for (let edge = 0; edge < 12; edge++) {
    if (edges & (1 << edge)) {
      const [a, b] = edgeConnections[edge];

      vertList[edge] = interpolateVertex(
        isoLevel,
        grid.points[a],
        grid.points[b],
        grid.values[a],
        grid.values[b]
      );
    }
  }

  const triangles = [];

  const isFlatTriTable =
    triTable instanceof Int32Array ||
    triTable instanceof Array && typeof triTable[0] === 'number';

  if (isFlatTriTable) {
    const rowStart = cubeIndex * 16;

    for (let i = 0; i < 16; i += 3) {
      const aIndex = triTable[rowStart + i];

      if (aIndex === -1 || aIndex === undefined) break;

      const bIndex = triTable[rowStart + i + 1];
      const cIndex = triTable[rowStart + i + 2];

      if (
        bIndex === -1 ||
        cIndex === -1 ||
        bIndex === undefined ||
        cIndex === undefined
      ) {
        break;
      }

      const a = vertList[aIndex];
      const b = vertList[bIndex];
      const c = vertList[cIndex];

      if (a && b && c) {
        triangles.push([a, b, c]);
      }
    }

    return triangles;
  }

  const row = triTable[cubeIndex];

  if (!row) {
    return [];
  }

  for (let i = 0; i < row.length && row[i] !== -1; i += 3) {
    const aIndex = row[i];
    const bIndex = row[i + 1];
    const cIndex = row[i + 2];

    if (
      aIndex === undefined ||
      bIndex === undefined ||
      cIndex === undefined ||
      aIndex === -1 ||
      bIndex === -1 ||
      cIndex === -1
    ) {
      break;
    }

    const a = vertList[aIndex];
    const b = vertList[bIndex];
    const c = vertList[cIndex];

    if (a && b && c) {
      triangles.push([a, b, c]);
    }
  }

  return triangles;
};

module.exports = polygonise;