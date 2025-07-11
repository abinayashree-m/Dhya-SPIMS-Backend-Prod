const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const aiController = require('../controllers/ai.controller');

// AI Insights routes
router.get('/insights', authMiddleware, aiController.getAiInsights);
router.post('/insights/generate', authMiddleware, aiController.generateInsights);

// Predictive Models routes
router.get('/predictive-models', authMiddleware, aiController.getPredictiveModels);
router.post('/predictive-models/train', authMiddleware, aiController.trainModel);
router.get('/predictive-models/:modelId', authMiddleware, aiController.getModelDetails);

// Predictions routes
router.post('/predictions/generate', authMiddleware, aiController.generatePrediction);
router.get('/predictions/:modelId/history', authMiddleware, aiController.getPredictionHistory);

// Recommendations routes
router.get('/recommendations', authMiddleware, aiController.getRecommendations);
router.post('/recommendations/:recommendationId/apply', authMiddleware, aiController.applyRecommendation);
router.post('/recommendations/generate', authMiddleware, aiController.generateRecommendations);

// Real-time AI data
router.get('/real-time', authMiddleware, aiController.getRealTimeAiData);

module.exports = router; 