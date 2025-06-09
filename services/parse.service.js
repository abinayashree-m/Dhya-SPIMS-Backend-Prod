const openai = require('../utils/openai');

/**
 * Parses raw purchase order text using your fine-tuned GPT model
 * @param {string} text - The raw text extracted from the purchase order PDF
 * @returns {Promise<object>} - Parsed structured JSON
 */
exports.parsePurchaseOrderText = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid or missing text for parsing');
  }

  const response = await openai.chat.completions.create({
    model: 'ft:gpt-4.1-mini-2025-04-14:dhya-innovations:spims-po:BeMSeEHm', // Use your fine-tuned model
    messages: [
      { role: 'system', content: 'You are a purchase order parser trained to convert scanned or OCR text into structured data.' },
      { role: 'user', content: text }
    ],
    temperature: 0.2
  });

  const content = response.choices?.[0]?.message?.content;

  try {
    const cleaned = content?.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('❌ JSON parse error:', content);
    throw new Error('Failed to parse OpenAI response to JSON');
  }
};