/** models/TokenBlacklist.js */
const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema({
  token: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  revokedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

// MongoDB TTL: auto-elimina tokens expirats
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("TokenBlacklist", tokenBlacklistSchema);
