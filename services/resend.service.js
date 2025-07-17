const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Resend Contact Management Service
 * Handles all contact operations with Resend API
 */

/**
 * Create a new audience in Resend
 */
exports.createAudience = async (name) => {
  try {
    console.log(`🎯 [RESEND] Creating audience: ${name}`);
    const response = await resend.audiences.create({
      name,
    });
    console.log(`✅ [RESEND] Audience created:`, JSON.stringify(response, null, 2));
    
    // Handle the nested response structure from Resend
    if (response.error) {
      throw new Error(`Resend API error: ${response.error.message || 'Unknown error'}`);
    }
    
    // Return the actual audience data from the nested structure
    return response.data || response;
  } catch (error) {
    console.error('❌ Error creating Resend audience:', error);
    throw error;
  }
};

/**
 * Add contacts to a Resend audience
 */
exports.addContactsToAudience = async (audienceId, contacts) => {
  try {
    console.log(`📡 [RESEND] Adding ${contacts.length} contacts to audience: ${audienceId}`);
    
    const results = [];
    const errors = [];

    // Process contacts in batches with sequential processing
    const batchSize = 50;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contacts.length / batchSize)} (${batch.length} contacts)`);
      
      // Process each contact in the batch sequentially
      for (const contact of batch) {
        try {
          const result = await resend.contacts.create({
            audienceId,
            email: contact.email,
            firstName: contact.name?.split(' ')[0] || '',
            lastName: contact.name?.split(' ').slice(1).join(' ') || '',
            unsubscribed: false,
            // Add custom fields if needed
            ...(contact.company && { company: contact.company }),
            ...(contact.source && { source: contact.source }),
          });
          results.push({ success: true, contact, result });
        } catch (error) {
          errors.push({ success: false, contact, error: error.message });
        }
        
        // Small delay between individual contacts to be extra safe
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < contacts.length) {
        console.log(`⏳ Waiting 1 second before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ [RESEND] Added ${results.length} contacts, ${errors.length} failed`);
    return { results, errors };
  } catch (error) {
    console.error('❌ Error adding contacts to audience:', error);
    throw error;
  }
};

/**
 * Get all contacts from a Resend audience
 */
exports.getAudienceContacts = async (audienceId, options = {}) => {
  try {
    console.log(`📡 [RESEND] Fetching contacts for audience: ${audienceId}`);
    const response = await resend.contacts.list({
      audienceId,
      ...options,
    });
    
    console.log(`📡 [RESEND] Raw response:`, JSON.stringify(response, null, 2));
    
    // Handle the nested response structure from Resend
    if (response.error) {
      throw new Error(`Resend API error: ${response.error.message || 'Unknown error'}`);
    }
    
    // Extract contacts from the nested structure: response.data.data
    let contacts = [];
    if (response.data && response.data.data) {
      contacts = response.data.data;
    } else if (response.data) {
      contacts = response.data;
    } else {
      contacts = response;
    }
    
    console.log(`📡 [RESEND] Extracted contacts:`, JSON.stringify(contacts, null, 2));
    
    // Ensure we return an array
    if (!Array.isArray(contacts)) {
      console.warn(`⚠️ [RESEND] Contacts is not an array:`, typeof contacts);
      return [];
    }
    
    console.log(`✅ [RESEND] Returning ${contacts.length} contacts`);
    return contacts;
  } catch (error) {
    console.error('❌ Error fetching audience contacts:', error);
    throw error;
  }
};

/**
 * Remove contacts from a Resend audience
 */
exports.removeContactsFromAudience = async (audienceId, contactIds) => {
  try {
    console.log(`📡 [RESEND] Removing ${contactIds.length} contacts from audience: ${audienceId}`);
    
    const results = [];
    const errors = [];

    // Process deletions in batches with sequential processing
    const batchSize = 50;
    for (let i = 0; i < contactIds.length; i += batchSize) {
      const batch = contactIds.slice(i, i + batchSize);
      console.log(`🗑️ Processing deletion batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contactIds.length / batchSize)} (${batch.length} contacts)`);
      
      // Process each contact deletion sequentially
      for (const contactId of batch) {
        try {
          await resend.contacts.remove({
            audienceId,
            id: contactId,
          });
          results.push({ success: true, contactId });
        } catch (error) {
          errors.push({ success: false, contactId, error: error.message });
        }
        
        // Small delay between individual deletions
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Add delay between batches
      if (i + batchSize < contactIds.length) {
        console.log(`⏳ Waiting 500ms before next deletion batch...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ [RESEND] Removed ${results.length} contacts, ${errors.length} failed`);
    return { results, errors };
  } catch (error) {
    console.error('❌ Error removing contacts from audience:', error);
    throw error;
  }
};

/**
 * Update a contact in a Resend audience
 */
exports.updateContact = async (audienceId, contactId, updates) => {
  try {
    const result = await resend.contacts.update({
      audienceId,
      id: contactId,
      ...updates,
    });
    return result;
  } catch (error) {
    console.error('❌ Error updating contact:', error);
    throw error;
  }
};

/**
 * Get audience details
 */
exports.getAudience = async (audienceId) => {
  try {
    const response = await resend.audiences.get({
      id: audienceId,
    });
    
    // Handle the nested response structure from Resend
    if (response.error) {
      throw new Error(`Resend API error: ${response.error.message || 'Unknown error'}`);
    }
    
    return response.data || response;
  } catch (error) {
    console.error('❌ Error fetching audience:', error);
    throw error;
  }
};

/**
 * Delete an audience from Resend
 */
exports.deleteAudience = async (audienceId) => {
  try {
    await resend.audiences.remove({
      id: audienceId,
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting audience:', error);
    throw error;
  }
};

/**
 * Get all audiences
 */
exports.listAudiences = async () => {
  try {
    const response = await resend.audiences.list();
    
    // Handle the nested response structure from Resend
    if (response.error) {
      throw new Error(`Resend API error: ${response.error.message || 'Unknown error'}`);
    }
    
    return response.data || response;
  } catch (error) {
    console.error('❌ Error listing audiences:', error);
    throw error;
  }
}; 