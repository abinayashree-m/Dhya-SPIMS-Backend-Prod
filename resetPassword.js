// scripts/resetPassword.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
(async () => {
  const prisma = new PrismaClient();
  const email = 'manager@nscspinning.com';
  const newPlainPwd = 'admin@123';              // 🔁 set to whatever you like
  const hash = await bcrypt.hash(newPlainPwd, 10);
  await prisma.users.update({
    where: { email },
    data: { password_hash: hash },
  });
  console.log(`🔑 Password reset for ${email}`);
  await prisma.$disconnect();
})();