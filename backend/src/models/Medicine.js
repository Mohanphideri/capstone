import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      enum: ['tablets', 'ml', 'strips', 'vials', 'capsules'],
      default: 'tablets',
    },
    price: {
      type: Number,
      required: true,
    },
    expiryDate: Date,
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Medicine', medicineSchema);
