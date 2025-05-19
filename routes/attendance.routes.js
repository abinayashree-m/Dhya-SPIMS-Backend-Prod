const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');

router.post('/mark', attendanceController.markAttendance);
console.log('✅ Attendance routes loaded');
router.get('/by-date', attendanceController.getAttendanceByDate);
router.get('/range', attendanceController.getAttendanceRange);


module.exports = router;