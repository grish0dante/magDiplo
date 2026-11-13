const fs = require('fs');

const exportOBJ = (
  triangles,
  path
) => {
  let obj = '';

  let index = 1;

  for (const triangle of triangles) {
    for (const vertex of triangle) {
      obj += `v ${vertex.x} ${vertex.y} ${vertex.z}
`;
    }

    obj += `f ${index} ${index + 1} ${index + 2}
`;

    index += 3;
  }

  fs.writeFileSync(path, obj);
};

module.exports = {
  exportOBJ
};