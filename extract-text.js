const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function preprocessImage(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(1200) // Standardize width
    .grayscale()
    .normalize()
    .threshold(180)
    .toFile(outputPath);
}

async function extractFromImage(imagePath) {
  const preprocessedPath = imagePath.replace(/(\.\w+)$/, '_processed$1');

  await preprocessImage(imagePath, preprocessedPath);

  const result = await Tesseract.recognize(preprocessedPath, 'eng', {
    logger: m => console.log(`[OCR] ${m.status}: ${Math.floor((m.progress || 0) * 100)}%`)
  });

  return result.data.text.trim();
}

(async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('❌ Provide an image file path (JPEG, PNG).');
    process.exit(1);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    console.error('❌ Only image files (jpg, png) supported in this mode.');
    process.exit(1);
  }

  const text = await extractFromImage(filePath);

  console.log('\n📄 Extracted Text:\n');
  console.log(text || '[No text found]');
})();