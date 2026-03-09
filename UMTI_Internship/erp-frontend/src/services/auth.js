import api from '../api';

export const authService = {
  login: async (username, password) => {
    // Using FormData as shown in your working console test
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      console.log('Token stored:', response.data.access_token); // For debugging
    }
    
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  // Add this to test if token is valid
  getToken: () => {
    return localStorage.getItem('token');
  }
};