import api from '../api';

export const productService = {
  getAll: async () => {
    const response = await api.get('/products');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  update: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  addStock: async (id, quantity) => {
    const response = await api.patch(`/products/${id}/add_stock`, { quantity });
    return response.data;
  },

  reduceStock: async (id, quantity) => {
    const response = await api.patch(`/products/${id}/reduce_stock`, { quantity });
    return response.data;
  }
};