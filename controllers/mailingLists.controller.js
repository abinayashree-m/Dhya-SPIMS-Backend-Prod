const {
  createMailingListService,
  getMailingListsService,
  deleteMailingListService,
  updateMailingListService,
  getMailingListContactsService,
} = require('../services/mailingLists.service');

exports.createMailingList = async (req, res) => {
  try {
    const { name, buyerIds = [], recipients = [] } = req.body;
    const result = await createMailingListService(name, buyerIds, recipients);
    res.json(result);
  } catch (err) {
    console.error('❌ Error creating mailing list:', err);
    res.status(500).json({ error: 'Failed to create mailing list' });
  }
};

exports.getMailingLists = async (_req, res) => {
  try {
    const result = await getMailingListsService();
    res.json(result);
  } catch (err) {
    console.error('❌ Error fetching mailing lists:', err);
    res.status(500).json({ error: 'Failed to fetch mailing lists' });
  }
};

/**
 * Get contacts for a specific mailing list from Resend
 */
exports.getMailingListContacts = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getMailingListContactsService(id);
    res.json(result);
  } catch (err) {
    console.error('❌ Error fetching mailing list contacts:', err);
    res.status(500).json({ error: 'Failed to fetch mailing list contacts' });
  }
};

exports.updateMailingList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, buyerIds = [], recipients = [] } = req.body;
    const updated = await updateMailingListService(id, name, buyerIds, recipients);
    res.json(updated);
  } catch (err) {
    console.error('❌ Error updating mailing list:', err);
    res.status(500).json({ error: 'Failed to update mailing list' });
  }
};

exports.deleteMailingList = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteMailingListService(id);
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error deleting mailing list:', err);
    res.status(500).json({ error: 'Failed to delete mailing list' });
  }
};