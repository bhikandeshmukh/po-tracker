// lib/api-client.js
// Frontend API client for making requests to backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class APIClient {
  constructor() {
    this.token = null;
    // Try to load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('authToken', token);
      } else {
        localStorage.removeItem('authToken');
      }
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { success: false, error: { message: await response.text() } };
      }

      if (!response.ok) {
        // If unauthorized, redirect to login
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            this.setToken(null);
            window.location.href = '/login';
          }
        }
        
        // Create error with status code
        const error = new Error(data.error?.message || 'Request failed');
        error.status = response.status;
        error.code = data.error?.code;
        error.details = data.error?.details;
        throw error;
      }

      return data;
    } catch (error) {
      // Add more context to network errors
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        error.message = 'Network error. Please check your connection.';
      }
      
      console.error('API Error:', {
        endpoint,
        message: error.message,
        status: error.status,
        code: error.code
      });
      
      throw error;
    }
  }

  // GET request
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, { method: 'GET' });
  }

  // POST request
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ==========================================
  // AUTH METHODS
  // ==========================================

  async login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    return this.post('/auth/logout');
  }

  // ==========================================
  // USER METHODS
  // ==========================================

  async getUsers(params = {}) {
    return this.get('/users', params);
  }

  async getUserById(userId) {
    return this.get(`/users/${userId}`);
  }

  async createUser(userData) {
    return this.post('/users', userData);
  }

  async updateUser(userId, data) {
    return this.put(`/users/${userId}`, data);
  }

  async deleteUser(userId) {
    return this.delete(`/users/${userId}`);
  }

  // ==========================================
  // VENDOR METHODS
  // ==========================================

  async getVendors(params = {}) {
    return this.get('/vendors', params);
  }

  async getVendorById(vendorId) {
    return this.get(`/vendors/${vendorId}`);
  }

  async createVendor(vendorData) {
    return this.post('/vendors', vendorData);
  }

  async updateVendor(vendorId, data) {
    return this.put(`/vendors/${vendorId}`, data);
  }

  async deleteVendor(vendorId) {
    return this.delete(`/vendors/${vendorId}`);
  }

  async getVendorWarehouses(vendorId) {
    return this.get(`/vendors/${vendorId}/warehouses`);
  }

  async getWarehouseById(vendorId, warehouseId) {
    return this.get(`/vendors/${vendorId}/warehouses/${warehouseId}`);
  }

  async addWarehouse(vendorId, warehouseData) {
    return this.post(`/vendors/${vendorId}/warehouses`, warehouseData);
  }

  async updateWarehouse(vendorId, warehouseId, data) {
    return this.put(`/vendors/${vendorId}/warehouses/${warehouseId}`, data);
  }

  async deleteWarehouse(vendorId, warehouseId) {
    return this.delete(`/vendors/${vendorId}/warehouses/${warehouseId}`);
  }

  // ==========================================
  // TRANSPORTER METHODS
  // ==========================================

  async getTransporters(params = {}) {
    return this.get('/transporters', params);
  }

  async getTransporterById(transporterId) {
    return this.get(`/transporters/${transporterId}`);
  }

  async createTransporter(data) {
    return this.post('/transporters', data);
  }

  async updateTransporter(transporterId, data) {
    return this.put(`/transporters/${transporterId}`, data);
  }

  async deleteTransporter(transporterId) {
    return this.delete(`/transporters/${transporterId}`);
  }

  // ==========================================
  // PURCHASE ORDER METHODS
  // ==========================================

  async getPurchaseOrders(params = {}) {
    return this.get('/purchase-orders', params);
  }

  async getPOById(poId) {
    return this.get(`/purchase-orders/${poId}`);
  }

  async createPO(poData) {
    return this.post('/purchase-orders', poData);
  }

  async updatePO(poId, data) {
    return this.put(`/purchase-orders/${poId}`, data);
  }

  async approvePO(poId, data) {
    return this.post(`/purchase-orders/${poId}/approve`, data);
  }

  async cancelPO(poId, data) {
    return this.post(`/purchase-orders/${poId}/cancel`, data);
  }

  async getPOItems(poId) {
    return this.get(`/purchase-orders/${poId}/items`);
  }

  async addPOItem(poId, itemData) {
    return this.post(`/purchase-orders/${poId}/items`, itemData);
  }

  async updatePOItem(poId, itemId, data) {
    return this.put(`/purchase-orders/${poId}/items/${itemId}`, data);
  }

  async deletePOItem(poId, itemId) {
    return this.delete(`/purchase-orders/${poId}/items/${itemId}`);
  }

  async getPOActivityLog(poId) {
    return this.get(`/purchase-orders/${poId}/activity-log`);
  }

  // ==========================================
  // SHIPMENT METHODS
  // ==========================================

  async getShipments(params = {}) {
    return this.get('/shipments', params);
  }

  async getShipmentById(shipmentId) {
    return this.get(`/shipments/${shipmentId}`);
  }

  async createShipment(shipmentData) {
    return this.post('/shipments', shipmentData);
  }

  async updateShipment(shipmentId, data) {
    return this.put(`/shipments/${shipmentId}`, data);
  }

  async updateShipmentStatus(shipmentId, data) {
    return this.put(`/shipments/${shipmentId}/status`, data);
  }

  async markShipmentDelivered(shipmentId, data) {
    return this.post(`/shipments/${shipmentId}/deliver`, data);
  }

  async cancelShipment(shipmentId, data) {
    return this.post(`/shipments/${shipmentId}/cancel`, data);
  }

  // ==========================================
  // APPOINTMENT METHODS
  // ==========================================

  async getAppointments(params = {}) {
    return this.get('/appointments', params);
  }

  async getAppointmentById(appointmentId) {
    return this.get(`/appointments/${appointmentId}`);
  }

  async createAppointment(appointmentData) {
    return this.post('/appointments', appointmentData);
  }

  async updateAppointment(appointmentId, data) {
    return this.put(`/appointments/${appointmentId}`, data);
  }

  async rescheduleAppointment(appointmentId, data) {
    return this.post(`/appointments/${appointmentId}/reschedule`, data);
  }

  async completeAppointment(appointmentId, data) {
    return this.post(`/appointments/${appointmentId}/complete`, data);
  }

  async cancelAppointment(appointmentId, data) {
    return this.post(`/appointments/${appointmentId}/cancel`, data);
  }

  // ==========================================
  // RETURN ORDER METHODS
  // ==========================================

  async getReturns(params = {}) {
    return this.get('/returns', params);
  }

  async getReturnById(returnId) {
    return this.get(`/returns/${returnId}`);
  }

  async createReturn(returnData) {
    return this.post('/returns', returnData);
  }

  async approveReturn(returnId, data) {
    return this.post(`/returns/${returnId}/approve`, data);
  }

  async rejectReturn(returnId, data) {
    return this.post(`/returns/${returnId}/reject`, data);
  }

  async markReturnReceived(returnId, data) {
    return this.post(`/returns/${returnId}/receive`, data);
  }

  async updateReturn(returnId, data) {
    return this.put(`/returns/${returnId}`, data);
  }

  // ==========================================
  // DASHBOARD METHODS
  // ==========================================

  async getDashboardMetrics(forceRefresh = false) {
    const params = forceRefresh ? { refresh: 'true', _t: Date.now() } : { _t: Date.now() };
    return this.get('/dashboard/metrics', params);
  }

  async getRecentActivities(params = {}) {
    // Add timestamp to prevent caching
    return this.get('/dashboard/recent-activities', { ...params, _t: Date.now() });
  }

  async getStatistics(params = {}) {
    return this.get('/dashboard/statistics', params);
  }

  async getChartData(params = {}) {
    return this.get('/dashboard/chart-data', params);
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
