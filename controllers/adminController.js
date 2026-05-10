/** task-manager-api/controllers/adminController.js */

const mongoose = require("mongoose");
const User = require("../models/User");
const Task = require("../models/Task");
const Role = require("../models/Role");
const ErrorResponse = require("../utils/errorResponse");

function getLegacyRole(roleDocs = []) {
  return roleDocs.some((role) => role.name === "admin") ? "admin" : "user";
}

async function resolveRoleDocuments(inputRoles = []) {
  const rolesToResolve = Array.isArray(inputRoles)
    ? [...new Set(inputRoles.map((role) => String(role).trim()).filter(Boolean))]
    : [];

  if (rolesToResolve.length === 0) {
    const defaultRole = await Role.findOne({ name: "user" });
    if (!defaultRole) {
      throw new ErrorResponse("Rol 'user' no trobat. Executa el seed.", 500);
    }

    return [defaultRole];
  }

  const objectIds = rolesToResolve.filter((role) => mongoose.isValidObjectId(role));
  const roleNames = rolesToResolve
    .filter((role) => !mongoose.isValidObjectId(role))
    .map((role) => role.toLowerCase());

  const filters = [];
  if (objectIds.length > 0) filters.push({ _id: { $in: objectIds } });
  if (roleNames.length > 0) filters.push({ name: { $in: roleNames } });

  const roles = await Role.find({ $or: filters });

  if (roles.length !== rolesToResolve.length) {
    throw new ErrorResponse("Un o mes rols no existeixen", 404);
  }

  return roles;
}

async function buildUserResponse(userId) {
  const user = await User.findById(userId)
    .populate({
      path: "roles",
      populate: {
        path: "permissions",
        select: "name description category",
      },
    })
    .select("-password");

  if (!user) {
    throw new ErrorResponse("Usuari no trobat", 404);
  }

  const taskCount = await Task.countDocuments({ user: user._id });

  return {
    ...user.toJSON(),
    taskCount,
  };
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, roles } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return next(new ErrorResponse("Email ja registrat", 400));
    }

    const roleDocs = await resolveRoleDocuments(roles);

    const user = await User.create({
      name,
      email,
      password,
      roles: roleDocs.map((role) => role._id),
      role: getLegacyRole(roleDocs),
    });

    const data = await buildUserResponse(user._id);

    res.status(201).json({
      success: true,
      message: "Usuari creat correctament",
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const users = await User.find()
      .populate("roles", "name description")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: "roles",
        populate: {
          path: "permissions",
          select: "name description",
        },
      })
      .select("-password");

    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    const taskCount = await Task.countDocuments({ user: user._id });

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        taskCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { name, email, password, roles } = req.body;

    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    if (email) {
      const exists = await User.findOne({ email, _id: { $ne: user._id } });
      if (exists) {
        return next(new ErrorResponse("Email ja en us", 400));
      }
      user.email = email;
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (password) {
      user.password = password;
    }

    if (roles !== undefined) {
      const roleDocs = await resolveRoleDocuments(roles);
      user.roles = roleDocs.map((role) => role._id);
      user.role = getLegacyRole(roleDocs);
    }

    await user.save();

    const data = await buildUserResponse(user._id);

    res.json({
      success: true,
      message: "Usuari actualitzat correctament",
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getAllTasks(req, res, next) {
  try {
    const tasks = await Task.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    if (user._id.toString() === req.user._id.toString()) {
      return next(new ErrorResponse("No et pots eliminar a tu mateix", 400));
    }

    await Task.deleteMany({ user: user._id });
    await user.deleteOne();

    res.json({
      success: true,
      message: "Usuari i les seves tasques eliminats correctament",
    });
  } catch (err) {
    next(err);
  }
}

async function assignRoleToUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    let role;
    if (mongoose.isValidObjectId(roleId)) {
      role = await Role.findById(roleId);
    }
    if (!role) {
      role = await Role.findOne({ name: String(roleId).toLowerCase() });
    }

    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    const alreadyHasRole = user.roles.some(
      (existingRoleId) => existingRoleId.toString() === role._id.toString()
    );

    if (alreadyHasRole) {
      return next(new ErrorResponse("L'usuari ja te aquest rol", 400));
    }

    user.roles.push(role._id);
    if (role.name === "admin") {
      user.role = "admin";
    }

    await user.save();

    await user.populate({
      path: "roles",
      populate: {
        path: "permissions",
        select: "name",
      },
    });

    res.json({
      success: true,
      message: "Rol assignat correctament",
      data: {
        userId: user._id,
        roles: user.roles.map((roleDoc) => ({
          id: roleDoc._id,
          name: roleDoc.name,
          permissions: roleDoc.permissions.map((permission) => permission.name),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function removeRoleFromUser(req, res, next) {
  try {
    const { userId, roleId } = req.params;

    const user = await User.findById(userId).populate("roles");
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    let role;
    if (mongoose.isValidObjectId(roleId)) {
      role = await Role.findById(roleId);
    }
    if (!role) {
      role = await Role.findOne({ name: String(roleId).toLowerCase() });
    }

    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    const roleIndex = user.roles.findIndex(
      (userRole) => userRole._id.toString() === role._id.toString()
    );

    if (roleIndex === -1) {
      return next(new ErrorResponse("L'usuari no te aquest rol", 400));
    }

    if (user.roles.length <= 1) {
      return next(new ErrorResponse("L'usuari ha de tenir almenys un rol", 400));
    }

    user.roles.splice(roleIndex, 1);

    const remainingRoleNames = user.roles.map((userRole) => userRole.name);
    user.role = remainingRoleNames.includes("admin") ? "admin" : "user";

    await user.save();

    await user.populate({
      path: "roles",
      populate: {
        path: "permissions",
        select: "name",
      },
    });

    res.json({
      success: true,
      message: "Rol eliminat correctament",
      data: {
        userId: user._id,
        roles: user.roles.map((roleDoc) => ({
          id: roleDoc._id,
          name: roleDoc.name,
          permissions: roleDoc.permissions.map((permission) => permission.name),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getUserPermissions(req, res, next) {
  try {
    const userId = req.params.userId || req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    const permissions = await user.getAllPermissions();
    const roleNames = await user.getRoleNames();

    res.json({
      success: true,
      data: {
        userId: user._id,
        userName: user.name,
        roles: roleNames,
        permissions: permissions.sort(),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function changeUserRole(req, res, next) {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return next(new ErrorResponse("Rol invalid. Usar 'user' o 'admin'", 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) {
      return next(new ErrorResponse("Rol no configurat al sistema", 500));
    }

    user.roles = [roleDoc._id];
    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `Rol canviat a '${role}'`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  getAllTasks,
  deleteUser,
  assignRoleToUser,
  removeRoleFromUser,
  getUserPermissions,
  changeUserRole,
};
