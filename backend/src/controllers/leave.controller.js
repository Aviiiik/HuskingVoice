// src/controllers/leave.controller.js
import jwt from 'jsonwebtoken';
import Leave from '../models/leave.model.js';
import User from '../models/user.model.js';

const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1];
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

const getCurrentUser = async (req) => {
  const decoded = verifyToken(req);
  const user = await User.findById(decoded.sub).select('role _id');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const applyForLeave = async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (user.role !== 'employee') {
      return res.status(403).json({ message: 'Only employees can apply for leave' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    const leave = await Leave.create({
      employee: user._id,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted',
      data: leave,
    });
  } catch (err) {
    const status = err.message.includes('token') ? 401 : 400;
    return res.status(status).json({ message: err.message });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (user.role !== 'employee') {
      return res.status(403).json({ message: 'Only employees can view their own leaves' });
    }

    const leaves = await Leave.find({ employee: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (err) {
    const status = err.message.includes('token') ? 401 : 500;
    return res.status(status).json({ message: err.message });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can view all leaves' });
    }

    const leaves = await Leave.find()
      .populate('employee', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (err) {
    const status = err.message.includes('token') ? 401 : 500;
    return res.status(status).json({ message: err.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can approve/reject leaves' });
    }

    const { status } = req.body;
    const leaveId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: `Leave already ${leave.status}` });
    }

    leave.status = status;
    leave.reviewedBy = user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    return res.json({
      success: true,
      message: `Leave ${status}`,
      data: leave,
    });
  } catch (err) {
    const status = err.message.includes('token') ? 401 : 400;
    return res.status(status).json({ message: err.message });
  }
};