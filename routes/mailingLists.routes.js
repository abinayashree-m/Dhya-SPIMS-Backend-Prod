const express = require('express');
const {
  createMailingList,
  getMailingLists,
  deleteMailingList,
  updateMailingList, // ✅ add this
} = require('../controllers/mailingLists.controller');

const router = express.Router();

router.post('/', createMailingList);
router.get('/', getMailingLists);
router.put('/:id', updateMailingList); // ✅ define update route
router.delete('/:id', deleteMailingList);

module.exports = router;