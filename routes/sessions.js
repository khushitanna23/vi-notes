import express from "express";
import sessionController from "../controllers/sessionController.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(sessionController.verifyToken);

// Routes
router.post('/', sessionController.createSession);
router.put('/:sessionId', sessionController.updateSession);
router.get('/', sessionController.getUserSessions);
router.get('/:sessionId', sessionController.getSession);
router.post('/:sessionId/end', sessionController.endSession);

export default router;
