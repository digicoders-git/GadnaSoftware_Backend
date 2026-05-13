const User = require("../models/User");
const Duty = require("../models/Duty");
const Holiday = require("../models/Holiday");
const Designation = require("../models/Designation");

// @route   POST /api/users
const createUser = async (req, res) => {
  try {
    const { name, designation, phoneNumber, pnoNumber } = req.body;

    const exists = await User.findOne({ $or: [{ phoneNumber }, { pnoNumber }] });
    if (exists) {
      return res.status(400).json({ message: "Phone or PNO number already exists" });
    }

    // Validate designation exists
    const designationDoc = await Designation.findById(designation);
    if (!designationDoc) return res.status(400).json({ message: "Invalid designation ID" });

    const user = await User.create({ name, designation, phoneNumber, pnoNumber });
    await user.populate("designation", "name");
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    const { all } = req.query;
    const filter = all === 'true' ? {} : { isActive: true };
    const users = await User.find(filter).populate("designation", "name").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("designation", "name");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    if (req.body.designation) {
      const designationDoc = await Designation.findById(req.body.designation);
      if (!designationDoc) return res.status(400).json({ message: "Invalid designation ID" });
      user.designation = req.body.designation;
    }
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
    user.pnoNumber = req.body.pnoNumber || user.pnoNumber;
    user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

    const updated = await user.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/unassigned/list
const getUnassignedUsers = async (req, res) => {
  try {
    const allUsers = await User.find({ isActive: true });
    const now = new Date();

    // Users on holiday
    const ongoingHolidays = await Holiday.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).select("user");
    const holidayUserIds = ongoingHolidays.map((h) => h.user.toString());

    // Users with active duty
    const activeDuties = await Duty.find({
      status: "active",
      assignedTo: { $ne: null },
    }).select("assignedTo");
    const assignedUserIds = activeDuties.map((d) => d.assignedTo.toString());

    // Unassigned = not on holiday AND not on active duty
    const unassignedUsers = allUsers.filter(
      (u) =>
        !holidayUserIds.includes(u._id.toString()) &&
        !assignedUserIds.includes(u._id.toString())
    );

    res.json({
      totalUsers: allUsers.length,
      totalUnassigned: unassignedUsers.length,
      unassignedUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/status/overview
const getUserStatusOverview = async (req, res) => {
  try {
    const now = new Date();
    const allUsers = await User.find({ isActive: true }).populate("designation", "name");

    // Ongoing holidays
    const ongoingHolidays = await Holiday.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).populate("user", "name phoneNumber pnoNumber");
    const holidayUserIds = new Set(ongoingHolidays.map((h) => h.user._id.toString()));

    // Active duties with assigned users
    const activeDuties = await Duty.find({
      status: "active",
      assignedTo: { $ne: null },
    }).populate("assignedTo", "name phoneNumber pnoNumber");

    // Map: userId -> duty info
    const userDutyMap = {};
    for (const duty of activeDuties) {
      if (duty.assignedTo) {
        userDutyMap[duty.assignedTo._id.toString()] = {
          dutyId: duty._id,
          title: duty.title,
          dutyType: duty.dutyType,
          location: duty.location,
          startDate: duty.startDate,
        };
      }
    }

    const available = [];
    const onDuty = {};
    const onHoliday = [];
    const deputed = [];

    // Initialize duty type buckets from active duties
    const dutyTypes = [...new Set(activeDuties.map((d) => d.dutyType))];
    dutyTypes.forEach((type) => (onDuty[type] = []));

    for (const user of allUsers) {
      const uid = user._id.toString();
      const isOnHoliday = holidayUserIds.has(uid);
      const activeDuty = userDutyMap[uid];

      if (isOnHoliday) {
        // Holiday pe hai - holiday details ke saath
        const holidayRecord = ongoingHolidays.find((h) => h.user._id.toString() === uid);
        onHoliday.push({
          user,
          holiday: holidayRecord
            ? {
                _id: holidayRecord._id,
                startDate: holidayRecord.startDate,
                endDate: holidayRecord.endDate,
                reason: holidayRecord.reason,
              }
            : null,
        });
      } else if (activeDuty) {
        if (activeDuty.dutyType === "special") {
          // Special duty = deputed (alag jagah bheja gaya)
          deputed.push({ user, duty: activeDuty });
        } else {
          // Normal duty type bucket mein daalo
          if (!onDuty[activeDuty.dutyType]) onDuty[activeDuty.dutyType] = [];
          onDuty[activeDuty.dutyType].push({ user, duty: activeDuty });
        }
      } else {
        // Na holiday, na duty = available
        available.push(user);
      }
    }

    // Duty-type wise summary (sirf wahi types jo actually users hain)
    const dutyWiseSummary = Object.entries(onDuty)
      .filter(([, users]) => users.length > 0)
      .map(([type, users]) => ({
        dutyType: type,
        total: users.length,
        users,
      }));

    res.json({
      totalUsers: allUsers.length,
      summary: {
        available: available.length,
        onDuty: Object.values(onDuty).reduce((sum, arr) => sum + arr.length, 0),
        onHoliday: onHoliday.length,
        deputed: deputed.length,
      },
      available,
      dutyWise: dutyWiseSummary,
      deputed,
      onHoliday,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/status/by-duty-type/:dutyType
// Ek specific duty type ke users
const getUsersByDutyType = async (req, res) => {
  try {
    const { dutyType } = req.params;
    const validTypes = ["patrol", "guard", "investigation", "traffic", "special", "other"];

    if (!validTypes.includes(dutyType)) {
      return res.status(400).json({ message: `Invalid dutyType. Valid: ${validTypes.join(", ")}` });
    }

    const duties = await Duty.find({
      status: "active",
      dutyType,
      assignedTo: { $ne: null },
    })
      .populate("assignedTo", "name phoneNumber pnoNumber")
      .populate("createdBy", "name")
      .sort({ startDate: -1 });

    const users = duties.map((d) => ({
      user: d.assignedTo,
      duty: {
        _id: d._id,
        title: d.title,
        location: d.location,
        startDate: d.startDate,
        endDate: d.endDate,
      },
    }));

    res.json({
      dutyType,
      total: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUnassignedUsers,
  getUserStatusOverview,
  getUsersByDutyType,
};
