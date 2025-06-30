const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migratePersonaSchema() {
  console.log('🔄 Starting CompanyPersona schema migration...');
  
  try {
    // First, let's check if the table exists and what the current structure is
    console.log('📋 Checking current table structure...');
    
    // Drop the existing table if it exists
    console.log('🗑️ Dropping existing CompanyPersona table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS "CompanyPersona" CASCADE`;
    
    // Push the new schema
    console.log('📝 Pushing new schema...');
    const { execSync } = require('child_process');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    // Generate the Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ CompanyPersona schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migratePersonaSchema()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePersonaSchema }; 