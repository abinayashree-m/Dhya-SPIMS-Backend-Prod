// Email validation utility with format checking and common typo correction

// A map of common typos and their corrections
const domainCorrections = {
  // Gmail typos
  'gmil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  
  // Hotmail typos
  'hotmal.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmeil.com': 'hotmail.com',
  
  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  
  // Outlook typos
  'outlok.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  
  // AOL typos
  'aol.co': 'aol.com',
  'aol.co.uk': 'aol.com',
};

/**
 * Pre-validate and correct a single email address
 */
const preValidateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { 
      isValid: false, 
      correctedEmail: null, 
      originalEmail: email,
      error: 'Email is empty or invalid type'
    };
  }

  // Trim whitespace and convert to lowercase
  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length === 0) {
    return { 
      isValid: false, 
      correctedEmail: null, 
      originalEmail: email,
      error: 'Email is empty after trimming'
    };
  }

  // 1. Basic Regex for format check (practical version)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { 
      isValid: false, 
      correctedEmail: null, 
      originalEmail: email,
      error: 'Invalid email format'
    };
  }

  // 2. Check for and correct common domain typos
  const [localPart, domainPart] = trimmedEmail.split('@');
  
  // Additional validation for local part and domain
  if (localPart.length === 0 || domainPart.length === 0) {
    return { 
      isValid: false, 
      correctedEmail: null, 
      originalEmail: email,
      error: 'Invalid email structure'
    };
  }

  if (domainPart.length < 3) {
    return { 
      isValid: false, 
      correctedEmail: null, 
      originalEmail: email,
      error: 'Domain too short'
    };
  }

  // Check for common typos
  if (domainCorrections[domainPart]) {
    const correctedEmail = `${localPart}@${domainCorrections[domainPart]}`;
    return { 
      isValid: true, 
      correctedEmail: correctedEmail, 
      originalEmail: email 
    };
  }

  // If no corrections needed, the email is valid in its original form
  return { 
    isValid: true, 
    correctedEmail: trimmedEmail, 
    originalEmail: email 
  };
};

/**
 * Validate a batch of email addresses
 */
const validateEmailBatch = (emails) => {
  const validEmails = [];
  const correctedEmails = [];
  const invalidEmails = [];

  for (const email of emails) {
    const result = preValidateEmail(email);

    if (result.isValid) {
      const finalEmail = result.correctedEmail;
      validEmails.push(finalEmail);

      // Track corrections
      if (result.originalEmail !== finalEmail) {
        correctedEmails.push({
          original: result.originalEmail,
          corrected: finalEmail,
        });
      }
    } else {
      invalidEmails.push({
        email: result.originalEmail,
        error: result.error || 'Unknown validation error'
      });
    }
  }

  return {
    validEmails,
    correctedEmails,
    invalidEmails,
    summary: {
      total: emails.length,
      valid: validEmails.length,
      corrected: correctedEmails.length,
      invalid: invalidEmails.length,
    }
  };
};

/**
 * Generate a user-friendly summary message
 */
const generateValidationSummary = (result) => {
  const { summary } = result;
  
  let message = `Upload complete! ${summary.valid} emails processed successfully.`;
  
  if (summary.corrected > 0) {
    message += ` ${summary.corrected} emails were automatically corrected.`;
  }
  
  if (summary.invalid > 0) {
    message += ` ${summary.invalid} emails were skipped due to invalid format.`;
  }
  
  return message;
};

/**
 * Get detailed feedback for display to user
 */
const getValidationFeedback = (result) => {
  const feedback = {
    summary: generateValidationSummary(result),
    corrections: result.correctedEmails,
    errors: result.invalidEmails,
    stats: result.summary
  };
  
  return feedback;
};

module.exports = {
  preValidateEmail,
  validateEmailBatch,
  generateValidationSummary,
  getValidationFeedback
}; 