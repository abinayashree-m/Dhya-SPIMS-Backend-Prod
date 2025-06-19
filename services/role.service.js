//pullable request
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getRolesByTenant = async (tenantId) => {
  return prisma.roles.findMany({
    where: { tenant_id: tenantId },
    include: {
      user_roles: true,
      role_permissions: true,
    },
    orderBy: { created_at: 'desc' },
  });
};

exports.createRole = async (roleData) => {
  return prisma.roles.create({
    data: {
      tenant_id: roleData.tenant_id,
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions,
    },
  });
};
exports.updateRole = async (id, data) => {
  return await prisma.roles.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      updated_at: new Date()
    }
  });
};

exports.deleteRole = async (id) => {
  return prisma.roles.delete({
    where: { id }
  });
};

exports.getPermissions = async () => {
  return {
    Orders: ["Add Order", "Update Order", "Delete Order", "View Order", "Export Order"],
    Shades: ["Add Shade", "Update Shade", "Delete Shade", "View Shade", "Export Shade"],
    Fibres: ["Add Fibre", "Update Fibre", "Delete Fibre", "View Fibre", "Export Fibre"],
    Production: ["Add Production", "Update Production", "Delete Production", "View Production", "Export Production"],
    Buyers: ["Add Buyer", "Update Buyer", "Delete Buyer", "View Buyer", "Export Buyer"],
    Employees: ["Add Employee", "Update Employee", "Delete Employee", "View Employee", "Export Employee"],
    Attendance: ["Add Attendance", "Update Attendance", "Delete Attendance", "View Attendance", "Export Attendance"],
    Suppliers: ["Add Supplier", "Update Supplier", "Delete Supplier", "View Supplier", "Export Supplier"],
    Settings: ["Add Settings", "Update Settings", "Delete Settings", "View Settings", "Export Settings"],
    Roles: ["Add Role", "Update Role", "Delete Role", "View Role", "Export Role"],
    Marketing: ["Add Marketing", "Update Marketing", "Delete Marketing", "View Marketing", "Export Marketing"],
    Users: ["Add User", "Update User", "Delete User", "View User", "Export User"],
    Stocks: ["Add Stock", "Update Stock", "Delete Stock", "View Stock", "Export Stock"],
  };
};
