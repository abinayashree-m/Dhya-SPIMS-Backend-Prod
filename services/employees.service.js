// services/employees.service.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllEmployees = () => {
  return prisma.employee.findMany({ orderBy: { name: 'asc' } });
};

exports.getEmployeeById = (id) => {
  return prisma.employee.findUnique({ where: { id } });
};

exports.createEmployee = (data) => {
    return prisma.employee.create({
      data: {
        ...data,
        joinDate: data.joinDate ? new Date(data.joinDate) : null, // 👈 convert string to Date
      },
    });
  };
  
  exports.updateEmployee = (id, data) => {
    return prisma.employee.update({
      where: { id },
      data: {
        ...data,
        joinDate: data.joinDate ? new Date(data.joinDate) : null, // 👈 also fix here
      },
    });
  };

  exports.deleteEmployee = async (id) => {
    return await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: { employeeId: id },
      }),
      prisma.employee.delete({
        where: { id },
      }),
    ]);
  };