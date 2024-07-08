const mongoose = require("mongoose");

const stockBotSchema = new mongoose.Schema(
  {
    chatName: { type: String },
    chatId: { type: String },
  },
  {
    timestamps: true,
  }
);

const StockBot = mongoose.model("StockBot", stockBotSchema);

module.exports = { StockBot };
