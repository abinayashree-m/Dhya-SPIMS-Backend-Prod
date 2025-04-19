const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllFiles = async (req, res) => {
  const files = await prisma.files.findMany({
    orderBy: { uploaded_at: 'desc' }
  });
  res.json(files);
};

const getFileById = async (req, res) => {
  const file = await prisma.files.findUnique({ where: { id: req.params.id } });
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json(file);
};

const uploadFileMetadata = async (req, res) => {
  const { tenant_id, file_url, file_type, linked_yarn_id, uploaded_by } = req.body;

  const newFile = await prisma.files.create({
    data: {
      tenant_id,
      file_url,
      file_type,
      linked_yarn_id,
      uploaded_by
    }
  });

  res.status(201).json(newFile);
};

const deleteFile = async (req, res) => {
  const file = await prisma.files.findUnique({ where: { id: req.params.id } });
  if (!file) return res.status(404).json({ error: 'File not found' });

  // (Optional) delete from Wasabi/S3 if needed

  await prisma.files.delete({ where: { id: req.params.id } });
  res.json({ message: 'File metadata deleted' });
};

module.exports = {
  getAllFiles,
  getFileById,
  uploadFileMetadata,
  deleteFile
};