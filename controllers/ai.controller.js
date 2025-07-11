const aiService = require('../services/ai.service');

// Get AI Insights
const getAiInsights = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const insights = await aiService.generateInsights(tenantId);
    
    res.json({
      insights: insights,
      summary: {
        totalInsights: insights.length,
        highImpact: insights.filter(i => i.impact === 'high').length,
        actionable: insights.filter(i => i.actionable).length,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting AI insights:', error);
    res.status(500).json({ error: 'Failed to get AI insights' });
  }
};

// Generate new insights
const generateInsights = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { category, timeframe } = req.body;
    
    const insights = await aiService.generateInsights(tenantId, { category, timeframe });
    res.json({ insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};

// Get Predictive Models
const getPredictiveModels = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const models = await aiService.getPredictiveModels(tenantId);
    
    res.json({
      models: models,
      summary: {
        totalModels: models.length,
        averageAccuracy: models.length > 0 ? 
          models.reduce((acc, model) => acc + model.accuracy, 0) / models.length : 0,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting predictive models:', error);
    res.status(500).json({ error: 'Failed to get predictive models' });
  }
};

// Train a new model
const trainModel = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { metric, modelType, parameters } = req.body;
    
    const model = await aiService.trainModel(tenantId, { metric, modelType, parameters });
    res.json({ model });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({ error: 'Failed to train model' });
  }
};

// Get model details
const getModelDetails = async (req, res) => {
  try {
    const { modelId } = req.params;
    const tenantId = req.user.tenant_id;
    
    const model = await aiService.getModelDetails(tenantId, modelId);
    res.json({ model });
  } catch (error) {
    console.error('Error getting model details:', error);
    res.status(500).json({ error: 'Failed to get model details' });
  }
};

// Generate prediction
const generatePrediction = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { modelId, timeframe } = req.body;
    
    const prediction = await aiService.generatePrediction(tenantId, modelId, timeframe);
    res.json(prediction);
  } catch (error) {
    console.error('Error generating prediction:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
};

// Get prediction history
const getPredictionHistory = async (req, res) => {
  try {
    const { modelId } = req.params;
    const tenantId = req.user.tenant_id;
    
    const history = await aiService.getPredictionHistory(tenantId, modelId);
    res.json({ history });
  } catch (error) {
    console.error('Error getting prediction history:', error);
    res.status(500).json({ error: 'Failed to get prediction history' });
  }
};

// Get recommendations
const getRecommendations = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const recommendations = await aiService.getRecommendations(tenantId);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

// Apply recommendation
const applyRecommendation = async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const tenantId = req.user.tenant_id;
    
    const result = await aiService.applyRecommendation(tenantId, recommendationId);
    res.json(result);
  } catch (error) {
    console.error('Error applying recommendation:', error);
    res.status(500).json({ error: 'Failed to apply recommendation' });
  }
};

// Generate recommendations
const generateRecommendations = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { category, priority } = req.body;
    
    const recommendations = await aiService.generateRecommendations(tenantId, { category, priority });
    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};

// Get real-time AI data
const getRealTimeAiData = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const data = await aiService.getRealTimeData(tenantId);
    res.json(data);
  } catch (error) {
    console.error('Error getting real-time AI data:', error);
    res.status(500).json({ error: 'Failed to get real-time AI data' });
  }
};

module.exports = {
  getAiInsights,
  generateInsights,
  getPredictiveModels,
  trainModel,
  getModelDetails,
  generatePrediction,
  getPredictionHistory,
  getRecommendations,
  applyRecommendation,
  generateRecommendations,
  getRealTimeAiData
}; 