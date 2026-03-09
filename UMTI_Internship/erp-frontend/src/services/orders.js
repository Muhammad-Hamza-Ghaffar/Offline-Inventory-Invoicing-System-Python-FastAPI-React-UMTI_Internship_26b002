import api from '../api';

export const orderService = {
  // Purchase Orders
  createPurchase: async (orderData) => {
    const response = await api.post('/orders/purchase', orderData);
    return response.data;
  },

  getPurchaseOrders: async () => {
    const response = await api.get('/orders/purchase');
    return response.data;
  },

  getPurchaseOrder: async (id) => {
    const response = await api.get(`/orders/purchase/${id}`);
    return response.data;
  },

  // Sales Orders
  createSales: async (orderData) => {
    const response = await api.post('/orders/sales', orderData);
    return response.data;
  },

  getSalesOrders: async () => {
    const response = await api.get('/orders/sales');
    return response.data;
  },

  getSalesOrder: async (id) => {
    const response = await api.get(`/orders/sales/${id}`);
    return response.data;
  },

  downloadInvoice: async (orderType, orderId) => {
    const response = await api.get(`/orders/${orderType}/${orderId}/invoice`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${orderType}_invoice_${orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};