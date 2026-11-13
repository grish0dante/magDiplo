import { defineStore } from 'pinia';

export const useJobStore = defineStore(
  'job',
  {
    state: () => ({
      currentJob: null,
      progress: 0,
      triangles: [],
      loading: false
    }),

    actions: {
      setJob(job) {
        this.currentJob = job;
      },

      setProgress(progress) {
        this.progress = progress;
      },

      appendTriangles(triangles) {
        this.triangles.push(...triangles);
      }
    }
  }
);