const fibreService = require('../services/fibres.service');
const xlsx = require('xlsx');
const fs = require('fs');
const { validate: isUUID } = require('uuid');

/**
 * ✅ Create a new fibre (with optional category)
 */
exports.createFibre = async (req, res) => {
  try {
    const fibre = await fibreService.createFibre(req.body);
    res.status(201).json(fibre);
  } catch (error) {
    console.error('❌ Error creating fibre:', error.message);
    res.status(500).json({ error: 'Failed to create fibre' });
  }
};

/**
 * ✅ Get all fibres (including category)
 */
exports.getAllFibres = async (_req, res) => {
  try {
    const fibres = await fibreService.getAllFibres();
    res.json(fibres);
  } catch (error) {
    console.error('❌ Error fetching fibres:', error.message);
    res.status(500).json({ error: 'Failed to fetch fibres' });
  }
};

/**
 * ✅ Get fibre by ID (including category)
 */
exports.getFibreById = async (req, res) => {
  try {
    const fibre = await fibreService.getFibreById(req.params.id);
    if (!fibre) return res.status(404).json({ error: 'Fibre not found' });
    res.json(fibre);
  } catch (error) {
    console.error('❌ Error fetching fibre:', error.message);
    res.status(500).json({ error: 'Failed to fetch fibre' });
  }
};

/**
 * ✅ Update fibre (with optional category change)
 */
exports.updateFibre = async (req, res) => {
  try {
    const fibre = await fibreService.updateFibre(req.params.id, req.body);
    res.json(fibre);
  } catch (error) {
    console.error('❌ Error updating fibre:', error.message);
    res.status(500).json({ error: 'Failed to update fibre' });
  }
};

/**
 * ✅ Delete fibre
 */
exports.deleteFibre = async (req, res) => {
  try {
    await fibreService.deleteFibre(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error deleting fibre:', error.message);
    res.status(500).json({ error: 'Failed to delete fibre' });
  }
};

/**
 * ✅ Get all fibre categories
 */
exports.getAllFibreCategories = async (_req, res) => {
  try {
    const categories = await fibreService.getAllFibreCategories();
    res.json(categories);
  } catch (error) {
    console.error('❌ Error fetching fibre categories:', error.message);
    res.status(500).json({ error: 'Failed to fetch fibre categories' });
  }
};

/**
 * ✅ Create new fibre category
 */
exports.createFibreCategory = async (req, res) => {
  try {
    const category = await fibreService.createFibreCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ Error creating category:', error.message);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

/**
 * ✅ Update a fibre category
 */
exports.updateFibreCategory = async (req, res) => {
  try {
    const category = await fibreService.updateFibreCategory(req.params.id, req.body);
    res.json(category);
  } catch (error) {
    console.error('❌ Error updating category:', error.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

/**
 * ✅ Delete a fibre category
 */
exports.deleteFibreCategory = async (req, res) => {
  try {
    await fibreService.deleteFibreCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error deleting category:', error.message);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

/**
 * ✅ Get low stock fibres (< 200kg)
 */
exports.getLowStockFibres = async (req, res) => {
  try {
    const fibres = await fibreService.getLowStockFibres();
    res.json(fibres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ✅ Get fibre usage trend data grouped by day
 */
exports.getFiberUsageTrend = async (req, res) => {
  try {
    const { id } = req.params;
    const trend = await fibreService.getFiberUsageTrend(id);
    res.json(
      trend.map((entry) => ({
        date: entry.used_on,
        usedKg: parseFloat(entry._sum.used_kg),
      })).reverse()
    );
  } catch (error) {
    console.error('Error loading trend:', error);
    res.status(500).json({ error: 'Failed to load trend' });
  }
};

/**
 * ✅ Bulk upload fibres from Excel file
 */
exports.bulkUploadFibres = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const created = [];
  const errors = [];
  const createdCategories = [];

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log(`📊 Processing ${data.length} fibre records from Excel`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel rows start at 2 (1 is header)

      const {
        fibre_name,
        fibre_code,
        stock_kg,
        description,
        category_name
      } = row;

      // ✅ Validate required fields
      if (!fibre_name || typeof fibre_name !== 'string' || !fibre_name.trim()) {
        errors.push({ 
          row: rowIndex, 
          reason: 'Missing required field: fibre_name' 
        });
        continue;
      }

      // ✅ Validate stock_kg is a number (optional, default to 0)
      const stockValue = stock_kg !== undefined && stock_kg !== '' ? Number(stock_kg) : 0;
      if (isNaN(stockValue) || stockValue < 0) {
        errors.push({ 
          row: rowIndex, 
          reason: 'Invalid stock_kg (must be a positive number)' 
        });
        continue;
      }

      // ✅ Find or create category by name if provided
      let categoryId = null;
      if (category_name && typeof category_name === 'string' && category_name.trim()) {
        try {
          let category = await fibreService.getFibreCategoryByName(category_name.trim());
          
          if (!category) {
            // Create the category if it doesn't exist
            console.log(`📝 Creating new category: "${category_name}"`);
            category = await fibreService.createFibreCategory({
              name: category_name.trim(),
              description: `Auto-created category for bulk upload`
            });
            console.log(`✅ Created category: ${category.name} (ID: ${category.id})`);
            createdCategories.push(category.name);
          }
          
          categoryId = category.id;
        } catch (err) {
          errors.push({ 
            row: rowIndex, 
            reason: `Error with category "${category_name}": ${err.message}` 
          });
          continue;
        }
      }

      try {
        // Auto-generate fibre code if not provided
        const generatedFibreCode = (fibre_code && typeof fibre_code === 'string' && fibre_code.trim()) || `FC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const fibre = await fibreService.createFibre({
          fibreName: fibre_name.trim(),
          fibreCode: generatedFibreCode,
          stockKg: stockValue,
          description: (description && typeof description === 'string') ? description.trim() : null,
          categoryId: categoryId
        });

        created.push(fibre);
        console.log(`✅ Created fibre: ${fibre_code}`);
      } catch (err) {
        errors.push({ 
          row: rowIndex, 
          reason: `Failed to create fibre: ${err.message}` 
        });
        console.error(`❌ Error creating fibre at row ${rowIndex}:`, err.message);
      }
    }

    console.log(`📊 Bulk upload complete: ${created.length} fibres created, ${errors.length} errors, ${createdCategories.length} categories created`);

    res.status(201).json({
      message: 'Bulk upload complete',
      createdCount: created.length,
      errorCount: errors.length,
      categoriesCreated: createdCategories.length,
      createdCategories: createdCategories,
      errors,
      created: created.map(f => ({ id: f.id, fibreCode: f.fibreCode, fibreName: f.fibreName }))
    });

  } catch (error) {
    console.error('❌ Bulk upload error:', error);
    
    res.status(500).json({ 
      error: 'Failed to process Excel file',
      details: error.message 
    });
  }
};

/**
 * ✅ Preview fibre categories from Excel file (without saving to DB)
 */
exports.previewCategories = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📊 Processing category preview: ${req.file.originalname}`);

    // Read Excel file from buffer (memory storage)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const preview = [];

    console.log(`📊 Previewing ${data.length} category records from Excel`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel rows start at 2 (1 is header)

      const { name, description } = row;

      const categoryPreview = {
        name: name ? name.trim() : '',
        description: description ? description.trim() : '',
        isValid: true,
        error: null
      };

      // ✅ Validate required fields
      if (!name || !name.trim()) {
        categoryPreview.isValid = false;
        categoryPreview.error = 'Missing required field: name';
      }

      // ✅ Check for duplicate names (optional - could check against existing DB)
      // This would require additional DB query to check existing categories

      preview.push(categoryPreview);
    }

    console.log(`📊 Category preview complete: ${preview.filter(p => p.isValid).length} valid, ${preview.filter(p => !p.isValid).length} invalid`);

    res.status(200).json({
      message: 'Category preview complete',
      preview
    });

  } catch (error) {
    console.error('❌ Category preview error:', error);
    
    res.status(500).json({ 
      error: 'Failed to process Excel file',
      details: error.message 
    });
  }
};

/**
 * ✅ Preview fibres from Excel file (without saving to DB)
 */
exports.previewFibres = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📊 Processing fibre preview: ${req.file.originalname}`);

    // Read Excel file from buffer (memory storage)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const preview = [];

    console.log(`📊 Previewing ${data.length} fibre records from Excel`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel rows start at 2 (1 is header)

      const {
        fibre_name,
        fibre_code,
        stock_kg,
        description,
        category_name
      } = row;

      const fibrePreview = {
        fibreName: fibre_name && typeof fibre_name === 'string' ? fibre_name.trim() : '',
        fibreCode: fibre_code && typeof fibre_code === 'string' ? fibre_code.trim() : 'Auto-generated',
        stockKg: stock_kg !== undefined && stock_kg !== '' ? Number(stock_kg) : 0,
        description: description && typeof description === 'string' ? description.trim() : '',
        categoryName: category_name && typeof category_name === 'string' ? category_name.trim() : '',
        isValid: true,
        error: null
      };

      // ✅ Validate required fields
      if (!fibre_name || typeof fibre_name !== 'string' || !fibre_name.trim()) {
        fibrePreview.isValid = false;
        fibrePreview.error = 'Missing required field: fibre_name';
      }

      // ✅ Validate stock_kg is a number
      if (stock_kg !== undefined && stock_kg !== '' && (isNaN(Number(stock_kg)) || Number(stock_kg) < 0)) {
        fibrePreview.isValid = false;
        fibrePreview.error = 'Invalid stock_kg (must be a positive number)';
      }

      // ✅ Check if category exists (but don't create it in preview)
      if (category_name && typeof category_name === 'string' && category_name.trim()) {
        try {
          const category = await fibreService.getFibreCategoryByName(category_name.trim());
          if (!category) {
            // Keep isValid: true but show warning about category creation
            fibrePreview.error = `Category not found: "${category_name}" (will be created during upload)`;
          }
        } catch (err) {
          fibrePreview.isValid = false;
          fibrePreview.error = `Error checking category "${category_name}": ${err.message}`;
        }
      }

      preview.push(fibrePreview);
    }

    console.log(`📊 Fibre preview complete: ${preview.filter(p => p.isValid).length} valid, ${preview.filter(p => !p.isValid).length} invalid`);

    res.status(200).json({
      message: 'Fibre preview complete',
      preview
    });

  } catch (error) {
    console.error('❌ Fibre preview error:', error);
    
    res.status(500).json({ 
      error: 'Failed to process Excel file',
      details: error.message 
    });
  }
};

/**
 * ✅ Bulk upload fibre categories from Excel file
 */
exports.bulkUploadCategories = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📊 Processing category upload: ${req.file.originalname}`);

    // Read Excel file from buffer (memory storage)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const created = [];
    const errors = [];

    console.log(`📊 Processing ${data.length} category records from Excel`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel rows start at 2 (1 is header)

      const { name, description } = row;

      // ✅ Validate required fields
      if (!name) {
        errors.push({ 
          row: rowIndex, 
          reason: 'Missing required field: name' 
        });
        continue;
      }

      try {
        const category = await fibreService.createFibreCategory({
          name: name.trim(),
          description: description ? description.trim() : null
        });

        created.push(category);
        console.log(`✅ Created category: ${name}`);
      } catch (err) {
        errors.push({ 
          row: rowIndex, 
          reason: `Failed to create category: ${err.message}` 
        });
        console.error(`❌ Error creating category at row ${rowIndex}:`, err.message);
      }
    }

    console.log(`📊 Category bulk upload complete: ${created.length} created, ${errors.length} errors`);

    res.status(201).json({
      message: 'Category bulk upload complete',
      createdCount: created.length,
      errorCount: errors.length,
      errors,
      created: created.map(c => ({ id: c.id, name: c.name }))
    });

  } catch (error) {
    console.error('❌ Category bulk upload error:', error);
    
    res.status(500).json({ 
      error: 'Failed to process Excel file',
      details: error.message 
    });
  }
};