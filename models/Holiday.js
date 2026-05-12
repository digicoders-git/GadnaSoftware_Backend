const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, trim: true, default: "Holiday" },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-set status based on dates before save
holidaySchema.pre("save", function (next) {
  const now = new Date();
  if (now >= this.startDate && now <= this.endDate) {
    this.status = "ongoing";
  } else if (now > this.endDate) {
    this.status = "completed";
  } else {
    this.status = "upcoming";
  }
  next();
});

module.exports = mongoose.model("Holiday", holidaySchema);
