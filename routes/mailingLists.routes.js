const express = require('express');
const {
  createMailingList,
  getMailingLists,
  deleteMailingList,
  updateMailingList,
  getMailingListContacts,
} = require('../controllers/mailingLists.controller');

const router = express.Router();

router.post('/', createMailingList);
router.get('/', getMailingLists);
router.get('/:id/contacts', getMailingListContacts);
router.put('/:id', updateMailingList);
router.delete('/:id', deleteMailingList);

module.exports = router;