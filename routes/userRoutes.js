const express = require("express");
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUnassignedUsers,
  getUserStatusOverview,
  getUsersByDutyType,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/unassigned/list", protect, getUnassignedUsers);
router.get("/status/overview", protect, getUserStatusOverview);
router.get("/status/by-duty-type/:dutyType", protect, getUsersByDutyType);
router.route("/").get(protect, getUsers).post(protect, createUser);
router.route("/:id").get(protect, getUserById).put(protect, updateUser).delete(protect, deleteUser);

module.exports = router;
