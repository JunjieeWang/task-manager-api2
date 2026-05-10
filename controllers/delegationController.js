/**
 * @file controllers/delegationController.js
 * @description CRUD per a delegacions de permisos temporals entre usuaris.
 * Permet que un usuari delegui un permís específic a un altre durant un periode limitat.
 */
const DelegatedPermission = require("../models/DelegatedPermission");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

/** GET /api/delegations */
async function getAllDelegations(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const [delegations, total] = await Promise.all([
      DelegatedPermission.find(filter)
        .populate("fromUserId", "name email")
        .populate("toUserId", "name email")
        .sort({ delegatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DelegatedPermission.countDocuments(filter)
    ]);

    res.json({ success: true, count: delegations.length, total, data: delegations });
  } catch (err) {
    next(err);
  }
}

/** GET /api/delegations/user/:userId */
async function getDelegationsByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const delegations = await DelegatedPermission.find({
      $or: [{ toUserId: userId }, { fromUserId: userId }]
    })
      .populate("fromUserId", "name email")
      .populate("toUserId", "name email")
      .sort({ delegatedAt: -1 })
      .lean();

    res.json({ success: true, count: delegations.length, data: delegations });
  } catch (err) {
    next(err);
  }
}

/** GET /api/delegations/:id */
async function getDelegationById(req, res, next) {
  try {
    const delegation = await DelegatedPermission.findById(req.params.id)
      .populate("fromUserId", "name email")
      .populate("toUserId", "name email");

    if (!delegation) return next(new ErrorResponse("Delegació no trobada", 404));
    res.json({ success: true, data: delegation });
  } catch (err) {
    next(err);
  }
}

/** POST /api/delegations */
async function createDelegation(req, res, next) {
  try {
    const { toUserId, permission, reason, daysValid } = req.body;

    if (!toUserId)   return next(new ErrorResponse("toUserId requerit", 400));
    if (!permission) return next(new ErrorResponse("permission requerit", 400));

    const days = parseInt(daysValid ?? 1);
    if (isNaN(days) || days < 1) {
      return next(new ErrorResponse("daysValid ha de ser un número positiu", 400));
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return next(new ErrorResponse("Usuari destinatari no trobat", 404));

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const delegation = await DelegatedPermission.create({
      fromUserId: req.user._id,
      toUserId,
      permission,
      reason: reason || "",
      expiresAt,
      status: "active"
    });

    await delegation.populate("fromUserId", "name email");
    await delegation.populate("toUserId", "name email");

    res.status(201).json({ success: true, message: "Delegació creada correctament", data: delegation });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/delegations/:id */
async function updateDelegation(req, res, next) {
  try {
    const delegation = await DelegatedPermission.findById(req.params.id);
    if (!delegation) return next(new ErrorResponse("Delegació no trobada", 404));

    if (delegation.fromUserId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return next(new ErrorResponse("No tens permís per modificar aquesta delegació", 403));
    }

    const { reason, daysValid } = req.body;
    if (reason !== undefined) delegation.reason = reason;
    if (daysValid !== undefined) {
      const days = parseInt(daysValid);
      if (isNaN(days) || days < 1) return next(new ErrorResponse("daysValid ha de ser positiu", 400));
      delegation.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    await delegation.save();
    res.json({ success: true, message: "Delegació actualitzada", data: delegation });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/delegations/:id - revoca */
async function revokeDelegation(req, res, next) {
  try {
    const delegation = await DelegatedPermission.findById(req.params.id);
    if (!delegation) return next(new ErrorResponse("Delegació no trobada", 404));

    if (delegation.fromUserId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return next(new ErrorResponse("No tens permís per revocar aquesta delegació", 403));
    }

    delegation.status = "revoked";
    delegation.revokedAt = new Date();
    await delegation.save();

    res.json({ success: true, message: "Delegació revocada correctament" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDelegations,
  getDelegationsByUser,
  getDelegationById,
  createDelegation,
  updateDelegation,
  revokeDelegation
};
