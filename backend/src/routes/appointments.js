import express from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getAllAppointments,
  getAvailableSlots,
  updateAppointmentStatus,
  cancelAppointment,
} from '../controllers/appointmentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Patient: book appointment
router.post('/', requireRole('patient'), bookAppointment);

// Get available slots
router.get('/available-slots', getAvailableSlots);

// Get my appointments
router.get('/mine', getMyAppointments);

// Admin: get all appointments
router.get('/', requireRole('admin'), getAllAppointments);

// Update appointment status
router.patch('/:id/status', updateAppointmentStatus);

// Cancel appointment
router.delete('/:id', cancelAppointment);

export default router;
