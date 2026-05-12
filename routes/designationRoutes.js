const express = require("express");
const router = express.Router();
const {
  createDesignation,
  getDesignations,
  updateDesignation,
  deleteDesignation,
} = require("../controllers/designationController");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");

router.route("/").get(protect, getDesignations).post(protect, superAdminOnly, createDesignation);
router.route("/:id").put(protect, superAdminOnly, updateDesignation).delete(protect, superAdminOnly, deleteDesignation);

module.exports = router;
