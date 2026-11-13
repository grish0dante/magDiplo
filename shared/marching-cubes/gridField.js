// Trilinear interpolation of an editable, regular XYZ scalar lattice.
const MAX_GRID_SIZE = 25;

function validateGridField(grid) {
  if (!grid || !Number.isInteger(grid.size) || grid.size < 3 || grid.size > MAX_GRID_SIZE) {
    throw new Error('Grid size must be between 3 and 25');
  }
  if (!Array.isArray(grid.values) || grid.values.length !== grid.size ** 3) {
    throw new Error('Invalid grid values');
  }
  if (grid.values.some(value => typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 100)) {
    throw new Error('Grid values must be finite numbers between -100 and 100');
  }
}

function buildGridField(grid, volumeSize) {
  validateGridField(grid);
  const { size, values } = grid;
  const index = (x, y, z) => (z * size + y) * size + x;
  const axis = coordinate => {
    const position = (coordinate / volumeSize + 0.5) * (size - 1);
    const a = Math.max(0, Math.min(size - 2, Math.floor(position)));
    return [a, Math.max(0, Math.min(1, position - a))];
  };
  return (x, y, z) => {
    const [ix, tx] = axis(x);
    const [iy, ty] = axis(y);
    const [iz, tz] = axis(z);
    let result = 0;
    for (let dz = 0; dz <= 1; dz++) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = 0; dx <= 1; dx++) {
          const weight = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty) * (dz ? tz : 1 - tz);
          result += values[index(ix + dx, iy + dy, iz + dz)] * weight;
        }
      }
    }
    return result;
  };
}

module.exports = { validateGridField, buildGridField };
