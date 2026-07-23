import express from 'express';
import {
  createPrescription,
  getPrescriptions,
  getMyPrescriptions,
  updateMedicineAvailability,
  addMedicine,
  getMedicines,
  updateMedicine,
  deleteMedicine,
} from '../controllers/pharmacyController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Prescriptions
router.post('/prescriptions', requireRole('doctor'), createPrescription);
router.get('/prescriptions', getPrescriptions);
router.get('/my-prescriptions', requireRole('patient'), getMyPrescriptions);
router.patch('/prescriptions/:id/availability', updateMedicineAvailability);

// Medicines (inventory)
router.post('/medicines', requireRole('pharmacist'), addMedicine);
router.get('/medicines', getMedicines);
router.patch('/medicines/:id', requireRole('pharmacist'), updateMedicine);
router.delete('/medicines/:id', requireRole('pharmacist'), deleteMedicine);

export default router;
