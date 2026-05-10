/** routes/delegationRoutes.js - /api/delegations */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { roleLimiter } = require("../middleware/rateLimiter");
const dc = require("../controllers/delegationController");

router.use(auth);
router.use(roleLimiter);

// GET /api/delegations
router.get("/", dc.getAllDelegations);

// GET /api/delegations/user/:userId  (ABANS de /:id)
router.get("/user/:userId", dc.getDelegationsByUser);

// GET /api/delegations/:id
router.get("/:id", dc.getDelegationById);

// POST /api/delegations
router.post("/", dc.createDelegation);

// PUT /api/delegations/:id
router.put("/:id", dc.updateDelegation);

// DELETE /api/delegations/:id
router.delete("/:id", dc.revokeDelegation);

module.exports = router;
