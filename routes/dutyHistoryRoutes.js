const express = require("express");
const router = express.Router();
const {
  getUserDutyHistory,
  getDutyHistory,
  getAllHistory,
} = require("../controllers/dutyHistoryController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getAllHistory);
router.get("/user/:userId", protect, getUserDutyHistory);
router.get("/duty/:dutyId", protect, getDutyHistory);

module.exports = router;
