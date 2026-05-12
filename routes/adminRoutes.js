const express = require("express");
const router = express.Router();
const {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
} = require("../controllers/adminController");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");

router.post("/login", loginAdmin);

router.route("/")
  .get(protect, getAdmins)
  .post(protect, superAdminOnly, createAdmin);

router.route("/:id")
  .get(protect, getAdminById)
  .put(protect, superAdminOnly, updateAdmin)
  .delete(protect, superAdminOnly, deleteAdmin);

module.exports = router;
