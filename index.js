const { Telegraf } = require("telegraf");
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { StockBot } = require("./models/StockSchema");
const { default: mongoose } = require("mongoose");
const { MarketingBot } = require("./models/MarketingSchema");

const PORT = "3304";

const app = express();
app.use(cors());
app.use(express.json());
const uri = process.env.MONGO_DB;

mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const bot = new Telegraf(process.env.BOT_TOKEN);

let messages = {};

// Fetch messages from API and store them by chatId
async function fetchMessages() {
  try {
    const response = await axios.get(
      "https://copartners.in:5134/api/TelegramMessage?page=1&pageSize=100000"
    );
    if (response.data.isSuccess) {
      const newMessages = {};
      response.data.data.forEach((message) => {
        newMessages[message.chatId] = {
          joinMessage: message.joinMessage,
          leaveMessage: message.leaveMessage,
        };
      });
      messages = newMessages; // Update messages state
      console.log("Messages fetched and updated successfully");
    }
  } catch (error) {
    console.error("Failed to fetch messages:", error.message);
  }
}

// Fetch messages at bot launch
fetchMessages();

// Periodically fetch messages every 10 minutes
setInterval(fetchMessages, 10 * 60 * 1000);

bot.on("chat_join_request", async (ctx) => {
  const chatId = ctx.chatJoinRequest.chat.id;
  const memberId = ctx.chatJoinRequest.from.id;

  console.log(`Received join request from user ${memberId} for chat ${chatId}`);

  try {
    await ctx.telegram.approveChatJoinRequest(chatId, memberId);
    console.log(`Approved join request for user ${memberId}`);

    await MarketingBot.findOneAndUpdate(
      { chatId: chatId },
      { $addToSet: { members: memberId } },
      { upsert: true, new: true }
    );
    console.log(`Saved member ${memberId} in chat ${chatId}`);
  } catch (error) {
    console.error(
      `Failed to approve join request for user ${memberId}:`,
      error
    );
  }
});

bot.on("channel_post", async (ctx) => {
  const { id: chatId, title: chatName } = ctx.chat;

  try {
    const result = await StockBot.findOneAndUpdate(
      { chatId },
      { chatName },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (result) {
      if (result.isNew) {
        console.log(
          "New chat added with ID and channel name:",
          chatId,
          chatName
        );
      } else {
        console.log("Chat updated with new channel name:", chatName);
      }
    }
  } catch (error) {
    console.error("Error handling channel post:", error);
  }
});

bot.on("chat_member", async (ctx) => {
  const chatId = ctx.chatMember.chat.id;
  const memberId = ctx.chatMember.new_chat_member.user.id;
  const status = ctx.chatMember.new_chat_member.status;

  console.log(
    `Chat member update for user ${memberId} in chat ${chatId} with status ${status}`
  );

  if (messages[chatId]) {
    if (status === "member") {
      const joinMessage = messages[chatId].joinMessage;
      try {
        await ctx.telegram.sendMessage(memberId, joinMessage);
        console.log(`Sent join message to user ${memberId}`);
      } catch (error) {
        console.error(
          `Failed to send join message to user ${memberId}:`,
          error
        );
      }
    } else if (
      status === "kicked" ||
      status === "left" ||
      status === "banned"
    ) {
      const leaveMessage = messages[chatId].leaveMessage;
      try {
        await ctx.telegram.sendMessage(memberId, leaveMessage);
        console.log(`Sent leave message to user ${memberId}`);
      } catch (error) {
        console.error(
          `Failed to send leave message to user ${memberId}:`,
          error
        );
      }
    }
  }
});

app.use("/api", require("./routes/StockBotRoutes"));

bot.launch({
  allowedUpdates: ["chat_join_request", "chat_member", "channel_post"],
});

app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
