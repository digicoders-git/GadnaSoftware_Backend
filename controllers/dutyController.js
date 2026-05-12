const Duty = require("../models/Duty");
const DutyHistory = require("../models/DutyHistory");
const User = require("../models/User");

// @route   POST /api/duties
const createDuty = async (req, res) => {
  try {
    const { title, description, location, dutyType, startDate, endDate } = req.body;

    const duty = await Duty.create({
      title,
      description,
      location,
      dutyType,
      startDate,
      endDate,
      createdBy: req.admin._id,
    });

    res.status(201).json(duty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/duties
const getDuties = async (req, res) => {
  try {
    const duties = await Duty.find()
      .populate("assignedTo", "name phoneNumber pnoNumber")
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
      .populate("assignedTo", "name phoneNumber pnoNumber")
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

    duty.title = req.body.title || duty.title;
    duty.description = req.body.description || duty.description;
    duty.location = req.body.location || duty.location;
    duty.dutyType = req.body.dutyType || duty.dutyType;
    duty.startDate = req.body.startDate || duty.startDate;
    duty.endDate = req.body.endDate || duty.endDate;
    duty.status = req.body.status || duty.status;

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
const assignDuty = async (req, res) => {
  try {
    const { userId, remarks } = req.body;
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const previousUser = duty.assignedTo;
    const action = previousUser ? "reassigned" : "assigned";

    // If reassigning, close previous user's history entry
    if (previousUser) {
      const lastHistory = await DutyHistory.findOne({
        duty: duty._id,
        user: previousUser,
        action: { $in: ["assigned", "reassigned"] },
        endDate: null,
      }).sort({ createdAt: -1 });

      if (lastHistory) {
        lastHistory.endDate = new Date();
        lastHistory.action = "removed";
        await lastHistory.save();
      }
    }

    // Assign new user
    duty.assignedTo = userId;
    duty.status = "active";
    await duty.save();

    // Create history entry for new assignment
    await DutyHistory.create({
      duty: duty._id,
      user: userId,
      action,
      dutyType: duty.dutyType,
      location: duty.location,
      startDate: new Date(),
      endDate: null,
      remarks,
      performedBy: req.admin._id,
      previousUser: previousUser || null,
    });

    const updated = await Duty.findById(duty._id)
      .populate("assignedTo", "name phoneNumber pnoNumber")
      .populate("createdBy", "name email");

    res.json({ message: `Duty ${action} successfully`, duty: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/duties/:id/remove
const removeDutyAssignment = async (req, res) => {
  try {
    const { remarks } = req.body;
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });
    if (!duty.assignedTo) return res.status(400).json({ message: "No user assigned to this duty" });

    // Close history entry
    const lastHistory = await DutyHistory.findOne({
      duty: duty._id,
      user: duty.assignedTo,
      endDate: null,
    }).sort({ createdAt: -1 });

    if (lastHistory) {
      lastHistory.endDate = new Date();
      lastHistory.action = "removed";
      lastHistory.remarks = remarks || lastHistory.remarks;
      await lastHistory.save();
    }

    // Create a removed history record
    await DutyHistory.create({
      duty: duty._id,
      user: duty.assignedTo,
      action: "removed",
      dutyType: duty.dutyType,
      location: duty.location,
      startDate: lastHistory?.startDate || duty.startDate,
      endDate: new Date(),
      remarks,
      performedBy: req.admin._id,
    });

    duty.assignedTo = null;
    duty.status = "pending";
    await duty.save();

    res.json({ message: "Duty assignment removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/duties/:id/complete
const completeDuty = async (req, res) => {
  try {
    const { remarks } = req.body;
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    if (duty.assignedTo) {
      const lastHistory = await DutyHistory.findOne({
        duty: duty._id,
        user: duty.assignedTo,
        endDate: null,
      }).sort({ createdAt: -1 });

      if (lastHistory) {
        lastHistory.endDate = new Date();
        lastHistory.action = "completed";
        lastHistory.remarks = remarks || lastHistory.remarks;
        await lastHistory.save();
      }
    }

    duty.status = "completed";
    duty.endDate = new Date();
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
