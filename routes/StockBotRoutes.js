const express = require("express");
const { StockBot } = require("../models/StockSchema");
const router = express.Router();

router.get("/getStockChannels", async (req, res) => {
  try {
    const chatNames = await StockBot.find()
      .select("chatId chatName createdAt")
      .lean();
    res.json(chatNames);
  } catch (error) {
    console.error("Failed to fetch chat names:", error);
    res.status(500).json({ message: "Failed to retrieve chat names" });
  }
});

module.exports = router;