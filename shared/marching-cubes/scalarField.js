const sphereField = (x, y, z, center, radius) => {
  const dx = x - center.x;
  const dy = y - center.y;
  const dz = z - center.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz) - radius;
};

module.exports = {
  sphereField
};
