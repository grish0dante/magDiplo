import api from '../services/api';

import {
  trianglesToGeometry,
  createMesh
} from './useMeshStreaming';

import {
  getThreeContext
} from '../stores/threeStore';

let currentMesh = null;

export const pollModel = (
  jobId
) => {
  const interval = setInterval(
    async () => {
      const response = await api.get(
        `/job/${jobId}/model`
      );

      const triangles =
        response.data.triangles;

      if (!triangles?.length)
        return;

      const geometry =
        trianglesToGeometry(
          triangles
        );

      const mesh = createMesh(
        geometry
      );

      const { scene } =
        getThreeContext();

      if (currentMesh) {
        scene.remove(currentMesh);
      }

      currentMesh = mesh;

      scene.add(mesh);
    }, 3000);

  return interval;
};