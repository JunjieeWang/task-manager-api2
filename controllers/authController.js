/** controllers/authController.js */
const crypto = require("crypto");
const User = require("../models/User");
const Role = require("../models/Role");
const TokenBlacklist = require("../models/TokenBlacklist");
const PasswordReset = require("../models/PasswordReset");
const jwtService = require("../services/jwtService");
const ErrorResponse = require("../utils/errorResponse");

async function buildTokenPair(user) {
  await user.populate({
    path: "roles",
    populate: { path: "permissions", select: "name" }
  });

  const roleNames = user.roles.map(r => r.name);
  const permissions = [];
  for (const role of user.roles) {
    for (const perm of role.permissions || []) {
      if (!permissions.includes(perm.name)) permissions.push(perm.name);
    }
  }

  const accessToken  = jwtService.generateAccessToken(user._id, roleNames, permissions);
  const refreshToken = jwtService.generateRefreshToken(user._id);

  return { accessToken, refreshToken, roleNames, permissions };
}

/** POST /api/auth/register */
async function register(req, res, next) {
  try {
    const { name, firstName, lastName, email, password } = req.body;

    const displayName = name || [firstName, lastName].filter(Boolean).join(" ") || "";

    const exists = await User.findOne({ email });
    if (exists) return next(new ErrorResponse("Email ja registrat", 400));

    const defaultRole = await Role.findOne({ name: "user" });
    if (!defaultRole) {
      return next(new ErrorResponse("Rol 'user' no trobat. Executa el seed.", 500));
    }

    const user = await User.create({
      name: displayName,
      email,
      password,
      roles: [defaultRole._id],
      role: "user"
    });

    const { accessToken, refreshToken, roleNames, permissions } = await buildTokenPair(user);

    return res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: roleNames,
        permissions
      }
    });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/login */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return next(new ErrorResponse("Credencials invàlides", 401));

    const ok = await user.comparePassword(password);
    if (!ok) return next(new ErrorResponse("Credencials invàlides", 401));

    const { accessToken, refreshToken, roleNames, permissions } = await buildTokenPair(user);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: roleNames,
        permissions
      }
    });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/refresh */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new ErrorResponse("refreshToken requerit", 400));

    let decoded;
    try {
      decoded = jwtService.verifyRefreshToken(refreshToken);
    } catch (e) {
      if (e.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, error: "Token expired", code: "TOKEN_EXPIRED" });
      }
      return next(new ErrorResponse("Refresh token invàlid", 401));
    }

    if (decoded.tokenType !== "refresh") {
      return next(new ErrorResponse("Token invàlid: no és un refresh token", 401));
    }

    const blacklisted = await TokenBlacklist.findOne({ token: refreshToken });
    if (blacklisted) return next(new ErrorResponse("Token revocat", 401));

    const user = await User.findById(decoded.userId);
    if (!user) return next(new ErrorResponse("Usuari no trobat", 401));

    const { accessToken, roleNames, permissions } = await buildTokenPair(user);

    return res.json({ success: true, accessToken, expiresIn: 900 });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/logout */
async function logout(req, res, next) {
  try {
    const accessToken  = req.token;
    const { refreshToken } = req.body;

    const now = Date.now();

    if (accessToken) {
      await TokenBlacklist.create({
        token: accessToken,
        userId: req.user._id,
        revokedAt: new Date(),
        expiresAt: new Date(now + 15 * 60 * 1000)
      });
    }

    if (refreshToken) {
      await TokenBlacklist.create({
        token: refreshToken,
        userId: req.user._id,
        revokedAt: new Date(),
        expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000)
      });
    }

    return res.json({ success: true, message: "Sessió tancada correctament" });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/forgot-password */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return next(new ErrorResponse("Email requerit", 400));

    const user = await User.findOne({ email });

    // Sempre retornem 200 per seguretat (no revelar si l'email existeix)
    if (!user) {
      return res.json({ success: true, message: "Si l'email existeix, rebràs un correu" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await PasswordReset.deleteMany({ userId: user._id });
    await PasswordReset.create({ userId: user._id, token, expiresAt });

    // En producció s'enviaria un email. Per a proves, incloem el token a la resposta.
    console.log(`[PasswordReset] Token per ${email}: ${token}`);

    return res.json({
      success: true,
      message: "Email enviat amb les instruccions per restablir la contrasenya",
      resetToken: token // Inclòs per a proves (treure en producció)
    });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/reset-password/:token */
async function resetPassword(req, res, next) {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) return next(new ErrorResponse("newPassword requerit", 400));
    if (newPassword.length < 6) return next(new ErrorResponse("Password mínim 6 caràcters", 400));

    const reset = await PasswordReset.findOne({
      token,
      expiresAt: { $gt: new Date() },
      usedAt: null
    });

    if (!reset) return next(new ErrorResponse("Token invàlid o expirat", 400));

    const user = await User.findById(reset.userId);
    if (!user) return next(new ErrorResponse("Usuari no trobat", 404));

    user.password = newPassword;
    await user.save();

    reset.usedAt = new Date();
    await reset.save();

    return res.json({ success: true, message: "Contrasenya actualitzada correctament" });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/auth/me */
async function getMe(req, res) {
  return res.json({ success: true, user: req.user });
}

/** PUT /api/auth/profile */
async function updateProfile(req, res, next) {
  try {
    const { name, email } = req.body;

    if (email) {
      const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (exists) return next(new ErrorResponse("Email ja en ús", 400));
    }

    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;

    const updated = await User.findByIdAndUpdate(req.user._id, update, {
      new: true, runValidators: true
    }).populate("roles", "name");

    if (!updated) return next(new ErrorResponse("Usuari no trobat", 404));

    return res.json({
      success: true,
      user: { _id: updated._id, name: updated.name, email: updated.email, roles: updated.roles.map(r => r.name) }
    });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/auth/change-password */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return next(new ErrorResponse("Usuari no trobat", 404));

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return next(new ErrorResponse("currentPassword incorrecte", 401));

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: "Password actualitzat" });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/check-permission */
async function checkPermission(req, res, next) {
  try {
    const { permission } = req.body;
    if (!permission) return next(new ErrorResponse("Cal especificar el permís", 400));

    const hasPermission = req.user.permissions?.includes(permission);

    if (hasPermission) {
      return res.json({ success: true, hasPermission: true, message: "Tens permís per fer aquesta acció" });
    }
    return res.status(403).json({ success: false, hasPermission: false, message: "No tens permís" });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/auth/my-permissions */
async function getMyPermissions(req, res) {
  return res.json({ success: true, data: { roles: req.user.roles, permissions: req.user.permissions } });
}

module.exports = {
  register, login, refresh, logout,
  forgotPassword, resetPassword,
  getMe, updateProfile, changePassword,
  checkPermission, getMyPermissions
};
