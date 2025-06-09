const pdfParse = require('pdf-parse');
const fs = require('fs');

exports.extractTextFromPDF = async (pdfPath) => {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};