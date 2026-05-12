const express = require("express");
const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

router.use("/admin", require("./adminRoutes"));
router.use("/designations", require("./designationRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/duties", require("./dutyRoutes"));
router.use("/duty-history", require("./dutyHistoryRoutes"));
router.use("/holidays", require("./holidayRoutes"));

module.exports = router;
