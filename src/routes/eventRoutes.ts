import express from 'express';
import { getPublicEvents, createEvent, markInterested, unmarkInterested, checkInterested, getEventCardData } from '../controllers/eventsController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadsMiddleware';

const router = express.Router();

router.get('/events', getPublicEvents);
// router.get('/events/:id', getEventById);
router.post('/events', authenticate, upload.single('image'), createEvent);
router.get('/events/:id', getEventCardData);

//interested routes
router.post('/events/:id/interested', authenticate, markInterested);
router.delete('/events/:id/interested', authenticate, unmarkInterested);
router.get('/events/:id/interested', authenticate, checkInterested);


export default router;
