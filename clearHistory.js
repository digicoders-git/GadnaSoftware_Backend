const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DutyHistory = require('./models/DutyHistory');

dotenv.config();

const clearHistory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    const result = await DutyHistory.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} history records.`);

    process.exit();
  } catch (error) {
    console.error('Error clearing history:', error);
    process.exit(1);
  }
};

clearHistory();
