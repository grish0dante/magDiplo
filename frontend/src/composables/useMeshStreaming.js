import * as THREE from 'three';

export const trianglesToGeometry = (
  triangles
) => {
  const vertices = [];

  for (const triangle of triangles) {
    for (const vertex of triangle) {
      vertices.push(
        vertex.x,
        vertex.y,
        vertex.z
      );
    }
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      vertices,
      3
    )
  );

  geometry.computeVertexNormals();

  return geometry;
};

export const createMesh = (
  geometry
) => {
  const material =
    new THREE.MeshStandardMaterial({
    color: 0x4fd1c5,
    wireframe: true,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(
    geometry,
    material
  );
};