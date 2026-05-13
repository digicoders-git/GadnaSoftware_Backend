const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Create new admin
// @route   POST /api/admin
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const admin = await Admin.create({ name, email, password, role });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all admins
// @route   GET /api/admin
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single admin by ID
// @route   GET /api/admin/:id
const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update admin
// @route   PUT /api/admin/:id
const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.name = req.body.name || admin.name;
    admin.email = req.body.email || admin.email;
    admin.role = req.body.role || admin.role;
    admin.isActive = req.body.isActive !== undefined ? req.body.isActive : admin.isActive;

    if (req.body.password) {
      admin.password = req.body.password;
    }

    const updatedAdmin = await admin.save();

    res.json({
      _id: updatedAdmin._id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      role: updatedAdmin.role,
      isActive: updatedAdmin.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admin/:id
const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    await Admin.deleteOne({ _id: req.params.id });
    res.json({ message: "Admin removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin login
// @route   POST /api/admin/login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: "Invalid credentials or account inactive" });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my profile (logged in admin)
// @route   GET /api/admin/me/profile
const getMyProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-password");
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update my profile (name, email)
// @route   PUT /api/admin/me/profile
const updateMyProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const { name, email } = req.body;
    if (email && email !== admin.email) {
      const exists = await Admin.findOne({ email });
      if (exists) return res.status(400).json({ message: "यह ईमेल पहले से उपयोग में है" });
    }

    admin.name = name || admin.name;
    admin.email = email || admin.email;
    const updated = await admin.save();

    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change my password
// @route   PUT /api/admin/me/change-password
const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "सभी फ़ील्ड आवश्यक हैं" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "नया पासवर्ड कम से कम 6 अक्षर का होना चाहिए" });

    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: "वर्तमान पासवर्ड गलत है" });

    admin.password = newPassword;
    await admin.save();
    res.json({ message: "पासवर्ड सफलतापूर्वक बदल दिया गया" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAdmin, getAdmins, getAdminById, updateAdmin, deleteAdmin, loginAdmin,
  getMyProfile, updateMyProfile, changeMyPassword,
};
