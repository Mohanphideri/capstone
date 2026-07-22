import Appointment from '../models/Appointment.js';
import Department from '../models/Department.js';

export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, departmentId, slotTime } = req.body;
    const patientId = req.user._id;

    if (!doctorId || !departmentId || !slotTime) {
      return res.status(400).json({ error: 'Doctor, department, and slot time required' });
    }

    // Check for slot availability
    const existingAppointment = await Appointment.findOne({
      doctorId,
      slotTime: new Date(slotTime),
      status: { $ne: 'cancelled' },
    });

    if (existingAppointment) {
      return res.status(400).json({ error: 'Slot already booked' });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      department: departmentId,
      slotTime: new Date(slotTime),
      status: 'booked',
    });

    await appointment.populate(['patientId', 'doctorId', 'department']);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { role } = req.user;
    let filter = {};

    if (role === 'patient') {
      filter.patientId = userId;
    } else if (role === 'doctor') {
      filter.doctorId = userId;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId')
      .populate('doctorId')
      .populate('department')
      .sort({ slotTime: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get My Appointments Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patientId')
      .populate('doctorId')
      .populate('department')
      .sort({ slotTime: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get All Appointments Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSlots = await Appointment.find({
      doctorId,
      slotTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    // Generate available slots (9 AM to 5 PM, every 30 minutes)
    const slots = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(startOfDay);
        slotTime.setHours(hour, minute);

        const isBooked = bookedSlots.some(
          (slot) => slot.slotTime.getTime() === slotTime.getTime()
        );

        if (!isBooked) {
          slots.push({
            time: slotTime,
            available: true,
          });
        }
      }
    }

    res.json(slots);
  } catch (error) {
    console.error('Get Available Slots Error:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['booked', 'completed', 'cancelled', 'no-show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment status updated',
      appointment,
    });
  } catch (error) {
    console.error('Update Appointment Status Error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    )
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment cancelled',
      appointment,
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};
