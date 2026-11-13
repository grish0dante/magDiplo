import api from '../services/api';

export const createJob = async (payload) => {
  const response = await api.post('/job/create', payload);
  return response.data;
};

export const startJob = async (id) => {
  const response = await api.post(`/job/${id}/start`);
  return response.data;
};

export const getJob = async (id) => {
  const response = await api.get(`/job/${id}`);
  return response.data;
};