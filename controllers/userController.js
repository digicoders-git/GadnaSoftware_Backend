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
    const { all, page = 1, limit = 10, search = '', status = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();

    const pipeline = [
      { $match: all === 'true' ? {} : { isActive: true } },
      {
        $lookup: {
          from: 'designations',
          localField: 'designation',
          foreignField: '_id',
          as: 'designation'
        }
      },
      { $unwind: { path: '$designation', preserveNullAndEmptyArrays: true } },
      // Join with duties to check current duty status
      {
        $lookup: {
          from: 'duties',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: { $ifNull: ['$assignments', []] },
                              as: 'a',
                              cond: { $eq: ['$$a.user', '$$userId'] }
                            }
                          }
                        },
                        0
                      ]
                    }
                  ]
                }
              }
            },
            {
              $project: {
                title: 1,
                description: 1,
                location: 1,
                dutyType: 1,
                assignment: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$assignments',
                        as: 'a',
                        cond: { $eq: ['$$a.user', '$$userId'] }
                      }
                    },
                    0
                  ]
                }
              }
            }
          ],
          as: 'activeDuties'
        }
      },
      // Join with holidays to check current holiday status
      {
        $lookup: {
          from: 'holidays',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $lte: ['$startDate', now] },
                    { $gte: ['$endDate', now] }
                  ]
                }
              }
            }
          ],
          as: 'currentHolidays'
        }
      },
      // Calculate Status and Flatten details
      {
        $addFields: {
          activeDuty: { $arrayElemAt: ['$activeDuties', 0] },
          currentHoliday: { $arrayElemAt: ['$currentHolidays', 0] },
          currentStatus: {
            $cond: [
              { $gt: [{ $size: '$currentHolidays' }, 0] },
              'onHoliday',
              {
                $cond: [
                  { $gt: [{ $size: '$activeDuties' }, 0] },
                  'onDuty',
                  'available'
                ]
              }
            ]
          }
        }
      }
    ];

    // Search Filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { pnoNumber: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } },
            { 'designation.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Status Filter
    if (status) {
      pipeline.push({ $match: { currentStatus: status } });
    }

    // Duty Type Filter (e.g., 'special' for deputed)
    const { dutyType } = req.query;
    if (dutyType) {
      pipeline.push({ $match: { 'activeDuty.dutyType': dutyType } });
    }

    // Clone pipeline for count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await User.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Add sort
    pipeline.push({ $sort: { createdAt: -1 } });

    // Apply pagination unless explicitly disabled
    const { pagination } = req.query;
    if (pagination !== 'false') {
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });
    }

    const users = await User.aggregate(pipeline);

    res.json({
      users,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('getUsers aggregation error:', error);
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
      "assignments.0": { $exists: true },
    }).select("assignments");
    const assignedUserIds = activeDuties.flatMap((d) =>
      d.assignments.map((a) => a.user.toString())
    );

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
    const holidayUserIds = new Set(
      ongoingHolidays
        .filter(h => h.user) // Filter out null users
        .map((h) => h.user._id.toString())
    );

    // Active duties with assigned users
    const activeDuties = await Duty.find({
      status: "active",
      "assignments.0": { $exists: true },
    }).populate("assignments.user", "name phoneNumber pnoNumber");

    // Map: userId -> assignment info (dutyType, title, location, startDate, dutyId)
    const userDutyMap = {};
    for (const duty of activeDuties) {
      for (const assignment of duty.assignments) {
        if (assignment.user) {
          userDutyMap[assignment.user._id.toString()] = {
            dutyId: duty._id,
            title: duty.title,
            description: duty.description,
            dutyType: assignment.dutyType,
            location: duty.location,
            startDate: assignment.startDate,
            remarks: assignment.remarks,
          };
        }
      }
    }

    const available = [];
    const onHoliday = [];
    const deputed = [];

    // Initialize duty type buckets from active duties - get unique dutyTypes from assignments
    const dutyTypes = new Set();
    for (const duty of activeDuties) {
      for (const assignment of duty.assignments) {
        if (assignment.dutyType) {
          dutyTypes.add(assignment.dutyType);
        }
      }
    }
    const onDuty = {};
    dutyTypes.forEach((type) => (onDuty[type] = []));

    // Also initialize with common types
    ['patrol', 'guard', 'investigation', 'traffic', 'special', 'other'].forEach(type => {
      if (!onDuty[type]) onDuty[type] = [];
    });

    for (const user of allUsers) {
      const uid = user._id.toString();
      const isOnHoliday = holidayUserIds.has(uid);
      const activeDuty = userDutyMap[uid];

      if (isOnHoliday) {
        // Holiday pe hai - holiday details ke saath
        const holidayRecord = ongoingHolidays.find((h) => h.user && h.user._id.toString() === uid);
        onHoliday.push({
          user,
          holiday: holidayRecord
            ? {
                _id: holidayRecord._id,
                startDate: holidayRecord.startDate,
                endDate: holidayRecord.endDate,
                reason: holidayRecord.reason,
                remarks: holidayRecord.remarks,
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
      "assignments.dutyType": dutyType,
    })
      .populate("assignments.user", "name phoneNumber pnoNumber")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    const users = [];
    for (const duty of duties) {
      for (const assignment of duty.assignments) {
        if (assignment.dutyType === dutyType && assignment.user) {
          users.push({
            user: assignment.user,
            duty: {
              _id: duty._id,
              title: duty.title,
              location: duty.location,
              startDate: assignment.startDate,
              endDate: assignment.endDate,
            },
          });
        }
      }
    }

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
