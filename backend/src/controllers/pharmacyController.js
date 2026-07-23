import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';

export const createPrescription = async (req, res) => {
  try {
    const { appointmentId, patientId, medicines } = req.body;
    const doctorId = req.user._id;

    if (!appointmentId || !patientId || !medicines || medicines.length === 0) {
      return res.status(400).json({ error: 'Appointment, patient, and medicines required' });
    }

    const prescription = await Prescription.create({
      appointmentId,
      patientId,
      doctorId,
      medicines,
    });

    await prescription.populate(['appointmentId', 'patientId', 'doctorId']);

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription,
    });
  } catch (error) {
    console.error('Create Prescription Error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
};

export const getPrescriptions = async (req, res) => {
  try {
    const { patientId, appointmentId, appointmentCode, patientName, doctorId } = req.query;
    let filter = {};

    if (patientId) filter.patientId = patientId;
    if (appointmentId) filter.appointmentId = appointmentId;
    if (doctorId) filter.doctorId = doctorId;

    // Human-readable appointment code (e.g. APT-260723-4F2K) -> resolve to its ObjectId
    if (appointmentCode) {
      const appointment = await Appointment.findOne({
        appointmentCode: appointmentCode.trim().toUpperCase(),
      });
      if (!appointment) {
        return res.json([]);
      }
      filter.appointmentId = appointment._id;
    }

    const prescriptions = await Prescription.find(filter)
      .populate(['appointmentId', 'patientId', 'doctorId']);

    // If searching by patient name, filter results
    let results = prescriptions;
    if (patientName) {
      results = prescriptions.filter((p) =>
        p.patientId.name.toLowerCase().includes(patientName.toLowerCase())
      );
    }

    res.json(results);
  } catch (error) {
    console.error('Get Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

export const getMyPrescriptions = async (req, res) => {
  try {
    const patientId = req.user._id;

    const prescriptions = await Prescription.find({ patientId })
      .populate(['appointmentId', 'doctorId'])
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get My Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

export const updateMedicineAvailability = async (req, res) => {
  try {
    const { medicineIndex, availability } = req.body;
    const prescriptionId = req.params.id;

    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (medicineIndex < 0 || medicineIndex >= prescription.medicines.length) {
      return res.status(400).json({ error: 'Invalid medicine index' });
    }

    prescription.medicines[medicineIndex].availability = availability;
    await prescription.save();

    res.json({
      message: 'Medicine availability updated',
      prescription,
    });
  } catch (error) {
    console.error('Update Medicine Availability Error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};

export const addMedicine = async (req, res) => {
  try {
    const { name, quantity, unit, price, expiryDate } = req.body;

    if (!name || !quantity || !price) {
      return res.status(400).json({ error: 'Name, quantity, and price required' });
    }

    const medicine = await Medicine.create({
      name,
      quantity,
      unit: unit || 'tablets',
      price,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    });

    res.status(201).json({
      message: 'Medicine added successfully',
      medicine,
    });
  } catch (error) {
    console.error('Add Medicine Error:', error);
    res.status(500).json({ error: 'Failed to add medicine' });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (error) {
    console.error('Get Medicines Error:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const { quantity, price, expiryDate, isAvailable } = req.body;

    const updates = {};
    if (quantity !== undefined) updates.quantity = quantity;
    if (price !== undefined) updates.price = price;
    if (expiryDate !== undefined) updates.expiryDate = new Date(expiryDate);
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json({
      message: 'Medicine updated successfully',
      medicine,
    });
  } catch (error) {
    console.error('Update Medicine Error:', error);
    res.status(500).json({ error: 'Failed to update medicine' });
  }
};

export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Delete Medicine Error:', error);
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
};
