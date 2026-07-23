import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authService = {
  sendOTP: (phone) => api.post('/auth/patient/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/patient/verify-otp', { phone, otp }),
  staffLogin: (username, password) => api.post('/auth/staff/login', { username, password }),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

// Staff endpoints
export const staffService = {
  addStaff: (staffData) => api.post('/staff', staffData),
  getStaff: (role) => api.get('/staff', { params: { role } }),
  updateStaff: (id, data) => api.patch(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),
  getDoctors: (departmentId) => api.get('/staff/doctors', { params: { departmentId } }),
  getMyProfile: () => api.get('/staff/me'),
  updateMyProfile: (data) => api.patch('/staff/me', data),
};

// Appointments endpoints
export const appointmentService = {
  bookAppointment: (data) => api.post('/appointments', data),
  getMyAppointments: () => api.get('/appointments/mine'),
  getAllAppointments: () => api.get('/appointments'),
  getAvailableSlots: (doctorId, date) =>
    api.get('/appointments/available-slots', { params: { doctorId, date } }),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  cancel: (id) => api.delete(`/appointments/${id}`),
  getByCode: (code) => api.get(`/appointments/lookup/${encodeURIComponent(code)}`),
};

// Queue endpoints
export const queueService = {
  joinQueue: (departmentId) => api.post('/queue/join', { departmentId }),
  getQueueStatus: (departmentId) => api.get(`/queue/status/${departmentId}`),
  getMyToken: () => api.get('/queue/my-token'),
  updateStatus: (id, status, action) => api.patch(`/queue/${id}/status`, { status, action }),
  leaveQueue: (id) => api.delete(`/queue/${id}/leave`),
};

// Queries endpoints
export const queryService = {
  create: (subject, message) => api.post('/queries', { subject, message }),
  getMine: () => api.get('/queries/mine'),
  getOpen: () => api.get('/queries'),
  reply: (id, reply, assignedDoctorId) =>
    api.patch(`/queries/${id}/reply`, { reply, assignedDoctorId }),
  close: (id) => api.patch(`/queries/${id}/close`),
};

// Pharmacy endpoints
export const pharmacyService = {
  createPrescription: (data) => api.post('/pharmacy/prescriptions', data),
  getPrescriptions: (filters) => api.get('/pharmacy/prescriptions', { params: filters }),
  getMyPrescriptions: () => api.get('/pharmacy/my-prescriptions'),
  updateMedicineAvailability: (prescriptionId, medicineIndex, availability) =>
    api.patch(`/pharmacy/prescriptions/${prescriptionId}/availability`, {
      medicineIndex,
      availability,
    }),
  addMedicine: (data) => api.post('/pharmacy/medicines', data),
  getMedicines: () => api.get('/pharmacy/medicines'),
  updateMedicine: (id, data) => api.patch(`/pharmacy/medicines/${id}`, data),
  deleteMedicine: (id) => api.delete(`/pharmacy/medicines/${id}`),
};

// Leave endpoints
export const leaveService = {
  apply: (fromDate, toDate, reason) =>
    api.post('/leave', { fromDate, toDate, reason }),
  getMine: () => api.get('/leave/mine'),
  getPending: () => api.get('/leave'),
  approve: (id) => api.patch(`/leave/${id}/approve`),
  reject: (id) => api.patch(`/leave/${id}/reject`),
};

// Departments endpoints
export const departmentService = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (name) => api.post('/departments', { name }),
  assignDoctor: (id, doctorId) => api.patch(`/departments/${id}/assign-doctor`, { doctorId }),
  removeDoctor: (id, doctorId) => api.patch(`/departments/${id}/remove-doctor`, { doctorId }),
};

// Analytics endpoints
export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
};

export default api;
