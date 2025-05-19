const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateTotalHours(shift, overtimeHours) {
  return 8 + (overtimeHours || 0); // Each shift = 8 hours
}

exports.markAttendance = async ({ date, records }) => {
  try {
    // Validate records before processing
    for (const rec of records) {
      if (!rec.shift) {
        throw new Error(`Missing shift for employee ${rec.employee_id}`);
      }
    }

    const txns = records.map((record) => {
      const shift = record.shift;
      const overtime = record.overtime_hours || 0;
      const total = calculateTotalHours(shift, overtime);

      return prisma.attendance.upsert({
        where: {
          date_employee_id: {
            date: new Date(date),
            employee_id: record.employee_id,
          },
        },
        update: {
          shift,
          overtime_hours: overtime,
          total_hours: total,
          status: record.status,
        },
        create: {
          date: new Date(date),
          employee_id: record.employee_id,
          shift,
          overtime_hours: overtime,
          total_hours: total,
          status: record.status,
        },
      });
    });

    return await prisma.$transaction(txns);
  } catch (err) {
    console.error('Attendance marking error:', err);
    throw new Error('Failed to mark attendance');
  }
};

// services/attendance.service.js

exports.getAttendanceByDate = async (date) => {
    return await prisma.attendance.findMany({
      where: {
        date: new Date(date),
      },
      include: {
        employee: true,
      },
    });
  };


  
  exports.getAttendanceRange = async (startDate, endDate) => {
    return await prisma.attendance.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  };