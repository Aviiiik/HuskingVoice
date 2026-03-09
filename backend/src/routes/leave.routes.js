// src/routes/leave.routes.js
import express from 'express';
import {
  applyForLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
} from '../controllers/leave.controller.js';

const router = express.Router();

router.post('/apply',      applyForLeave);
router.get('/my-leaves',   getMyLeaves);
router.get('/all',         getAllLeaves);
router.put('/:id/status',  updateLeaveStatus);

export default router;