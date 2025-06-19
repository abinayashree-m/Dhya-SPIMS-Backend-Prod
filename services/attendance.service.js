//pullable request
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AttendanceService {
  
  // Utility method to calculate total working hours
  calculateWorkingHours(inTime, outTime, overtimeHours = 0) {
    const workingHours = (new Date(outTime) - new Date(inTime)) / (1000 * 60 * 60);
    return parseFloat((workingHours + overtimeHours).toFixed(2));
  }

  // Validate date format
  validateDate(date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    return parsedDate;
  }

  // Validate month and year
  validateMonthYear(month, year) {
    if (!month || !year) {
      throw new Error('Month and Year are required');
    }
    if (!/^(0[1-9]|1[0-2])$/.test(month)) {
      throw new Error('Month must be between 01-12');
    }
    if (!/^\d{4}$/.test(year)) {
      throw new Error('Year must be a 4-digit number');
    }
    return { month, year };
  }

  // Mark attendance with bulk operations
  async markAttendance({ date, records }) {
    try {
      // Validate input like old code
      if (!date || !records || !Array.isArray(records)) {
        throw new Error('Date and records array are required');
      }

      // Validate each record like old code
      for (const rec of records) {
        if (!rec.employee_id) {
          throw new Error('Employee ID is required for all records');
        }
        if (!rec.shift) {
          throw new Error(`Missing shift for employee ${rec.employee_id}`);
        }
        if (!rec.in_time || !rec.out_time) {
          throw new Error(`Missing time data for employee ${rec.employee_id}`);
        }
      }

      // Process each record exactly like old code
      const txns = records.map((record) => {
        const shift = record.shift;
        const overtime = record.overtime_hours || 0;
        const inTime = new Date(record.in_time);
        const outTime = new Date(record.out_time);

        // Calculate working hours like old code
        const workingHours = (outTime - inTime) / (1000 * 60 * 60);
        const total = parseFloat((workingHours + overtime).toFixed(2));

        return prisma.attendance.upsert({
          where: {
            date_employee_id: {
              date: new Date(date),
              employee_id: record.employee_id,
            },
          },
          update: {
            shift,
            in_time: inTime,
            out_time: outTime,
            overtime_hours: overtime,
            total_hours: total,
            status: record.status,
          },
          create: {
            date: new Date(date),
            employee_id: record.employee_id,
            shift,
            in_time: inTime,
            out_time: outTime,
            overtime_hours: overtime,
            total_hours: total,
            status: record.status,
          },
        });
      });

      return await prisma.$transaction(txns);
    } catch (error) {
      console.error('Attendance marking service error:', error);
      throw error;
    }
  }

  // Get attendance by date with filters
 async getAttendanceByDate({ date, employee_id, shift, status, page = 1, limit = 10 }) {
  if (!date) {
    throw new Error('Date is required');
  }

  try {
    // ✅ Parse to integer
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const targetDate = this.validateDate(date);
    const startOfDay = new Date(targetDate.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setUTCHours(23, 59, 59, 999));

    const whereClause = {
      date: { gte: startOfDay, lte: endOfDay },
    };

    if (employee_id) whereClause.employee_id = employee_id;
    if (shift) whereClause.shift = shift;
    if (status) whereClause.status = status;

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              name: true,
              department: true,
              token_no: true,
              shift_rate: true,
            },
          },
        },
        orderBy: { employee_id: 'asc' },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where: whereClause }),
    ]);
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit,totalPages };
  } catch (error) {
    console.error('Get attendance by date service error:', error);
    throw error;
  }
}

async getAttendanceRange({ start, end, page = 1, limit = 10 }) {
  if (!start || !end) {
    throw new Error('Start and end dates are required');
  }

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const startDate = this.validateDate(start);
  const endDate = this.validateDate(end);

  if (startDate > endDate) {
    throw new Error('Start date cannot be after end date');
  }

  // Get distinct employee IDs with attendance in range (for accurate pagination)
  const employeeIds = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      employee_id: true,
    },
    distinct: ['employee_id'],
  });

  const total = employeeIds.length;
  const totalPages = Math.ceil(total / limit);

  const paginatedIds = employeeIds
    .slice(skip, skip + limit)
    .map((item) => item.employee_id);

  // Get all attendance data for selected employees within the range
  const records = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      employee_id: {
        in: paginatedIds,
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: true,
          token_no: true,
          shift_rate: true,
        },
      },
    },
    orderBy: [
      { employee_id: 'asc' },
      { date: 'asc' },
    ],
  });

  // Grouping by employee
  const grouped = {};
  for (const rec of records) {
    const empId = rec.employee.id;

    if (!grouped[empId]) {
      grouped[empId] = {
        employee_id: empId,
        employee: {
          name: rec.employee.name,
          department: rec.employee.department,
          token_no: rec.employee.token_no,
          shift_rate: rec.employee.shift_rate,
        },
        attendance: {},
      };
    }

    const dateKey = rec.date.toISOString().split('T')[0];

    grouped[empId].attendance[dateKey] = {
      status: rec.status,
      in_time: rec.in_time.toTimeString().split(':').slice(0, 2).join(':'),   // "HH:MM"
      out_time: rec.out_time.toTimeString().split(':').slice(0, 2).join(':'),
      total_hours: rec.total_hours,
      overtime_hours: rec.overtime_hours,
      shift: rec.shift,
    };
  }

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    data: Object.values(grouped),
  };
}


  // Get all attendance with pagination
  async getAllAttendance({ page = '1', limit = '10' } = {}) {
    try {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 per page
      const skip = (pageNum - 1) * limitNum;

      const [total, data] = await Promise.all([
        prisma.attendance.count(),
        prisma.attendance.findMany({
          skip,
          take: limitNum,
          include: {
            employee: {
              select: { 
                name: true,
                department: true,
                token_no: true,
                shift_rate: true, // This comes from employees table
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        }),
      ]);
      const totalPages = Math.ceil(total / limitNum);

      // Format data for response
      const formattedData = data.map(record => ({
        employee_id: record.employee_id,
        name: record.employee?.name || '',
        department: record.employee?.department || '',
        token_no: record.employee?.token_no || '',
        shift_rate: record.employee?.shift_rate || 0,
        date: record.date,
        shift: record.shift,
        status: record.status,
        in_time: record.in_time,
        out_time: record.out_time,
        total_hours: record.total_hours,
        overtime_hours: record.overtime_hours,
      }));

      return {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        data: formattedData,
      };
    } catch (error) {
      console.error('Get all attendance service error:', error);
      throw error;
    }
  }

  // Create new attendance record
  async createAttendance(data) {
    try {
      const { employee_id, date, status } = data;
  
      if (!employee_id || !date || !status) {
        throw new Error('Missing required fields: employee_id, date, and status');
      }
  
      const validatedDate = this.validateDate(date);
  
      let attendanceData = {
        employee_id,
        date: validatedDate,
        status,
      };
  
      if (status === 'PRESENT' || status === 'HALF_DAY') {
        const { shift, in_time, out_time, overtime_hours = 0 } = data;
  
        if (!shift || !in_time || !out_time) {
          throw new Error('Missing required fields: shift, in_time, or out_time for PRESENT/HALF_DAY');
        }
  
        const inTime = new Date(in_time);
        const outTime = new Date(out_time);
  
        if (inTime >= outTime) {
          throw new Error('Out time must be after in time');
        }
  
        const totalHours = this.calculateWorkingHours(inTime, outTime, overtime_hours);
  
        attendanceData = {
          ...attendanceData,
          shift,
          in_time: inTime,
          out_time: outTime,
          overtime_hours,
          total_hours: totalHours,
        };
      } else if (status === 'ABSENT') {
        // Force default values for required fields even if empty/missing in input
        const defaultTime = new Date(`${validatedDate.toISOString().split('T')[0]}T00:00:00.000Z`);
  
        attendanceData = {
          ...attendanceData,
          shift: 'N/A',
          in_time: defaultTime,
          out_time: defaultTime,
          overtime_hours: 0,
          total_hours: 0,
        };
      }
  
      return await prisma.attendance.create({
        data: attendanceData,
        include: {
          employee: {
            select: {
              name: true,
              department: true,
              shift_rate: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Create attendance service error:', error);
      throw error;
    }
  }
  

  // Update attendance records
  async updateAttendance(employeeId, updateData) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      // If time fields are being updated, recalculate total hours
      if (updateData.in_time && updateData.out_time) {
        const inTime = new Date(updateData.in_time);
        const outTime = new Date(updateData.out_time);
        const overtimeHours = updateData.overtime_hours || 0;
        updateData.total_hours = this.calculateWorkingHours(inTime, outTime, overtimeHours);
      }

      return await prisma.attendance.updateMany({
        where: { employee_id: employeeId },
        data: updateData,
      });
    } catch (error) {
      console.error('Update attendance service error:', error);
      throw error;
    }
  }

  // Delete attendance records
  async deleteAttendance(employeeId) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      return await prisma.attendance.deleteMany({
        where: { employee_id: employeeId },
      });
    } catch (error) {
      console.error('Delete attendance service error:', error);
      throw error;
    }
  }

  // Get filtered attendance
  async getFilteredAttendance({ employee_id, department, shift }) {
    try {
      const whereClause = {};

      if (employee_id) whereClause.employee_id = employee_id;
      if (shift) whereClause.shift = shift;
      if (department) {
        whereClause.employee = {
          department: department,
        };
      }

      return await prisma.attendance.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              name: true,
              department: true,
              token_no: true,
              shift_rate: true, // This comes from employees table
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    } catch (error) {
      console.error('Get filtered attendance service error:', error);
      throw error;
    }
  }

  // Export monthly attendance
  async exportMonthlyAttendance({ month, year }) {
    try {
      const { month: validMonth, year: validYear } = this.validateMonthYear(month, year);

      const startDate = new Date(`${validYear}-${validMonth.padStart(2, '0')}-01T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const data = await prisma.attendance.findMany({
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          employee: {
            select: {
              name: true,
              department: true,
              token_no: true,
              shift_rate: true, // This comes from employees table
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      const filename = `attendance-${validYear}-${validMonth}.json`;

      return { data, filename };
    } catch (error) {
      console.error('Export monthly attendance service error:', error);
      throw error;
    }
  }

  // Update attendance with audit trail
  async updateAttendanceWithAudit(employeeId, auditData) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      // Process audit data
      const updateData = {
        ...auditData,
        updatedAt: new Date(),
      };

      // If time fields are being updated, recalculate total hours
      if (updateData.in_time && updateData.out_time) {
        const inTime = new Date(updateData.in_time);
        const outTime = new Date(updateData.out_time);
        const overtimeHours = updateData.overtime_hours || 0;
        updateData.total_hours = this.calculateWorkingHours(inTime, outTime, overtimeHours);
      }

      return await prisma.attendance.updateMany({
        where: { employee_id: employeeId },
        data: updateData,
      });
    } catch (error) {
      console.error('Update attendance with audit service error:', error);
      throw error;
    }
  }

  async getAttendanceRangeSummary({ date, startDate, endDate, month, year }) {
  try {
    let start, end;
    let summaryType = 'daily';

    if (startDate && endDate) {
      const s = this.validateDate(startDate);
      const e = this.validateDate(endDate);
      if (s > e) throw new Error('startDate cannot be after endDate');

      start = new Date(s.setHours(0, 0, 0, 0));
      end = new Date(e.setHours(23, 59, 59, 999));
      summaryType = 'custom_range';
    } else if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);

      start = new Date(Date.UTC(y, m, 1));
      end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      summaryType = 'monthly';
    } else if (date) {
      const d = this.validateDate(date);
      start = new Date(d.setHours(0, 0, 0, 0));
      end = new Date(d.setHours(23, 59, 59, 999));
      summaryType = 'daily';
    } else {
      throw new Error('Provide date or startDate & endDate or month & year');
    }

    const records = await prisma.attendance.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalEmployees = await prisma.employees.count();

    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const totalMarked = records.length;

    const totalOvertime = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
    const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);
    const avgHours = totalMarked > 0 ? parseFloat((totalHours / totalMarked).toFixed(2)) : 0;

    return {
      summary_type: summaryType,
      range: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      total_employees: totalEmployees,
      present,
      absent,
      total_overtime: parseFloat(totalOvertime.toFixed(2)),
      average_shift_hours: avgHours,
    };
  } catch (error) {
    console.error('Error in getAttendanceRangeSummary service:', error);
    throw new Error('Failed to get attendance summary');
  }
}
  // Get attendance summary based on type (daily, weekly, monthly)
  async getAttendanceSummary({ type = 'monthly', date, start, end, month, year }) {
    try {
      switch (type) {
        case 'daily':
          return await this.getDailyAttendanceSummary(date);
        case 'weekly':
          return await this.getWeeklyAttendanceSummary(start, end);
        case 'monthly':
          return await this.getMonthlyAttendanceSummary(month, year);
        default:
          throw new Error('Invalid summary type. Must be daily, weekly, or monthly');
      }
    } catch (error) {
      console.error('Get attendance summary service error:', error);
      throw error;
    }
  }

  // Get daily attendance summary
  async getDailyAttendanceSummary(date) {
    try {
      if (!date) {
        throw new Error('Date is required for daily summary');
      }

      const targetDate = this.validateDate(date);
      const startOfDay = new Date(targetDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setUTCHours(23, 59, 59, 999));

      const records = await prisma.attendance.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          employee: {
            select: {
              name: true,
              department: true,
              token_no: true,
              shift_rate: true, // This comes from employees table
            },
          },
        },
      });

      // Process summary data
      const summaryMap = new Map();

      records.forEach(record => {
        const employeeId = record.employee_id;
        
        if (!summaryMap.has(employeeId)) {
          summaryMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: record.employee?.name || '',
            department: record.employee?.department || '',
            token_no: record.employee?.token_no || '',
            shift_rate: record.employee?.shift_rate || 0,
            workingHours: 0,
            overtimeHours: 0,
            status: record.status,
            in_time: record.in_time,
            out_time: record.out_time,
          });
        }

        const summary = summaryMap.get(employeeId);
        summary.workingHours = record.total_hours || 0;
        summary.overtimeHours = record.overtime_hours || 0;
      });

      return {
        date: startOfDay.toISOString().split('T')[0],
        type: 'daily',
        attendanceSummary: Array.from(summaryMap.values()),
      };
    } catch (error) {
      console.error('Get daily attendance summary service error:', error);
      throw error;
    }
  }

  // Get weekly attendance summary
  async getWeeklyAttendanceSummary(start, end) {
    try {
      if (!start || !end) {
        throw new Error('Start and end dates are required for weekly summary');
      }

      const startDate = this.validateDate(start);
      const endDate = this.validateDate(end);

      if (startDate > endDate) {
        throw new Error('Start date cannot be after end date');
      }

      const records = await prisma.attendance.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          employee: {
            select: {
              name: true,
              department: true,
              token_no: true,
              shift_rate: true, // This comes from employees table
            },
          },
        },
      });

      // Process summary data
      const summaryMap = new Map();

      records.forEach(record => {
        const employeeId = record.employee_id;
        
        if (!summaryMap.has(employeeId)) {
          summaryMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: record.employee?.name || '',
            department: record.employee?.department || '',
            token_no: record.employee?.token_no || '',
            shift_rate: record.employee?.shift_rate || 0,
            workingDays: 0,
            overtimeHours: 0,
            totalHours: 0,
            absents: 0,
            halfDays: 0,
          });
        }

        const summary = summaryMap.get(employeeId);
        
        switch (record.status) {
          case 'PRESENT':
            summary.workingDays += 1;
            break;
          case 'HALF_DAY':
            summary.workingDays += 0.5;
            summary.halfDays += 1;
            break;
          case 'ABSENT':
            summary.absents += 1;
            break;
        }

        summary.overtimeHours += record.overtime_hours || 0;
        summary.totalHours += record.total_hours || 0;
      });

      return {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        type: 'weekly',
        attendanceSummary: Array.from(summaryMap.values()),
      };
    } catch (error) {
      console.error('Get weekly attendance summary service error:', error);
      throw error;
    }
  }

  // Get monthly attendance summary
  async getMonthlyAttendanceSummary(month, year) {
    try {
      const { month: validMonth, year: validYear } = this.validateMonthYear(month, year);

      const startDate = new Date(`${validYear}-${validMonth}-01T00:00:00.000Z`);
      const nextMonth = validMonth === '12' ? '01' : String(Number(validMonth) + 1).padStart(2, '0');
      const nextYear = validMonth === '12' ? String(Number(validYear) + 1) : validYear;
      const endDate = new Date(`${nextYear}-${nextMonth}-01T00:00:00.000Z`);

      const records = await prisma.attendance.findMany({
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          employee: {
            select: {
              name: true,
              department: true,
              token_no: true,
              shift_rate: true, // This comes from employees table
            },
          },
        },
      });

      // Process summary data
      const summaryMap = new Map();

      records.forEach(record => {
        const employeeId = record.employee_id;
        
        if (!summaryMap.has(employeeId)) {
          summaryMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: record.employee?.name || '',
            department: record.employee?.department || '',
            token_no: record.employee?.token_no || '',
            shift_rate: record.employee?.shift_rate || 0,
            workingDays: 0,
            overtimeHours: 0,
            absents: 0,
            halfDays: 0,
            totalHours: 0,
          });
        }

        const summary = summaryMap.get(employeeId);
        
        switch (record.status) {
          case 'PRESENT':
            summary.workingDays += 1;
            break;
          case 'HALF_DAY':
            summary.workingDays += 0.5;
            summary.halfDays += 1;
            break;
          case 'ABSENT':
            summary.absents += 1;
            break;
        }

        summary.overtimeHours += record.overtime_hours || 0;
        summary.totalHours += record.total_hours || 0;
      });

      return {
        month: validMonth,
        year: validYear,
        type: 'monthly',
        attendanceSummary: Array.from(summaryMap.values()),
      };
    } catch (error) {
      console.error('Get monthly attendance summary service error:', error);
      throw error;
    }
  }
}

// Export service instance
module.exports = new AttendanceService();