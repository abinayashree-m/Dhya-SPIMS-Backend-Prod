const { v4: uuidv4 } = require('uuid');

const idUtil = {
  // Generate a new UUID
  generateId() {
    return uuidv4();
  },

  // Validate if a string is a valid UUID
  isValidId(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
};

module.exports = idUtil;
