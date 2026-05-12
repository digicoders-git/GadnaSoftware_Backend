const express = require("express");
const router = express.Router();
const {
  createDuty,
  getDuties,
  getDutyById,
  updateDuty,
  deleteDuty,
  assignDuty,
  removeDutyAssignment,
  completeDuty,
} = require("../controllers/dutyController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getDuties).post(protect, createDuty);
router.route("/:id").get(protect, getDutyById).put(protect, updateDuty).delete(protect, deleteDuty);
router.post("/:id/assign", protect, assignDuty);
router.post("/:id/remove", protect, removeDutyAssignment);
router.post("/:id/complete", protect, completeDuty);

module.exports = router;
