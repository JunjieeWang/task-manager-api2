/** routes/auditRoutes.js - /api/audit */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { roleLimiter } = require("../middleware/rateLimiter");
const AuditLog = require("../models/AuditLog");
const auditController = require("../controllers/auditController");
const ErrorResponse = require("../utils/errorResponse");

router.use(auth);
router.use(roleLimiter);
router.use(checkPermission("audit:read"));

// GET /api/audit/logs  (amb filtres ?action=, ?userId=, ?status=, ?page=, ?limit=)
router.get("/logs", auditController.getAuditLogs);

// GET /api/audit/stats
router.get("/stats", auditController.getAuditStats);

// GET /api/audit/stats/user/:userId
router.get("/stats/user/:userId", auditController.getUserAuditLogs);

// GET /api/audit/export?format=csv
router.get("/export", async (req, res, next) => {
  try {
    const { format = "csv", userId, action, status } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = { $regex: action, $options: "i" };
    if (status) filter.status = status;

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    if (format === "csv") {
      const fields = ["_id", "userId", "userName", "userEmail", "action", "resourceType", "status", "ipAddress", "method", "endpoint", "createdAt"];
      const header = fields.join(",");
      const rows = logs.map(log =>
        fields.map(f => {
          const val = log[f] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",")
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
      return res.send([header, ...rows].join("\n"));
    }

    // format=json per defecte
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
