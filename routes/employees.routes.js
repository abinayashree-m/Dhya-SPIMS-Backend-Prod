const express = require('express');
const router = express.Router();
const controller = require('../controllers/employees.controller');

router.get('/', controller.getAllEmployees);
router.post('/', controller.createEmployee);
router.put('/:id', controller.updateEmployee);
router.delete('/:id', controller.deleteEmployee);

module.exports = router;