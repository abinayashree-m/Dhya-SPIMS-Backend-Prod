const openai = require('../utils/openai');

/**
 * Parses raw purchase order text using OpenAI GPT model
 * @param {string} text - The raw text extracted from the purchase order PDF
 * @returns {Promise<object>} - Parsed structured JSON
 */
exports.parsePurchaseOrderText = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid or missing text for parsing');
  }

  const prompt = `
You are an expert in extracting structured data from raw purchase order text.

Your task is to convert the input text into a clean JSON object with the following fields:

- poNumber: string
- poDate: string (DD/MM/YYYY format)
- buyerName: string
- buyerContactName: string or "N/A"
- buyerContactPhone: string or "N/A"
- buyerEmail: string or "N/A"
- buyerAddress: string or "N/A"
- buyerGstNo: string or "N/A"
- buyerPanNo: string or "N/A"
- supplierName: string or "N/A"
- supplierGstNo: string or "N/A"
- paymentTerms: string or "N/A"
- styleRefNo: string or "N/A"
- deliveryAddress: string or "N/A"
- taxDetails: object with fields like cgst, sgst, igst (optional, or empty)
- grandTotal: number
- amountInWords: string
- notes: string (can be from remarks or terms section)
- items: array of objects like:
  {
    orderCode: string or "N/A",
    yarnDescription: string,
    color: string or "N/A",
    count: number or null,
    uom: string or "N/A",
    bagCount: number or null,
    quantity: number,
    rate: number,
    gstPercent: number or null,
    taxableAmount: number,
    shadeNo: string or "N/A"
  }

If a field is not found, return "N/A" or null appropriately.

Return ONLY the result as a valid JSON object inside \`\`\`json block.

Raw Text:
"""
${text}
"""
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
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