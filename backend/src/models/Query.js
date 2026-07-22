import mongoose from 'mongoose';

const querySchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'answered', 'closed'],
      default: 'open',
    },
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reply: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    repliedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Query', querySchema);
