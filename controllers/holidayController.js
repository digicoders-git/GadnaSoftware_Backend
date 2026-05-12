const Holiday = require("../models/Holiday");
const User = require("../models/User");

// @route   POST /api/holidays
// Add user to holiday
const addHoliday = async (req, res) => {
  try {
    const { userId, startDate, endDate, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user already has an ongoing/upcoming holiday in this range
    const conflict = await Holiday.findOne({
      user: userId,
      status: { $in: ["ongoing", "upcoming"] },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
      ],
    });

    if (conflict) {
      return res.status(400).json({ message: "User already has a holiday in this date range" });
    }

    const holiday = await Holiday.create({
      user: userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || "Holiday",
      approvedBy: req.admin._id,
    });

    await holiday.populate("user", "name phoneNumber pnoNumber");
    await holiday.populate("approvedBy", "name email");

    res.status(201).json(holiday);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/holidays/today
// Get all users on holiday TODAY
const getTodayHolidays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const holidays = await Holiday.find({
      startDate: { $lte: todayEnd },
      endDate: { $gte: today },
    })
      .populate("user", "name phoneNumber pnoNumber")
      .populate("approvedBy", "name email")
      .sort({ startDate: 1 });

    res.json({
      date: today.toISOString().split("T")[0],
      totalOnHoliday: holidays.length,
      holidays,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/holidays/active
// Get all currently ongoing holidays
const getActiveHolidays = async (req, res) => {
  try {
    const now = new Date();

    const holidays = await Holiday.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate("user", "name phoneNumber pnoNumber")
      .populate("approvedBy", "name email")
      .sort({ endDate: 1 });

    // Auto update status to ongoing
    for (const h of holidays) {
      if (h.status !== "ongoing") {
        h.status = "ongoing";
        await h.save();
      }
    }

    res.json({
      totalActive: holidays.length,
      holidays,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/holidays/upcoming
// Get all upcoming holidays
const getUpcomingHolidays = async (req, res) => {
  try {
    const now = new Date();

    const holidays = await Holiday.find({
      startDate: { $gt: now },
    })
      .populate("user", "name phoneNumber pnoNumber")
      .populate("approvedBy", "name email")
      .sort({ startDate: 1 });

    res.json({ totalUpcoming: holidays.length, holidays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/holidays/returned
// Get users whose holiday ended - returned to duty
const getReturnedFromHoliday = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const holidays = await Holiday.find({
      endDate: { $gte: today, $lte: todayEnd },
    })
      .populate("user", "name phoneNumber pnoNumber")
      .populate("approvedBy", "name email")
      .sort({ endDate: 1 });

    // Mark as completed
    for (const h of holidays) {
      if (h.status !== "completed") {
        h.status = "completed";
        await h.save();
      }
    }

    res.json({
      date: today.toISOString().split("T")[0],
      totalReturned: holidays.length,
      message: "These users' holidays end today - they should return to duty",
      holidays,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/holidays/user/:userId
// Get holiday history of a specific user
const getUserHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find({ user: req.params.userId })
      .populate("user", "name phoneNumber pnoNumber")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    const now = new Date();
    const currentHoliday = holidays.find(
      (h) => new Date(h.startDate) <= now && new Date(h.endDate) >= now
    );

    res.json({
      isOnHoliday: !!currentHoliday,
      currentHoliday: currentHoliday || null,
      totalHolidays: holidays.length,
      holidays,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/holidays
// Get all holidays with optional date filter
const getAllHolidays = async (req, res) => {
  try {
    const { date, status } = req.query;
    let filter = {};

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      filter.startDate = { $lte: dEnd };
      filter.endDate = { $gte: d };
    }

    if (status) filter.status = status;

    const holidays = await Holiday.find(filter)
      .populate("user", "name phoneNumber pnoNumber")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ total: holidays.length, holidays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/holidays/:id
// Update holiday dates or reason
const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ message: "Holiday not found" });

    holiday.startDate = req.body.startDate ? new Date(req.body.startDate) : holiday.startDate;
    holiday.endDate = req.body.endDate ? new Date(req.body.endDate) : holiday.endDate;
    holiday.reason = req.body.reason || holiday.reason;

    const updated = await holiday.save();
    await updated.populate("user", "name phoneNumber pnoNumber");
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/holidays/:id
// Cancel/delete a holiday
const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ message: "Holiday not found" });

    await Holiday.deleteOne({ _id: req.params.id });
    res.json({ message: "Holiday cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/holidays/overdue-alerts
// Users jinka holiday khatam ho gaya but abhi tak koi active duty assign nahi hui
const getOverdueHolidayAlerts = async (req, res) => {
  try {
    const now = new Date();

    // Woh holidays jinka endDate nikal gaya aur status completed nahi hai
    const overdueHolidays = await Holiday.find({
      endDate: { $lt: now },
      status: { $in: ["ongoing", "upcoming"] },
    })
      .populate("user", "name phoneNumber pnoNumber")
      .populate("approvedBy", "name email")
      .sort({ endDate: 1 });

    // Mark them completed
    const overdueUserIds = [];
    for (const h of overdueHolidays) {
      h.status = "completed";
      await h.save();
      if (h.user) overdueUserIds.push(h.user._id.toString());
    }

    // In users mein se jinko abhi koi active duty assign nahi hai
    const Duty = require("../models/Duty");
    const alerts = [];

    for (const holiday of overdueHolidays) {
      if (!holiday.user) continue;

      const activeDuty = await Duty.findOne({
        assignedTo: holiday.user._id,
        status: "active",
      });

      const overdueByMs = now - new Date(holiday.endDate);
      const overdueByHours = Math.floor(overdueByMs / (1000 * 60 * 60));
      const overdueByDays = Math.floor(overdueByHours / 24);

      alerts.push({
        alertType: activeDuty ? "returned" : "not_returned",
        message: activeDuty
          ? `✅ ${holiday.user.name} holiday khatam hua aur duty pe wapas aa gaya hai`
          : `🚨 ALERT: ${holiday.user.name} ka holiday ${overdueByDays > 0 ? overdueByDays + " din" : overdueByHours + " ghante"} pehle khatam hua lekin abhi tak duty assign nahi hui`,
        overdueBy: {
          hours: overdueByHours,
          days: overdueByDays,
        },
        user: holiday.user,
        holiday: {
          _id: holiday._id,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          reason: holiday.reason,
        },
        currentDuty: activeDuty || null,
      });
    }

    const notReturned = alerts.filter((a) => a.alertType === "not_returned");
    const returned = alerts.filter((a) => a.alertType === "returned");

    res.json({
      totalAlerts: notReturned.length,
      totalReturned: returned.length,
      summary: notReturned.length > 0
        ? `${notReturned.length} user(s) ka holiday khatam ho gaya hai lekin duty assign nahi hui`
        : "Sab users duty pe wapas aa gaye hain",
      notReturnedAlerts: notReturned,
      returnedAlerts: returned,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addHoliday,
  getTodayHolidays,
  getActiveHolidays,
  getUpcomingHolidays,
  getReturnedFromHoliday,
  getUserHolidays,
  getAllHolidays,
  updateHoliday,
  deleteHoliday,
  getOverdueHolidayAlerts,
};
