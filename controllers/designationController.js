const Designation = require("../models/Designation");

// @route   POST /api/designations
const createDesignation = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Designation name required" });

    const exists = await Designation.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (exists) return res.status(400).json({ message: "Designation already exists" });

    const designation = await Designation.create({ name });
    res.status(201).json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/designations
const getDesignations = async (req, res) => {
  try {
    const { all } = req.query;
    const filter = all === "true" ? {} : { isActive: true };
    const designations = await Designation.find(filter).sort({ name: 1 });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/designations/:id
const updateDesignation = async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id);
    if (!designation) return res.status(404).json({ message: "Designation not found" });

    designation.name = req.body.name || designation.name;
    designation.isActive =
      req.body.isActive !== undefined ? req.body.isActive : designation.isActive;

    const updated = await designation.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/designations/:id
const deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id);
    if (!designation) return res.status(404).json({ message: "Designation not found" });

    await Designation.deleteOne({ _id: req.params.id });
    res.json({ message: "Designation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createDesignation, getDesignations, updateDesignation, deleteDesignation };
