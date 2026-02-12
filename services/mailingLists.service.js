const { PrismaClient } = require('@prisma/client');
const { 
  createAudience, 
  addContactsToAudience, 
  getAudienceContacts,
  removeContactsFromAudience,
  deleteAudience 
} = require('./resend.service');
const { validateEmailBatch, getValidationFeedback } = require('../utils/emailValidator');

const prisma = new PrismaClient();

// Utility function to add delay between API calls
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a new mailing list with Resend audience
 */
exports.createMailingListService = async (name, buyerIds = [], recipients = []) => {
  try {
    // 1. Create audience in Resend
    console.log(`🎯 Creating Resend audience: ${name}`);
    const audience = await createAudience(name);
    console.log(`✅ Resend audience created:`, JSON.stringify(audience, null, 2));
    
    if (!audience || !audience.id) {
      console.error('❌ Resend audience creation failed - no ID returned');
      throw new Error('Failed to create Resend audience - no ID returned');
    }

    // 2. Create mailing list in our database with Resend audience ID
    const mailingList = await prisma.mailingList.create({
      data: {
        name,
        resendAudienceId: audience.id,
        mailingListBuyers: {
          create: buyerIds.map((buyerId) => ({
            buyer: {
              connect: { id: buyerId }
            }
          }))
        }
      },
      include: {
        mailingListBuyers: {
          include: {
            buyer: true
          }
        }
      }
    });

    console.log(`✅ Mailing list created in database:`, mailingList.id);

    // 3. Add existing buyers to Resend audience (with validation)
    if (buyerIds.length > 0) {
      console.log(`📧 Adding ${buyerIds.length} existing buyers to Resend audience`);
      const buyers = await prisma.buyer.findMany({
        where: { id: { in: buyerIds } }
      });
      
      const buyerEmails = buyers.map(buyer => buyer.email);
      const buyerValidation = validateEmailBatch(buyerEmails);
      
      console.log(`📊 Buyer email validation:`, getValidationFeedback(buyerValidation));
      
      const validBuyerContacts = buyers.map(buyer => {
        // Find if this email was corrected
        const correction = buyerValidation.correctedEmails.find(c => c.original === buyer.email);
        const finalEmail = correction ? correction.corrected : buyer.email;
        
        return {
          email: finalEmail,
          name: buyer.name,
          company: buyer.company || '',
          source: 'buyer'
        };
      }).filter(contact => buyerValidation.validEmails.includes(contact.email));

      if (validBuyerContacts.length > 0) {
        const { results, errors } = await addContactsToAudience(audience.id, validBuyerContacts);
        console.log(`✅ Added ${results.length} buyers to Resend audience, ${errors.length} failed`);
      }
    }

    // 4. Add potential buyers to Resend audience (with validation)
    if (recipients.length > 0) {
      console.log(`📧 Adding ${recipients.length} potential buyers to Resend audience`);
      
      const recipientEmails = recipients.map(r => r.email);
      const recipientValidation = validateEmailBatch(recipientEmails);
      
      console.log(`📊 Recipient email validation:`, getValidationFeedback(recipientValidation));
      
      const validRecipients = recipients.map(recipient => {
        // Find if this email was corrected
        const correction = recipientValidation.correctedEmails.find(c => c.original === recipient.email);
        const finalEmail = correction ? correction.corrected : recipient.email;
        
        return {
          email: finalEmail,
          name: recipient.name,
          company: recipient.company || '',
          source: recipient.source || 'potential'
        };
      }).filter(recipient => recipientValidation.validEmails.includes(recipient.email));

      if (validRecipients.length > 0) {
        const { results, errors } = await addContactsToAudience(audience.id, validRecipients);
        console.log(`✅ Added ${results.length} potential buyers to Resend audience, ${errors.length} failed`);
      }
    }

    return mailingList;
  } catch (error) {
    console.error('❌ Error creating mailing list:', error);
    throw error;
  }
};

/**
 * Get all mailing lists with contact counts from Resend
 */
exports.getMailingListsService = async () => {
  try {
    const lists = await prisma.mailingList.findMany({
      orderBy: {
        createdAt: 'desc' // Show most recently created first
      },
      include: {
        mailingListBuyers: {
          include: {
            buyer: true
          }
        }
      }
    });

    console.log(`📋 Found ${lists.length} mailing lists in database`);

    // Process lists sequentially instead of using Promise.all to avoid rate limits
    const listsWithContactCounts = [];

    for (const list of lists) {
      console.log(`🔍 Processing list: ${list.name} (ID: ${list.id})`);
      console.log(`🔍 Resend audience ID: ${list.resendAudienceId}`);
      console.log(`🔍 Database buyers count: ${list.mailingListBuyers.length}`);

      let contactCount = 0;
      let resendAudience = null;
      let error = null;

      if (list.resendAudienceId) {
        try {
          console.log(`📡 Fetching contacts from Resend audience: ${list.resendAudienceId}`);
          const contacts = await getAudienceContacts(list.resendAudienceId);
          
          // Ensure contacts is an array
          if (Array.isArray(contacts)) {
            contactCount = contacts.length;
            console.log(`✅ Found ${contactCount} contacts in Resend audience`);
          } else {
            console.warn(`⚠️ Contacts is not an array:`, typeof contacts);
            contactCount = 0;
          }
          
          resendAudience = { id: list.resendAudienceId, contactCount };
        } catch (apiError) {
          console.error(`❌ Error fetching contacts for audience ${list.resendAudienceId}:`, apiError);
          error = apiError.message;
          resendAudience = { id: list.resendAudienceId, contactCount: 0, error: true };
        }
      } else {
        console.log(`⚠️ No Resend audience ID for list: ${list.name} - this might be an old list`);
        
        // For lists without Resend audience ID, try to create one if they have recipients
        if (list.mailingListBuyers.length > 0) {
          console.log(`🔄 Attempting to migrate old list to Resend: ${list.name}`);
          try {
            // Create Resend audience for existing list
            const audience = await createAudience(list.name);
            if (audience && audience.id) {
              console.log(`✅ Created Resend audience for old list: ${audience.id}`);
              
              // Get buyer emails and add to Resend
              const buyers = list.mailingListBuyers.map(mlb => mlb.buyer);
              const buyerContacts = buyers.map(buyer => ({
                email: buyer.email,
                name: buyer.name,
                company: buyer.company || '',
                source: 'buyer'
              }));

              const { results, errors } = await addContactsToAudience(audience.id, buyerContacts);
              console.log(`✅ Migrated ${results.length} buyers to Resend audience, ${errors.length} failed`);

              // Update the mailing list with the new Resend audience ID
              await prisma.mailingList.update({
                where: { id: list.id },
                data: { resendAudienceId: audience.id }
              });

              contactCount = results.length;
              resendAudience = { id: audience.id, contactCount };
              console.log(`✅ Successfully migrated list: ${list.name}`);
            }
          } catch (migrationError) {
            console.error(`❌ Failed to migrate old list: ${migrationError.message}`);
            error = migrationError.message;
          }
        }
      }

      const totalCount = contactCount + list.mailingListBuyers.length;
      console.log(`📊 Total contact count for ${list.name}: ${totalCount} (Resend: ${contactCount}, DB: ${list.mailingListBuyers.length})`);

      listsWithContactCounts.push({
        ...list,
        resendAudience,
        totalContactCount: totalCount,
        error: error // Pass any error to the frontend
      });

      // Crucial: Wait for 550ms before the next iteration.
      // This ensures you make less than 2 requests per second to stay within Resend's rate limit.
      if (lists.length > 1) {
        console.log(`⏳ Waiting 550ms before processing next list...`);
        await delay(550);
      }
    }

    return listsWithContactCounts;
  } catch (error) {
    console.error('❌ Error fetching mailing lists:', error);
    throw error;
  }
};

/**
 * Get contacts for a specific mailing list from Resend
 */
exports.getMailingListContactsService = async (mailingListId) => {
  try {
    const mailingList = await prisma.mailingList.findUnique({
      where: { id: mailingListId },
      include: {
        mailingListBuyers: {
          include: {
            buyer: true
          }
        }
      }
    });

    if (!mailingList) {
      throw new Error('Mailing list not found');
    }

    let resendContacts = [];
    if (mailingList.resendAudienceId) {
      try {
        console.log(`📡 Fetching contacts from Resend audience: ${mailingList.resendAudienceId}`);
        const contacts = await getAudienceContacts(mailingList.resendAudienceId);
        
        // Ensure contacts is an array
        if (Array.isArray(contacts)) {
          resendContacts = contacts;
          console.log(`✅ Found ${resendContacts.length} contacts in Resend`);
        } else {
          console.warn(`⚠️ Contacts is not an array:`, typeof contacts);
          resendContacts = [];
        }
      } catch (error) {
        console.error(`❌ Error fetching Resend contacts:`, error);
        resendContacts = [];
      }
    }

    // Combine Resend contacts with our buyer data
    const allContacts = [
      // Add Resend contacts
      ...resendContacts.map(contact => ({
        id: contact.id,
        email: contact.email,
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        company: contact.company || '',
        source: contact.source || 'resend',
        createdAt: contact.createdAt,
        isFromResend: true
      })),
      // Add our buyer contacts
      ...mailingList.mailingListBuyers.map(mlb => ({
        id: mlb.buyer.id,
        email: mlb.buyer.email,
        name: mlb.buyer.name,
        company: mlb.buyer.company || '',
        source: 'buyer',
        createdAt: mlb.buyer.createdAt,
        isFromResend: false
      }))
    ];

    console.log(`📊 Total contacts for mailing list: ${allContacts.length} (Resend: ${resendContacts.length}, DB: ${mailingList.mailingListBuyers.length})`);

    return {
      mailingList,
      contacts: allContacts,
      totalCount: allContacts.length
    };
  } catch (error) {
    console.error('❌ Error fetching mailing list contacts:', error);
    throw error;
  }
};

/**
 * Update mailing list (name and members)
 */
exports.updateMailingListService = async (id, name, buyerIds = [], recipients = []) => {
  try {
    const existingList = await prisma.mailingList.findUnique({
      where: { id },
      include: {
        mailingListBuyers: true
      }
    });

    if (!existingList) {
      throw new Error('Mailing list not found');
    }

    // 1. Update the mailing list name in our database
    const updatedList = await prisma.mailingList.update({
      where: { id },
      data: {
        name,
        mailingListBuyers: {
          deleteMany: {},
          create: buyerIds.map((buyerId) => ({
            buyer: { connect: { id: buyerId } }
          }))
        }
      },
      include: {
        mailingListBuyers: {
          include: {
            buyer: true
          }
        }
      }
    });

    // 2. Update Resend audience if it exists
    if (existingList.resendAudienceId) {
      console.log(`🔄 Updating Resend audience: ${existingList.resendAudienceId}`);
      
      // Get current contacts from Resend
      const currentContacts = await getAudienceContacts(existingList.resendAudienceId);
      
      // Remove all current contacts
      if (currentContacts.length > 0) {
        const contactIds = currentContacts.map(c => c.id);
        await removeContactsFromAudience(existingList.resendAudienceId, contactIds);
        console.log(`🗑️ Removed ${contactIds.length} existing contacts from Resend audience`);
      }

      // Add new contacts
      const newContacts = [];

      // Add existing buyers
      if (buyerIds.length > 0) {
        const buyers = await prisma.buyer.findMany({
          where: { id: { in: buyerIds } }
        });
        
        newContacts.push(...buyers.map(buyer => ({
          email: buyer.email,
          name: buyer.name,
          company: buyer.company || '',
          source: 'buyer'
        })));
      }

      // Add potential buyers
      newContacts.push(...recipients);

      if (newContacts.length > 0) {
        const { results, errors } = await addContactsToAudience(existingList.resendAudienceId, newContacts);
        console.log(`✅ Added ${results.length} contacts to Resend audience, ${errors.length} failed`);
      }
    }

    return updatedList;
  } catch (error) {
    console.error('❌ Error updating mailing list:', error);
    throw error;
  }
};

/**
 * Delete mailing list and its Resend audience
 */
exports.deleteMailingListService = async (id) => {
  try {
    const mailingList = await prisma.mailingList.findUnique({
      where: { id }
    });

    if (!mailingList) {
      throw new Error('Mailing list not found');
    }

    // 1. Delete Resend audience if it exists
    if (mailingList.resendAudienceId) {
      try {
        await deleteAudience(mailingList.resendAudienceId);
        console.log(`🗑️ Deleted Resend audience: ${mailingList.resendAudienceId}`);
      } catch (error) {
        console.error(`❌ Error deleting Resend audience:`, error);
        // Continue with database deletion even if Resend deletion fails
      }
    }

    // 2. Delete from our database (cascade will handle related records)
    await prisma.mailingList.delete({
      where: { id }
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting mailing list:', error);
    throw error;
  }
};