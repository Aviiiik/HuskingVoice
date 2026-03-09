// src/models/leave.model.js
import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'earned', 'unpaid', 'maternity', 'other'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
}, { timestamps: true });

// Optional: prevent overlapping leaves for same employee (can be extended later)
leaveSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('endDate')) {
    const overlapping = await mongoose.model('Leave').findOne({
      employee: this.employee,
      status: { $ne: 'rejected' },
      $or: [
        { startDate: { $lte: this.endDate }, endDate: { $gte: this.startDate } },
      ],
    });
    if (overlapping) {
      return next(new Error('You already have an overlapping leave request'));
    }
  }
  next();
});

export default mongoose.model('Leave', leaveSchema);