/** task-manager-api/controllers/adminController.js */
/**
 * Controlador d'Administració (adminController)
 * Gestiona les operacions d'administració d'usuaris:
 * - Llistar usuaris
 * - Obtenir totes les tasques
 * - Eliminar usuaris
 * - Gestionar rols d'usuaris
 */

const User = require("../models/User");
const Task = require("../models/Task");
const Role = require("../models/Role");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Obtenir tots els usuaris
 * GET /api/admin/users
 */
async function getAllUsers(req, res, next) {
  try {
    const users = await User.find()
      .populate("roles", "name description")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir un usuari per ID
 * GET /api/admin/users/:id
 */
async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: "roles",
        populate: {
          path: "permissions",
          select: "name description"
        }
      })
      .select("-password");

    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    // Obtenim les tasques de l'usuari
    const taskCount = await Task.countDocuments({ user: user._id });

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        taskCount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir totes les tasques (admin)
 * GET /api/admin/tasks
 */
async function getAllTasks(req, res, next) {
  try {
    const tasks = await Task.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar un usuari
 * DELETE /api/admin/users/:id
 */
async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    // No permetre eliminar-se a si mateix
    if (user._id.toString() === req.user._id.toString()) {
      return next(new ErrorResponse("No et pots eliminar a tu mateix", 400));
    }

    // Eliminem les tasques de l'usuari
    await Task.deleteMany({ user: user._id });

    // Eliminem l'usuari
    await user.deleteOne();

    res.json({
      success: true,
      message: "Usuari i les seves tasques eliminats correctament"
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Assignar rol a un usuari
 * POST /api/admin/users/:userId/roles
 */
async function assignRoleToUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    // Busquem l'usuari
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    // Busquem el rol (pot ser per ID o per nom)
    let role;
    if (require("mongoose").isValidObjectId(roleId)) {
      role = await Role.findById(roleId);
    }
    if (!role) {
      role = await Role.findOne({ name: roleId.toLowerCase() });
    }
    
    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    // Comprovem si ja té el rol
    if (user.roles.includes(role._id)) {
      return next(new ErrorResponse("L'usuari ja té aquest rol", 400));
    }

    // Afegim el rol
    user.roles.push(role._id);
    
    // Actualitzem el camp legacy
    if (role.name === "admin") {
      user.role = "admin";
    }
    
    await user.save();

    // Poblem els rols per la resposta
    await user.populate({
      path: "roles",
      populate: {
        path: "permissions",
        select: "name"
      }
    });

    res.json({
      success: true,
      message: "Rol assignat correctament",
      data: {
        userId: user._id,
        roles: user.roles.map(r => ({
          id: r._id,
          name: r.name,
          permissions: r.permissions.map(p => p.name)
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar rol d'un usuari
 * DELETE /api/admin/users/:userId/roles/:roleId
 */
async function removeRoleFromUser(req, res, next) {
  try {
    const { userId, roleId } = req.params;

    // Busquem l'usuari
    const user = await User.findById(userId).populate("roles");
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    // Busquem el rol
    let role;
    if (require("mongoose").isValidObjectId(roleId)) {
      role = await Role.findById(roleId);
    }
    if (!role) {
      role = await Role.findOne({ name: roleId.toLowerCase() });
    }
    
    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    // Comprovem si té el rol
    const roleIndex = user.roles.findIndex(r => r._id.toString() === role._id.toString());
    if (roleIndex === -1) {
      return next(new ErrorResponse("L'usuari no té aquest rol", 400));
    }

    // No permetre que l'usuari quedi sense rols
    if (user.roles.length <= 1) {
      return next(new ErrorResponse("L'usuari ha de tenir almenys un rol", 400));
    }

    // Eliminem el rol
    user.roles.splice(roleIndex, 1);
    
    // Actualitzem el camp legacy
    const remainingRoleNames = user.roles.map(r => r.name);
    user.role = remainingRoleNames.includes("admin") ? "admin" : "user";
    
    await user.save();

    // Poblem els rols per la resposta
    await user.populate({
      path: "roles",
      populate: {
        path: "permissions",
        select: "name"
      }
    });

    res.json({
      success: true,
      message: "Rol eliminat correctament",
      data: {
        userId: user._id,
        roles: user.roles.map(r => ({
          id: r._id,
          name: r.name,
          permissions: r.permissions.map(p => p.name)
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir tots els permisos efectius d'un usuari
 * GET /api/admin/users/:userId/permissions
 */
async function getUserPermissions(req, res, next) {
  try {
    const { userId } = req.params;

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
        permissions: permissions.sort()
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Canviar rol d'un usuari (legacy - per compatibilitat amb T7)
 * PUT /api/admin/users/:id/role
 */
async function changeUserRole(req, res, next) {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return next(new ErrorResponse("Rol invàlid. Usar 'user' o 'admin'", 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    // Obtenim el rol corresponent
    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) {
      return next(new ErrorResponse("Rol no configurat al sistema", 500));
    }

    // Substituïm tots els rols per només el nou
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
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  getAllTasks,
  deleteUser,
  assignRoleToUser,
  removeRoleFromUser,
  getUserPermissions,
  changeUserRole
};
