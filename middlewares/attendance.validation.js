const { AttendanceStatus } = require('@prisma/client');

// Basic validation for the POST /attendance route
module.exports = function validateAttendance(req, res, next) {
  const {
    employee_id,
    date,
    status,
    shift,
    in_time,
    out_time,
  } = req.body || {};

  // Required common fields
  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: 'employee_id, date and status are required' });
  }

  // Validate status enum (fallback when prisma enum unavailable)
  const allowedStatus = AttendanceStatus
    ? Object.keys(AttendanceStatus)
    : ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'];

  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowedStatus.join(', ')}` });
  }

  // For PRESENT or HALF_DAY ensure time + shift fields
  if (['PRESENT', 'HALF_DAY'].includes(status)) {
    if (!shift || !in_time || !out_time) {
      return res.status(400).json({ error: 'shift, in_time and out_time are required when status is PRESENT or HALF_DAY' });
    }
  }

  // For ABSENT ensure these are NOT provided
  if (status === 'ABSENT' && (shift || in_time || out_time)) {
    return res.status(400).json({ error: 'shift, in_time and out_time must be omitted when status is ABSENT' });
  }

  return next();
}; 