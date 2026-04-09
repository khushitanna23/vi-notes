import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

const ensureDbReady = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database is not connected. Please start MongoDB and try again.',
    });
    return false;
  }
  return true;
};

const createSession = async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const userId = req.userId;

    const session = new Session({
      userId,
      metrics: {
        characterCount: 0,
        wordCount: 0,
        revisionEventCount: 0,
      },
    });

    await session.save();

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateSession = async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const { sessionId } = req.params;
    const { keystrokes, pasteEvents, metrics } = req.body;

    const session = await Session.findOne({ _id: sessionId, userId: req.userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (metrics && typeof metrics === 'object') {
      session.set('metrics', {
        characterCount: Number(metrics.characterCount) || 0,
        wordCount: Number(metrics.wordCount) || 0,
        revisionEventCount: Number(metrics.revisionEventCount) || 0,
      });
    }

    if (keystrokes && Array.isArray(keystrokes)) {
      session.keystrokes.push(...keystrokes);
    }

    if (pasteEvents && Array.isArray(pasteEvents)) {
      session.pasteEvents.push(...pasteEvents);
    }

    await session.save();

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: session,
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getUserSessions = async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const sessions = await Session.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-keystrokes -pasteEvents');

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getSession = async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const { sessionId } = req.params;

    const session = await Session.findOne({ _id: sessionId, userId: req.userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const authenticityScore = session.calculateAuthenticity();
    await session.save();

    res.json({
      success: true,
      data: {
        ...session.toObject(),
        authenticityScore,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const endSession = async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const { sessionId } = req.params;

    const session = await Session.findOne({ _id: sessionId, userId: req.userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    session.endTime = new Date();
    const authenticityScore = session.calculateAuthenticity();
    await session.save();

    res.json({
      success: true,
      message: 'Session ended successfully',
      data: {
        session,
        authenticityScore,
      },
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export { verifyToken, createSession, updateSession, getUserSessions, getSession, endSession };
export default { verifyToken, createSession, updateSession, getUserSessions, getSession, endSession };
