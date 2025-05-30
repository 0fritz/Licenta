import express from 'express';
import { getPublicEvents, getEventById, createEvent } from '../controllers/eventsController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadsMiddleware';

const router = express.Router();

router.get('/events', getPublicEvents);
// router.get('/events/:id', getEventById);
router.post('/events', authenticate, upload.single('image'), createEvent);

export default router;
