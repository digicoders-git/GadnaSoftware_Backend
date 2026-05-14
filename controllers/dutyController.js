const Duty = require("../models/Duty");
const DutyHistory = require("../models/DutyHistory");
const User = require("../models/User");

// @route   POST /api/duties
const createDuty = async (req, res) => {
  try {
    const { title, description, location } = req.body;
    const duty = await Duty.create({ title, description, location, createdBy: req.admin._id });
    res.status(201).json(duty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/duties
const getDuties = async (req, res) => {
  try {
    const duties = await Duty.find()
      .populate({
        path: "assignments.user",
        select: "name phoneNumber pnoNumber designation",
        populate: { path: "designation", select: "name" },
      })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json(duties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/duties/:id
const getDutyById = async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id)
      .populate({
        path: "assignments.user",
        select: "name phoneNumber pnoNumber designation",
        populate: { path: "designation", select: "name" },
      })
      .populate("createdBy", "name email");
    if (!duty) return res.status(404).json({ message: "Duty not found" });
    res.json(duty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/duties/:id
const updateDuty = async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    if (req.body.title) duty.title = req.body.title;
    if (req.body.description !== undefined) duty.description = req.body.description;
    if (req.body.location !== undefined) duty.location = req.body.location;
    if (req.body.status) duty.status = req.body.status;

    const updated = await duty.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/duties/:id
const deleteDuty = async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });
    await Duty.deleteOne({ _id: req.params.id });
    res.json({ message: "Duty deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/duties/:id/assign
// Body: { userId, dutyType, startDate, endDate, remarks }
const assignDuty = async (req, res) => {
  try {
    const { userId, dutyType, startDate, endDate, remarks } = req.body;
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Block if user is on special duty elsewhere
    const specialDuty = await Duty.findOne({
      "assignments.user": userId,
      "assignments.dutyType": "special",
      status: "active",
      _id: { $ne: req.params.id },
    });
    if (specialDuty) {
      return res.status(400).json({
        message: `${user.name} पहले से "${specialDuty.title}" (विशेष ड्यूटी) पर तैनात हैं। पहले उनकी विशेष ड्यूटी पूर्ण करें।`,
      });
    }

    // Block if user already assigned to any other active duty
    const existingDuty = await Duty.findOne({
      "assignments.user": userId,
      status: "active",
      _id: { $ne: req.params.id },
    });
    if (existingDuty) {
      return res.status(400).json({
        message: `${user.name} पहले से "${existingDuty.title}" ड्यूटी पर तैनात हैं। पहले उनकी मौजूदा ड्यूटी पूर्ण करें।`,
      });
    }

    // Check if already assigned to THIS duty
    const alreadyInThisDuty = duty.assignments.find(
      (a) => a.user.toString() === userId
    );
    if (alreadyInThisDuty) {
      return res.status(400).json({ message: `${user.name} पहले से इस ड्यूटी पर असाइन हैं।` });
    }

    // Add to assignments array
    duty.assignments.push({ user: userId, dutyType, startDate, endDate, remarks });
    duty.status = "active";
    await duty.save();

    // History entry
    await DutyHistory.create({
      duty: duty._id,
      user: userId,
      action: "assigned",
      dutyType,
      location: duty.location,
      startDate: startDate || new Date(),
      endDate: null,
      remarks,
      performedBy: req.admin._id,
    });

    const updated = await Duty.findById(duty._id)
      .populate({
        path: "assignments.user",
        select: "name phoneNumber pnoNumber designation",
        populate: { path: "designation", select: "name" },
      })
      .populate("createdBy", "name email");

    res.json({ message: "Duty assigned successfully", duty: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/duties/:id/remove
// Body: { userId, remarks }
const removeDutyAssignment = async (req, res) => {
  try {
    const { userId, remarks } = req.body;
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    const assignmentIndex = duty.assignments.findIndex(
      (a) => a.user.toString() === userId
    );
    if (assignmentIndex === -1) {
      return res.status(400).json({ message: "User not assigned to this duty" });
    }

    const assignment = duty.assignments[assignmentIndex];

    // Close history entry
    const lastHistory = await DutyHistory.findOne({
      duty: duty._id,
      user: userId,
      endDate: null,
    }).sort({ createdAt: -1 });

    if (lastHistory) {
      lastHistory.endDate = new Date();
      lastHistory.action = "removed";
      lastHistory.remarks = remarks || lastHistory.remarks;
      await lastHistory.save();
    }

    await DutyHistory.create({
      duty: duty._id,
      user: userId,
      action: "removed",
      dutyType: assignment.dutyType,
      location: duty.location,
      startDate: lastHistory?.startDate || assignment.startDate,
      endDate: new Date(),
      remarks,
      performedBy: req.admin._id,
    });

    duty.assignments.splice(assignmentIndex, 1);
    if (duty.assignments.length === 0) duty.status = "pending";
    await duty.save();

    res.json({ message: "Duty assignment removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/duties/:id/complete
// Body: { remarks } — completes entire duty (all assignments)
const completeDuty = async (req, res) => {
  try {
    const { remarks } = req.body;
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    // Close all open history entries
    for (const assignment of duty.assignments) {
      const lastHistory = await DutyHistory.findOne({
        duty: duty._id,
        user: assignment.user,
        endDate: null,
      }).sort({ createdAt: -1 });

      if (lastHistory) {
        lastHistory.endDate = new Date();
        lastHistory.action = "completed";
        lastHistory.remarks = remarks || lastHistory.remarks;
        await lastHistory.save();
      }
    }

    duty.assignments = [];
    duty.status = "completed";
    await duty.save();

    res.json({ message: "Duty marked as completed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDuty,
  getDuties,
  getDutyById,
  updateDuty,
  deleteDuty,
  assignDuty,
  removeDutyAssignment,
  completeDuty,
};
