const { prisma, connectWithRetry } = require('./prisma/client');
require('dotenv').config();

async function fixDatabase() {
  try {
    console.log('🔧 [DATABASE] Starting database fix...');
    
    // Test database connection with retry logic
    console.log('🔧 [DATABASE] Testing database connection...');
    await connectWithRetry();
    console.log('✅ [DATABASE] Database connection successful');
    
    // Drop the MailingListRecipient table
    console.log('🔧 [DATABASE] Dropping MailingListRecipient table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS "MailingListRecipient" CASCADE`;
    console.log('✅ [DATABASE] MailingListRecipient table dropped successfully');
    
    // Test that the mailing lists query works now
    console.log('🔧 [DATABASE] Testing mailing lists query...');
    const lists = await prisma.mailingList.findMany({
      include: {
        mailingListBuyers: {
          include: {
            buyer: true
          }
        }
      }
    });
    console.log(`✅ [DATABASE] Mailing lists query successful. Found ${lists.length} lists`);
    
    console.log('✅ [DATABASE] Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ [DATABASE] Error fixing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDatabase()
  .then(() => {
    console.log('🎉 Database fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database fix failed:', error);
    process.exit(1);
  }); 