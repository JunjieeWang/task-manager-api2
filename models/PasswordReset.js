/** models/PasswordReset.js */
const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null }
});

// Auto-elimina tokens expirats
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
