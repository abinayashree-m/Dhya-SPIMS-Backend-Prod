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
    const { date } = req.query;
    console.log('[🛠️ LOG] GET /attendance/by-date', date); // Add this line
  
    if (!date) return res.status(400).json({ error: 'Date is required' });
  
    try {
      const data = await attendanceService.getAttendanceByDate(date);
      res.json(data);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  };

  
  exports.getAttendanceRange = async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Start and end dates are required' });
  
    try {
      const data = await attendanceService.getAttendanceRange(start, end);
      res.json(data);
    } catch (err) {
      console.error('Error fetching range:', err);
      res.status(500).json({ error: 'Failed to fetch attendance range' });
    }
  };