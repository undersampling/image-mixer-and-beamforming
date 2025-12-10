import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Calculate beamforming results
  calculate: async (config) => {
    const response = await api.post('/calculate/', config);
    return response.data;
  },

  // Scenarios
  getScenarios: async () => {
    const response = await api.get('/scenarios/');
    return response.data;
  },

  getScenario: async (scenarioId) => {
    const response = await api.get(`/scenarios/${scenarioId}/`);
    return response.data;
  },

  saveScenario: async (scenarioId, config) => {
    const response = await api.put(`/scenarios/${scenarioId}/`, config);
    return response.data;
  },

  resetScenario: async (scenarioId) => {
    const response = await api.post(`/scenarios/${scenarioId}/reset/`);
    return response.data;
  },

  resetAllScenarios: async () => {
    const response = await api.post('/scenarios/reset-all/');
    return response.data;
  },

  // Media
  getMedia: async () => {
    const response = await api.get('/media/');
    return response.data;
  },
};

export default api;

