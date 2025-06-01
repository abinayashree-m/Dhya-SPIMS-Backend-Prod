const express = require('express');
const router = express.Router();
const parseController = require('../controllers/parse.controller');

router.post('/', parseController.parsePurchaseOrderText);

module.exports = router;