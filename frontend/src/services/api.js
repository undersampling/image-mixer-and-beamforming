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

  // Media - category can be 'wireless' (electromagnetic) or 'medical' (acoustic)
  getMedia: async (category = 'medical') => {
    const response = await api.get('/media/', { params: { category } });
    return response.data;
  },
};
export const mixerService = {
  uploadImage: async (sessionId, imageData) => {
    const response = await api.post('/mixer/upload/', {
      session_id: sessionId,
      image_data: imageData
    });
    return response.data;
  },

  getComponent: async (sessionId, imageId, component) => {
    const response = await api.get('/mixer/image/component/', {
      params: { session_id: sessionId, image_id: imageId, component }
    });
    return response.data;
  },

  startMixing: async (sessionId, mixConfigs, regionType, regionSize) => {
    const response = await api.post('/mixer/mix/start/', {
      session_id: sessionId,
      mix_configs: mixConfigs,
      region_type: regionType,
      region_size: regionSize
    });
    return response.data;
  },

  getMixProgress: async (operationId) => {
    const response = await api.get('/mixer/mix/progress/', {
      params: { operation_id: operationId }
    });
    return response.data;
  }
};
export default api;

