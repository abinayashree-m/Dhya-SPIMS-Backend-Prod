const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, 'fibres.xlsx'); // 📄 Your Excel file
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  let fibreCounter = 1;

  const existingFibres = await prisma.fibres.findMany();
  fibreCounter = existingFibres.length + 1;

  for (const row of rows) {
    const fibre_name = row.fibre_name?.trim();
    let fibre_code = row.fibre_code ? String(row.fibre_code).trim() : '';
    const stock_kg = parseFloat(row.stock_kg) || 0;
    const closing_stock = parseFloat(row.closing_stock) || stock_kg || 0;
    const description = row.description ? String(row.description).trim() : '';
    const category_id = row.category_id?.trim() || null;
    const category_name = row.category?.trim() || null;

    if (!fibre_name) {
      continue;
    }

    // Check if fibre already exists (case insensitive)
    const existingFibre = await prisma.fibres.findFirst({
      where: {
        fibre_name: {
          equals: fibre_name,
          mode: 'insensitive',
        },
      },
    });

    if (existingFibre) {
      continue;
    }

    // Auto-generate fibre_code if missing
    if (!fibre_code || fibre_code.length === 0) {
      fibre_code = `FC-${fibreCounter.toString().padStart(4, '0')}`;
      fibreCounter++;
    }

    let finalCategoryId = category_id;
    if (!finalCategoryId && category_name) {
      const category = await prisma.fibre_categories.findFirst({
        where: {
          name: {
            equals: category_name,
            mode: 'insensitive',
          },
        },
      });
      if (category) {
        finalCategoryId = category.id;
      }
    }

    await prisma.fibres.create({
      data: {
        fibre_name,
        fibre_code,
        stock_kg,
        closing_stock,
        inward_stock: 0,
        outward_stock: 0,
        consumed_stock: 0,
        description,
        category_id: finalCategoryId,
      },
    });
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });