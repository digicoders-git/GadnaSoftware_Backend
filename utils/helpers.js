const generateResponse = (success, message, data = null) => ({
  success,
  message,
  data,
});

module.exports = { generateResponse };
