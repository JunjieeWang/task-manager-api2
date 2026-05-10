/** models/DelegatedPermission.js */
const mongoose = require("mongoose");

const delegatedPermissionSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  permission: { type: String, required: true }, // nom del permís (ex: "tasks:assign")
  reason:     { type: String, default: "" },
  delegatedAt:{ type: Date, default: Date.now },
  expiresAt:  { type: Date, required: true },
  revokedAt:  { type: Date, default: null },
  status:     { type: String, enum: ["active", "expired", "revoked"], default: "active" }
}, { timestamps: true });

delegatedPermissionSchema.index({ toUserId: 1, status: 1 });
delegatedPermissionSchema.index({ fromUserId: 1 });

module.exports = mongoose.model("DelegatedPermission", delegatedPermissionSchema);
