const mongoose = require("mongoose");

const dutyHistorySchema = new mongoose.Schema(
  {
    duty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Duty",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["assigned", "reassigned", "removed", "completed"],
      required: true,
    },
    dutyType: { type: String },
    location: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    duration: { type: Number, default: null }, // in hours
    remarks: { type: String, trim: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    previousUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Auto calculate duration before save
dutyHistorySchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    const diff = new Date(this.endDate) - new Date(this.startDate);
    this.duration = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  }
  next();
});

module.exports = mongoose.model("DutyHistory", dutyHistorySchema);
