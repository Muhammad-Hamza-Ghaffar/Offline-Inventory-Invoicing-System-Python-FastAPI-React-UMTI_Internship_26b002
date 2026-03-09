import api from '../api';

export const csvService = {
  // EXPORT
  exportProducts: async () => {
    const response = await api.get('/csv/export/products', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportCustomers: async () => {
    const response = await api.get('/csv/export/customers', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'customers.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportSuppliers: async () => {
    const response = await api.get('/csv/export/suppliers', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'suppliers.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportSalesOrders: async () => {
    const response = await api.get('/csv/export/sales-orders', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_orders.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportPurchaseOrders: async () => {
    const response = await api.get('/csv/export/purchase-orders', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'purchase_orders.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // IMPORT
  importProducts: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/csv/import/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importCustomers: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/csv/import/customers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importSuppliers: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/csv/import/suppliers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};