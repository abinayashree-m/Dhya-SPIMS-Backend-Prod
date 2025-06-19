//pullable request
const attendanceService = require('../services/attendance.service');

exports.markAttendance = async (req, res) => {
  try {
    const result = await attendanceService.markAttendance(req.body); // pass full payload
    res.json(result);
  } catch (error) {
    console.error('Attendance marking error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};


exports.getAttendanceByDate = async (req, res) => {
  try {
    const data = await attendanceService.getAttendanceByDate(req.query);
    res.json(data);
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch attendance' });
  }
};



exports.getAttendanceRange = async (req, res) => {
  try {
    const result = await attendanceService.getAttendanceRange(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error fetching attendance range:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch attendance range' });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const result = await attendanceService.getAllAttendance(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createAttendance = async (req, res) => {
  try {
    const attendance = await attendanceService.createAttendance(req.body);
    res.status(201).json(attendance);
  } catch (error) {
    console.error('Create Attendance Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create attendance' });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const employeeId = req.params.employee_id;
    const updated = await attendanceService.updateAttendance(employeeId, req.body);
    res.json({ message: 'Attendance updated', count: updated.count });
  } catch (error) {
    console.error('Update Attendance Error:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const employeeId = req.params.employee_id;
    const deleted = await attendanceService.deleteAttendance(employeeId);
    res.json({ message: 'Attendance deleted', count: deleted.count });
  } catch (error) {
    console.error('Delete Attendance Error:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const summary = await attendanceService.getAttendanceSummary(req.query);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch attendance summary' });
  }
};

exports.getFilteredAttendance = async (req, res) => {
  const { employee_id, department, shift } = req.query;

  try {
    const data = await attendanceService.getFilteredAttendance({ employee_id, department, shift });
    res.json(data);
  } catch (err) {
    console.error('Error fetching filtered attendance:', err); // ✅ Make sure this line exists
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};


exports.exportMonthlyAttendance = async (req, res) => {
  try {
    const { data, filename } = await attendanceService.exportMonthlyAttendance(req.query);
    
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(400).json({ error: error.message || 'Failed to export attendance' });
  }
};

exports.updateAttendanceWithAudit = async (req, res) => {
  try {
    const employeeId = req.params.employee_id;
    const auditData = {
      ...req.body,
      last_updated_by: req.user?.id || 'system',
      updatedAt: new Date(),
    };
    
    const updated = await attendanceService.updateAttendanceWithAudit(employeeId, auditData);
    res.json({ message: 'Attendance updated with audit fields', count: updated.count });
  } catch (error) {
    console.error('Update Attendance with Audit Error:', error);
    res.status(500).json({ error: 'Failed to update attendance with audit' });
  }
};

exports.getAttendanceRangeSummary = async (req, res) => {
  try {
    const { date, startDate, endDate, month, year } = req.query;

    const summary = await attendanceService.getAttendanceRangeSummary({
      date,
      startDate,
      endDate,
      month,
      year,
    });

    res.json(summary);
  } catch (error) {
    console.error('Error in getAttendanceRangeSummary controller:', error);
    res.status(500).json({ error: error.message || 'Failed to get attendance summary' });
  }
};
