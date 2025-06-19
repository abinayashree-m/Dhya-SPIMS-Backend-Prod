const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function seedFibres() {
  console.log('🌱 Starting fibre seeding...');
  
  try {
    const filePath = path.join(__dirname, 'fibres.xlsx');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ fibres.xlsx not found, skipping fibre seeding');
      return;
    }

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`📄 Loaded ${rows.length} rows from Excel`);

    if (rows.length === 0) {
      console.log('📄 No data found in Excel file');
      return;
    }

    let fibreCounter = 1;
    const existingFibres = await prisma.fibres.findMany();
    fibreCounter = existingFibres.length + 1;

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        // Safely extract and validate data
        const fibre_name = row.fibre_name?.toString()?.trim();
        let fibre_code = row.fibre_code ? String(row.fibre_code).trim() : '';
        const stock_kg = parseFloat(row.stock_kg) || 0;
        const closing_stock = parseFloat(row.closing_stock) || stock_kg || 0;
        const description = row.description ? String(row.description).trim() : '';
        
        // FIXED: Proper validation for category_id
        let category_id = null;
        if (row.category_id !== null && row.category_id !== undefined && row.category_id !== '') {
          const parsedCategoryId = parseInt(row.category_id);
          if (!isNaN(parsedCategoryId) && parsedCategoryId > 0) {
            category_id = parsedCategoryId;
          }
        }
        
        const category_name = row.category?.toString()?.trim() || null;

        if (!fibre_name) {
          console.warn('⚠️ Missing fibre name, skipping row');
          errorCount++;
          continue;
        }

        // Check for existing fibre
        const existingFibre = await prisma.fibres.findFirst({
          where: {
            fibre_name: {
              equals: fibre_name,
              mode: 'insensitive',
            },
          },
        });

        if (existingFibre) {
          console.log(`⚡ Skipped existing fibre: ${fibre_name}`);
          skipCount++;
          continue;
        }

        // Generate fibre code if not provided
        if (!fibre_code) {
          fibre_code = `FC-${fibreCounter.toString().padStart(4, '0')}`;
          fibreCounter++;
        }

        // Handle category assignment with proper validation
        let finalCategoryId = null;

        // FIXED: Only check category_id if it's a valid number
        if (category_id && category_id > 0) {
          try {
            const categoryExists = await prisma.fibre_categories.findUnique({
              where: { id: category_id }
            });
            if (categoryExists) {
              finalCategoryId = category_id;
              console.log(`✅ Using existing category ID: ${category_id}`);
            } else {
              console.warn(`⚠️ Invalid category_id: ${category_id} for fibre: ${fibre_name}`);
            }
          } catch (catError) {
            console.warn(`⚠️ Error checking category_id ${category_id}:`, catError.message);
          }
        }

        // If no valid category_id, try to find by category_name
        if (!finalCategoryId && category_name) {
          try {
            const category = await prisma.fibre_categories.findFirst({
              where: {
                name: {
                  equals: category_name,
                  mode: 'insensitive',
                },
              },
            });
            
            if (category) {
              finalCategoryId = category.id;
              console.log(`✅ Found category by name: ${category_name} -> ID: ${category.id}`);
            } else {
              console.log(`🆕 Creating new category: ${category_name}`);
              
              // Create the category automatically
              try {
                const newCategory = await prisma.fibre_categories.create({
                  data: {
                    name: category_name,
                    description: `Auto-created category for ${category_name}`
                  }
                });
                finalCategoryId = newCategory.id;
                console.log(`✅ Created new category: ${category_name} -> ID: ${newCategory.id}`);
              } catch (createError) {
                console.error(`❌ Failed to create category ${category_name}:`, createError.message);
              }
            }
          } catch (findError) {
            console.error(`❌ Error finding category ${category_name}:`, findError.message);
          }
        }

        // Create the fibre record with proper data validation
        await prisma.fibres.create({
          data: {
            fibre_name,
            fibre_code,
            stock_kg: Math.max(0, stock_kg),
            closing_stock: Math.max(0, closing_stock),
            inward_stock: 0,
            outward_stock: 0,
            consumed_stock: 0,
            description: description || '',
            category_id: finalCategoryId,
          },
        });

        console.log(`✅ Created fibre: ${fibre_name} (${fibre_code}) - Category ID: ${finalCategoryId || 'None'}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to process fibre:`, error.message);
        errorCount++;
        continue;
      }
    }

    console.log(`\n🌟 Fibre Seeding Summary:`);
    console.log(`   ✅ Created: ${successCount}`);
    console.log(`   ⚡ Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('🌟 Fibre Seeding Complete!\n');

  } catch (error) {
    console.error('❌ Critical error in seedFibres:', error.message);
    throw error;
  }
}

// ========== EMPLOYEE & ATTENDANCE SEEDING ==========
async function seedEmployeesAndAttendance() {
  console.log('👥 Starting employee & attendance seeding...');

  const employees = [
    {
      name: 'John Smith',
      token_no: 'EMP001',
      shift_rate: 25.5,
      aadhar_no: '1234-5678-9012',
      bank_acc_1: 'ACC001234567890',
      bank_acc_2: 'ACC001234567891',
      department: 'Manufacturing',
      join_date: new Date('2024-01-15'),
    },
    {
      name: 'Sarah Johnson',
      token_no: 'EMP002',
      shift_rate: 28.75,
      aadhar_no: '2345-6789-0123',
      bank_acc_1: 'ACC002234567890',
      bank_acc_2: null,
      department: 'Quality Control',
      join_date: new Date('2023-11-20'),
    },
    {
      name: 'Michael Brown',
      token_no: 'EMP003',
      shift_rate: 22.0,
      aadhar_no: '3456-7890-1234',
      bank_acc_1: 'ACC003234567890',
      bank_acc_2: 'ACC003234567891',
      department: 'Maintenance',
      join_date: new Date('2024-03-10'),
    },
    {
      name: 'Emily Davis',
      token_no: 'EMP004',
      shift_rate: 30.25,
      aadhar_no: '4567-8901-2345',
      bank_acc_1: 'ACC004234567890',
      bank_acc_2: null,
      department: 'Supervision',
      join_date: new Date('2023-08-05'),
    },
    {
      name: 'Robert Wilson',
      token_no: 'EMP005',
      shift_rate: 24.0,
      aadhar_no: '5678-9012-3456',
      bank_acc_1: 'ACC005234567890',
      bank_acc_2: 'ACC005234567891',
      department: 'Packaging',
      join_date: new Date('2024-02-28'),
    },
  ];

  const createdEmployees = [];
  for (const emp of employees) {
    try {
      const employee = await prisma.employees.upsert({
        where: { token_no: emp.token_no },
        update: {},
        create: emp,
      });
      createdEmployees.push(employee);
      console.log(`👷 Employee ready: ${employee.name} (${employee.token_no})`);
    } catch (error) {
      console.error(`❌ Failed to create employee ${emp.name}:`, error.message);
    }
  }

  if (createdEmployees.length === 0) {
    console.warn('⚠️ No employees created, skipping attendance seeding');
    return;
  }

  // Generate attendance records
  const attendanceRecords = [];
  const shifts = ['Morning', 'Evening', 'Night'];
  const statuses = [
    'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT',
    'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT',
    'HALF_DAY', 'LEAVE',
  ];

  const generateRandomDate = () => {
    const day = Math.floor(Math.random() * 31) + 1;
    return new Date(2025, 4, Math.min(day, 31)); // May 2025, ensure valid date
  };

  for (let i = 0; i < 55; i++) {
    const employee = createdEmployees[Math.floor(Math.random() * createdEmployees.length)];
    const date = generateRandomDate();
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    let regularHours = 8, overtimeHours = 0, totalHours = 0;

    switch (status) {
      case 'PRESENT':
        overtimeHours = Math.random() < 0.3 ? Math.round(Math.random() * 4 * 2) / 2 : 0;
        totalHours = regularHours + overtimeHours;
        break;
      case 'HALF_DAY':
        regularHours = 4;
        totalHours = 4;
        break;
      default:
        regularHours = 0;
        totalHours = 0;
    }

    attendanceRecords.push({
      date,
      shift,
      overtime_hours: overtimeHours,
      total_hours: totalHours,
      status,
      employee_id: employee.id,
    });
  }

  // Insert attendance records
  try {
    const result = await prisma.attendance.createMany({
      data: attendanceRecords,
      skipDuplicates: true,
    });
    console.log(`📅 Created ${result.count} attendance records`);
  } catch (error) {
    console.warn('⚠️ Bulk insert failed, falling back to individual inserts:', error.message);
    let createdCount = 0;
    for (const record of attendanceRecords) {
      try {
        await prisma.attendance.create({ data: record });
        createdCount++;
      } catch (err) {
        if (!err.message.includes('Unique constraint')) {
          console.error('⚠️ Failed attendance record:', err.message);
        }
      }
    }
    console.log(`📆 Individual insert completed: ${createdCount} records`);
  }

  // Summary
  const totalEmployees = await prisma.employees.count();
  const totalAttendance = await prisma.attendance.count();
  console.log(`\n📊 Employee Summary:\nEmployees: ${totalEmployees}, Attendance Records: ${totalAttendance}`);

  try {
    const attendanceByStatus = await prisma.attendance.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    console.log(`\n🧾 Attendance Status Breakdown:`);
    attendanceByStatus.forEach((group) =>
      console.log(`   ${group.status}: ${group._count.id}`)
    );
  } catch (error) {
    console.warn('⚠️ Could not generate attendance breakdown:', error.message);
  }
}

// ========== ENHANCED ATTENDANCE FUNCTIONS ==========

function generateShiftTimes(date, shift) {
  const baseDate = new Date(date);
  let startHour, endHour;

  switch (shift.toLowerCase()) {
    case 'morning':
      startHour = 6;
      endHour = 14;
      break;
    case 'evening':
      startHour = 14;
      endHour = 22;
      break;
    case 'night':
      startHour = 22;
      endHour = 6;
      break;
    default:
      startHour = 9;
      endHour = 17;
  }

  const inTime = new Date(baseDate);
  inTime.setHours(startHour, Math.floor(Math.random() * 30), 0, 0);

  const outTime = new Date(baseDate);
  if (shift.toLowerCase() === 'night' && endHour < startHour) {
    outTime.setDate(outTime.getDate() + 1);
  }
  outTime.setHours(endHour, Math.floor(Math.random() * 30), 0, 0);

  return { inTime, outTime };
}

function calculateHours(inTime, outTime, status) {
  if (status === 'ABSENT' || status === 'LEAVE') {
    return { overtimeHours: 0, totalHours: 0 };
  }

  if (status === 'HALF_DAY') {
    return { overtimeHours: 0, totalHours: 4 };
  }

  const timeDifference = outTime.getTime() - inTime.getTime();
  const actualHours = Math.round((timeDifference / (1000 * 60 * 60)) * 100) / 100;
  const regularShiftHours = 8;
  const overtimeHours = Math.max(0, actualHours - regularShiftHours);

  return { overtimeHours, totalHours: actualHours };
}

function generateRandomDateRange() {
  const startDate = new Date(2025, 3, 1); // April 1, 2025
  const endDate = new Date(2025, 4, 30);   // May 30, 2025 (avoid May 31 issues)
  
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  
  return new Date(startDate.getTime() + randomTime);
}

async function seedEnhancedAttendance() {
  console.log('📅 Starting enhanced attendance seeding with in_time/out_time...');

  try {
    const existingEmployees = await prisma.employees.findMany();
    
    if (existingEmployees.length === 0) {
      console.log('⚠️ No employees found. Please run employee seeding first.');
      return;
    }

    const shifts = ['Morning', 'Evening', 'Night'];
    const statuses = [
      'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT',
      'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT',
      'HALF_DAY', 'LEAVE',
    ];

    const enhancedAttendanceRecords = [];

    // Generate 50 enhanced attendance records
    for (let i = 0; i < 50; i++) {
      const employee = existingEmployees[Math.floor(Math.random() * existingEmployees.length)];
      const date = generateRandomDateRange();
      const shift = shifts[Math.floor(Math.random() * shifts.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const { inTime, outTime } = generateShiftTimes(date, shift);
      const { overtimeHours, totalHours } = calculateHours(inTime, outTime, status);

      // Handle absent/leave cases
      const finalInTime = (status === 'ABSENT' || status === 'LEAVE') 
        ? new Date(date.setHours(9, 0, 0, 0)) 
        : inTime;
      
      const finalOutTime = (status === 'ABSENT' || status === 'LEAVE') 
        ? new Date(date.setHours(9, 0, 0, 0)) 
        : outTime;

      enhancedAttendanceRecords.push({
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        shift,
        in_time: finalInTime,
        out_time: finalOutTime,
        overtime_hours: overtimeHours,
        total_hours: totalHours,
        status,
        employee_id: employee.id,
      });
    }

    // Insert enhanced attendance records
    try {
      const result = await prisma.attendance.createMany({
        data: enhancedAttendanceRecords,
        skipDuplicates: true,
      });
      console.log(`📅 Created ${result.count} enhanced attendance records`);
    } catch (error) {
      console.warn('⚠️ Bulk insert failed, using individual inserts:', error.message);
      
      let createdCount = 0;
      for (const record of enhancedAttendanceRecords) {
        try {
          await prisma.attendance.create({ data: record });
          createdCount++;
        } catch (err) {
          if (!err.message.includes('Unique constraint')) {
            console.error('⚠️ Failed enhanced record:', err.message);
          }
        }
      }
      console.log(`📆 Individual insert completed: ${createdCount} enhanced records`);
    }
  } catch (error) {
    console.error('❌ Error in seedEnhancedAttendance:', error.message);
  }
}

async function generateEnhancedReport() {
  console.log('\n📊 Generating Enhanced Summary Report...\n');

  try {
    // Total counts
    const totalEmployees = await prisma.employees.count();
    const totalAttendance = await prisma.attendance.count();
    
    console.log(`👥 Total Employees: ${totalEmployees}`);
    console.log(`📅 Total Attendance Records: ${totalAttendance}`);

    // Employee by department
    const employeesByDept = await prisma.employees.groupBy({
      by: ['department'],
      _count: { id: true },
    });

    console.log(`\n🏢 Employees by Department:`);
    employeesByDept.forEach((group) => {
      console.log(`   ${group.department || 'Unassigned'}: ${group._count.id} employees`);
    });

    // Attendance by status
    const attendanceByStatus = await prisma.attendance.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    console.log(`\n🧾 Attendance Status Breakdown:`);
    attendanceByStatus.forEach((group) => {
      console.log(`   ${group.status}: ${group._count.id} records`);
    });

    // Attendance by shift
    const attendanceByShift = await prisma.attendance.groupBy({
      by: ['shift'],
      _count: { id: true },
    });

    console.log(`\n⏰ Attendance by Shift:`);
    attendanceByShift.forEach((group) => {
      console.log(`   ${group.shift}: ${group._count.id} records`);
    });

    // Average overtime hours
    const avgOvertime = await prisma.attendance.aggregate({
      _avg: { overtime_hours: true, total_hours: true },
      where: { overtime_hours: { gt: 0 } }
    });

    console.log(`\n⏱️ Overtime Statistics:`);
    console.log(`   Average Overtime Hours: ${avgOvertime._avg.overtime_hours?.toFixed(2) || 0} hours`);
    console.log(`   Average Total Hours: ${avgOvertime._avg.total_hours?.toFixed(2) || 0} hours`);

    // Top 3 employees by attendance count
    const topEmployees = await prisma.attendance.groupBy({
      by: ['employee_id'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 3,
    });

    console.log(`\n🏆 Top 3 Employees by Attendance Records:`);
    for (const emp of topEmployees) {
      const employee = await prisma.employees.findUnique({
        where: { id: emp.employee_id },
      });
      console.log(`   ${employee?.name} (${employee?.token_no}): ${emp._count.id} records`);
    }

    // Recent attendance with in/out times
    const recentAttendance = await prisma.attendance.findMany({
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        employee: {
          select: { name: true, token_no: true }
        }
      }
    });

    console.log(`\n📈 Recent Attendance (Last 5 records with times):`);
    recentAttendance.forEach((record) => {
      const inTime = record.in_time ? record.in_time.toLocaleTimeString() : 'N/A';
      const outTime = record.out_time ? record.out_time.toLocaleTimeString() : 'N/A';
      console.log(`   ${record.date.toISOString().split('T')[0]} - ${record.employee.name} (${record.employee.token_no})`);
      console.log(`     Status: ${record.status} | Shift: ${record.shift} | In: ${inTime} | Out: ${outTime} | OT: ${record.overtime_hours}h`);
    });

  } catch (error) {
    console.error('❌ Error generating report:', error.message);
  }
}

// ========== MAIN FUNCTIONS ==========
async function main() {
  console.log('🌱 Starting Basic Database Seeding...\n');
  await seedFibres();
  await seedEmployeesAndAttendance();
  console.log('\n🌟 Basic Seeding Complete! ✨');
}

async function enhancedMain() {
  console.log('🌱 Starting Enhanced Database Seeding Process...\n');
  
  try {
    await seedFibres();
    await seedEmployeesAndAttendance();
    await seedEnhancedAttendance();
    await generateEnhancedReport();
    
    console.log('\n🌟 Enhanced Seeding Complete! ✨');
  } catch (error) {
    console.error('❌ Error in enhancedMain:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Export functions
module.exports = {
  main,
  enhancedMain,
  seedFibres,
  seedEmployeesAndAttendance,
  seedEnhancedAttendance,
  generateEnhancedReport
};

// Execute enhanced seeding
if (require.main === module) {
  enhancedMain()
    .catch((e) => {
      console.error('❌ Critical Error:', e.message);
      process.exit(1);
    })
    .finally(async () => {
      try {
        await prisma.$disconnect();
        console.log('📤 Database connection closed');
      } catch (disconnectError) {
        console.error('⚠️ Error disconnecting:', disconnectError.message);
      }
    });
}