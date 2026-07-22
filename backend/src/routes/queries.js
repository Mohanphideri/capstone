import express from 'express';
import {
  createQuery,
  getMyQueries,
  getOpenQueries,
  replyToQuery,
  closeQuery,
} from '../controllers/queryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Patient: create query
router.post('/', requireRole('patient'), createQuery);

// Patient: get my queries
router.get('/mine', requireRole('patient'), getMyQueries);

// Receptionist: get open queries
router.get('/', requireRole('receptionist'), getOpenQueries);

// Receptionist: reply to query
router.patch('/:id/reply', requireRole('receptionist'), replyToQuery);

// Close query
router.patch('/:id/close', closeQuery);

export default router;
