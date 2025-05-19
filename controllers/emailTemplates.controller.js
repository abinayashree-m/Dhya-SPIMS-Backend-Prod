const service = require('../services/emailTemplates.service');

exports.getAll = async (req, res) => {
  const templates = await service.getAllEmailTemplates();
  res.json(templates);
};

exports.getById = async (req, res) => {
  const template = await service.getEmailTemplateById(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found' });
  res.json(template);
};

exports.create = async (req, res) => {
  const newTemplate = await service.createEmailTemplate(req.body);
  res.status(201).json(newTemplate);
};

exports.update = async (req, res) => {
  const updated = await service.updateEmailTemplate(req.params.id, req.body);
  res.json(updated);
};

exports.remove = async (req, res) => {
  await service.deleteEmailTemplate(req.params.id);
  res.status(204).send();
};