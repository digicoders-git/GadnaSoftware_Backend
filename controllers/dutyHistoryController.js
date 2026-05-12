const DutyHistory = require("../models/DutyHistory");

// @route   GET /api/duty-history/user/:userId
const getUserDutyHistory = async (req, res) => {
  try {
    const history = await DutyHistory.find({ user: req.params.userId })
      .populate("duty", "title dutyType location")
      .populate("user", "name phoneNumber pnoNumber")
      .populate("performedBy", "name email")
      .populate("previousUser", "name phoneNumber pnoNumber")
      .sort({ createdAt: -1 });

    // Calculate total stats
    const stats = {
      totalAssignments: history.filter((h) => h.action === "assigned" || h.action === "reassigned").length,
      totalCompleted: history.filter((h) => h.action === "completed").length,
      totalRemoved: history.filter((h) => h.action === "removed").length,
      totalHours: history.reduce((sum, h) => sum + (h.duration || 0), 0).toFixed(2),
      dutyTypeBreakdown: {},
    };

    history.forEach((h) => {
      if (h.dutyType) {
        stats.dutyTypeBreakdown[h.dutyType] = (stats.dutyTypeBreakdown[h.dutyType] || 0) + 1;
      }
    });

    res.json({ history, stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/duty-history/duty/:dutyId
const getDutyHistory = async (req, res) => {
  try {
    const history = await DutyHistory.find({ duty: req.params.dutyId })
      .populate("duty", "title dutyType location")
      .populate("user", "name phoneNumber pnoNumber")
      .populate("performedBy", "name email")
      .populate("previousUser", "name phoneNumber pnoNumber")
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/duty-history
const getAllHistory = async (req, res) => {
  try {
    const history = await DutyHistory.find()
      .populate("duty", "title dutyType location")
      .populate("user", "name phoneNumber pnoNumber")
      .populate("performedBy", "name email")
      .populate("previousUser", "name phoneNumber pnoNumber")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserDutyHistory, getDutyHistory, getAllHistory };
