const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const subscriptionsController = {
  // Get all subscriptions for a tenant
  async getSubscriptions(req, res) {
    try {
      const subscriptions = await prisma.subscriptions.findMany({
        where: { tenant_id: req.user.tenant_id }
      });
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Create a new subscription
  async createSubscription(req, res) {
    try {
      const subscription = await prisma.subscriptions.create({
        data: {
          tenant_id: req.user.tenant_id,
          plan_type: req.body.plan_type,
          start_date: new Date(req.body.start_date),
          end_date: new Date(req.body.end_date),
          is_active: true
        }
      });
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update a subscription
  async updateSubscription(req, res) {
    try {
      const subscription = await prisma.subscriptions.update({
        where: { id: req.params.id },
        data: {
          plan_type: req.body.plan_type,
          start_date: new Date(req.body.start_date),
          end_date: new Date(req.body.end_date),
          is_active: req.body.is_active
        }
      });
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a subscription
  async deleteSubscription(req, res) {
    try {
      await prisma.subscriptions.delete({
        where: { id: req.params.id }
      });
      res.json({ message: 'Subscription deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = subscriptionsController;
