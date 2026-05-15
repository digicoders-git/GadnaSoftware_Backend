const express = require("express");
const router = express.Router();
const {
  createAdmin, getAdmins, getAdminById, updateAdmin, deleteAdmin, loginAdmin,
  getMyProfile, updateMyProfile, changeMyPassword,
} = require("../controllers/adminController");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");

router.post("/login", loginAdmin);

// My profile routes (any logged-in admin)
router.get("/me/profile", protect, getMyProfile);
router.put("/me/profile", protect, updateMyProfile);
router.put("/me/change-password", protect, changeMyPassword);

router.route("/")
  .get(protect, getAdmins)
  .post(protect, createAdmin);

router.route("/:id")
  .get(protect, getAdminById)
  .put(protect, updateAdmin)
  .delete(protect, deleteAdmin);

module.exports = router;
