// services/employees.service.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllEmployees = () => {
  return prisma.employees.findMany({ orderBy: { name: 'asc' } });
};

exports.getEmployeeById = (id) => {
  return prisma.employees.findUnique({ where: { id } });
};

exports.createEmployee = (data) => {
    return prisma.employees.create({
      data: {
        ...data,
        join_date: data.join_date ? new Date(data.join_date) : null, // 👈 convert string to Date
      },
    });
  };
  
  exports.updateEmployee = (id, data) => {
    return prisma.employees.update({
      where: { id },
      data: {
        ...data,
        join_date: data.join_date ? new Date(data.join_date) : null, // 👈 also fix here
      },
    });
  };

  exports.deleteEmployee = async (id) => {
    return await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: { employee_id: id },
      }),
      prisma.employees.delete({
        where: { id },
      }),
    ]);
  };