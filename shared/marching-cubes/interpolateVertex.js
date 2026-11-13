const interpolateVertex = (
  isoLevel,
  p1,
  p2,
  val1,
  val2
) => {
  if (Math.abs(isoLevel - val1) < 0.00001) return p1;
  if (Math.abs(isoLevel - val2) < 0.00001) return p2;
  if (Math.abs(val1 - val2) < 0.00001) return p1;

  const mu = (isoLevel - val1) / (val2 - val1);

  return {
    x: p1.x + mu * (p2.x - p1.x),
    y: p1.y + mu * (p2.y - p1.y),
    z: p1.z + mu * (p2.z - p1.z)
  };
};

module.exports = interpolateVertex;
