const express = require("express");
const router = express.Router();
const {
  addHoliday,
  getTodayHolidays,
  getActiveHolidays,
  getUpcomingHolidays,
  getReturnedFromHoliday,
  getUserHolidays,
  getAllHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/holidayController");
const { protect } = require("../middleware/authMiddleware");
const { getOverdueHolidayAlerts } = require("../controllers/holidayController");

router.route("/").get(protect, getAllHolidays).post(protect, addHoliday);
router.get("/today", protect, getTodayHolidays);
router.get("/active", protect, getActiveHolidays);
router.get("/upcoming", protect, getUpcomingHolidays);
router.get("/returned", protect, getReturnedFromHoliday);
router.get("/overdue-alerts", protect, getOverdueHolidayAlerts);
router.get("/user/:userId", protect, getUserHolidays);
router.route("/:id").put(protect, updateHoliday).delete(protect, deleteHoliday);

module.exports = router;
