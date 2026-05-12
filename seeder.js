const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Admin = require("./models/Admin");

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await Admin.findOne({ email: "admin@gadnaapp.com" });
    if (existing) {
      console.log("Superadmin already exists");
      process.exit();
    }

    await Admin.create({
      name: "Gaurav Gupta",
      email: "admin@gadnaapp.com",
      password: "Admin@123",
      role: "superadmin",
    });

    console.log("Superadmin created successfully!");
    console.log("Email: admin@gadnaapp.com");
    console.log("Password: Admin@123");
    process.exit();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

seedAdmin();
