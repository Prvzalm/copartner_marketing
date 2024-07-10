const mongoose = require("mongoose");

const MarketingBotSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    members: [{ type: String }],
  });
  
  const MarketingBot = mongoose.model('MarketingBot', MarketingBotSchema);


  module.exports = { MarketingBot };
  