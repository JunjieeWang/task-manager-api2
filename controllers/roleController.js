/** task-manager-api/controllers/roleController.js */
/**
 * Controlador de Rols (roleController)
 * Gestiona el CRUD de rols:
 * - Crear nous rols
 * - Llistar rols
 * - Obtenir detalls d'un rol
 * - Actualitzar rols
 * - Eliminar rols
 */

const Role = require("../models/Role");
const Permission = require("../models/Permission");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Crear un nou rol
 * POST /api/admin/roles
 */
async function createRole(req, res, next) {
  try {
    const { name, description, permissions, level, parentRole } = req.body;

    // Comprovem si el nom ja existeix
    const exists = await Role.findOne({ name: name.toLowerCase() });
    if (exists) {
      return next(new ErrorResponse("Ja existeix un rol amb aquest nom", 400));
    }

    // Validar jerarquia: el parentRole ha de tenir un nivell inferior al del nou rol
    if (parentRole) {
      const parent = await Role.findById(parentRole);
      if (!parent) return next(new ErrorResponse("parentRole no trobat", 404));
      const newLevel = level ?? 1;
      if (parent.level >= newLevel) {
        return next(new ErrorResponse(
          `Jerarquia invàlida: el rol pare (level ${parent.level}) ha de tenir un nivell inferior al nou rol (level ${newLevel})`,
          400
        ));
      }
    }

    // Validem que els permisos existeixin
    let permissionIds = [];
    if (permissions && permissions.length > 0) {
      // Separem IDs de noms
      const mongoose = require("mongoose");
      const ids = permissions.filter(p => mongoose.isValidObjectId(p));
      const names = permissions.filter(p => !mongoose.isValidObjectId(p));
      
      // Busquem per ID i per nom
      const perms = await Permission.find({
        $or: [
          { _id: { $in: ids } },
          { name: { $in: names.map(p => p.toLowerCase()) } }
        ]
      });

      if (perms.length !== permissions.length) {
        return next(new ErrorResponse("Alguns permisos no existeixen", 400));
      }

      permissionIds = perms.map(p => p._id);
    }

    // Creem el rol
    const role = await Role.create({
      name,
      description,
      permissions: permissionIds,
      level: level ?? 1,
      parentRole: parentRole || null
    });

    // Poblem els permisos per la resposta
    await role.populate("permissions", "name description category");

    res.status(201).json({
      success: true,
      message: "Rol creat correctament",
      data: role
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir tots els rols
 * GET /api/admin/roles
 */
async function getAllRoles(req, res, next) {
  try {
    const roles = await Role.findWithPermissions();

    res.json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir un rol per ID
 * GET /api/admin/roles/:id
 */
async function getRoleById(req, res, next) {
  try {
    const role = await Role.findById(req.params.id)
      .populate("permissions", "name description category");

    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    // Comptem quants usuaris tenen aquest rol
    const userCount = await User.countDocuments({ roles: role._id });

    res.json({
      success: true,
      data: {
        ...role.toJSON(),
        userCount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualitzar un rol
 * PUT /api/admin/roles/:id
 */
async function updateRole(req, res, next) {
  try {
    const { name, description, permissions } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    // No permetre modificar rols del sistema (admin, user)
    if (role.isSystem) {
      // NomÃ©s permetre canviar descripciÃ³ en rols del sistema
      if (name && name.toLowerCase() !== role.name) {
        return next(new ErrorResponse("No es pot renombrar un rol del sistema", 400));
      }
    }

    // Si s'intenta canviar el nom, verificar que no existeixi
    if (name && name.toLowerCase() !== role.name) {
      const exists = await Role.findOne({ name: name.toLowerCase() });
      if (exists) {
        return next(new ErrorResponse("Ja existeix un rol amb aquest nom", 400));
      }
      role.name = name;
    }

    // Actualitzar descripciÃ³
    if (description !== undefined) {
      role.description = description;
    }

    // Actualitzar permisos (nomÃ©s si no Ã©s rol del sistema o Ã©s admin)
    if (permissions !== undefined && !role.isSystem) {
      // Separem IDs de noms
      const mongoose = require("mongoose");
      const ids = permissions.filter(p => mongoose.isValidObjectId(p));
      const names = permissions.filter(p => !mongoose.isValidObjectId(p));
      
      const perms = await Permission.find({
        $or: [
          { _id: { $in: ids } },
          { name: { $in: names.map(p => p.toLowerCase()) } }
        ]
      });

      if (perms.length !== permissions.length) {
        return next(new ErrorResponse("Alguns permisos no existeixen", 400));
      }

      role.permissions = perms.map(p => p._id);
    }

    await role.save();
    await role.populate("permissions", "name description category");

    res.json({
      success: true,
      message: "Rol actualitzat correctament",
      data: role
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar un rol
 * DELETE /api/admin/roles/:id
 */
async function deleteRole(req, res, next) {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    // No permetre eliminar rols del sistema
    if (role.isSystem) {
      return next(new ErrorResponse("No es pot eliminar un rol del sistema", 400));
    }

    // Obtenim el rol per defecte (user) per reassignar usuaris
    const defaultRole = await Role.findOne({ name: "user" });
    
    if (!defaultRole) {
      return next(new ErrorResponse("Error: no s'ha trobat el rol per defecte", 500));
    }

    // Primer: eliminem el rol de tots els usuaris
    await User.updateMany(
      { roles: role._id },
      { $pull: { roles: role._id } }
    );

    // Després: afegim el rol per defecte als usuaris que s'han quedat sense cap rol
    await User.updateMany(
      { roles: { $size: 0 } },
      { $addToSet: { roles: defaultRole._id } }
    );

    // Eliminem el rol
    await role.deleteOne();

    res.json({
      success: true,
      message: "Rol eliminat correctament. Usuaris reassignats al rol 'user'."
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Afegir permisos a un rol
 * POST /api/admin/roles/:id/permissions
 */
async function addPermissionsToRole(req, res, next) {
  try {
    const { permissions } = req.body;
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    if (role.isSystem && role.name !== "admin") {
      return next(new ErrorResponse("No es poden modificar permisos de rols del sistema", 400));
    }

    // Busquem els permisos
    // Separem IDs de noms
    const mongoose = require("mongoose");
    const ids = permissions.filter(p => mongoose.isValidObjectId(p));
    const names = permissions.filter(p => !mongoose.isValidObjectId(p));
    
    const perms = await Permission.find({
      $or: [
        { _id: { $in: ids } },
        { name: { $in: names.map(p => p.toLowerCase()) } }
      ]
    });

    // Afegim nomÃ©s els que no existeixen
    for (const perm of perms) {
      if (!role.permissions.includes(perm._id)) {
        role.permissions.push(perm._id);
      }
    }

    await role.save();
    await role.populate("permissions", "name description category");

    res.json({
      success: true,
      message: "Permisos afegits correctament",
      data: role
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar permisos d'un rol
 * DELETE /api/admin/roles/:id/permissions
 */
async function removePermissionsFromRole(req, res, next) {
  try {
    const { permissions } = req.body;
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      return next(new ErrorResponse("Rol no trobat", 404));
    }

    if (role.isSystem) {
      return next(new ErrorResponse("No es poden modificar permisos de rols del sistema", 400));
    }

    // Busquem els permisos a eliminar
    // Separem IDs de noms
    const mongoose = require("mongoose");
    const ids = permissions.filter(p => mongoose.isValidObjectId(p));
    const names = permissions.filter(p => !mongoose.isValidObjectId(p));
    
    const perms = await Permission.find({
      $or: [
        { _id: { $in: ids } },
        { name: { $in: names.map(p => p.toLowerCase()) } }
      ]
    });

    const permIds = perms.map(p => p._id.toString());

    // Eliminem els permisos
    role.permissions = role.permissions.filter(
      p => !permIds.includes(p.toString())
    );

    await role.save();
    await role.populate("permissions", "name description category");

    res.json({
      success: true,
      message: "Permisos eliminats correctament",
      data: role
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obté recursivament tots els permisos heretats d'un rol
 * @param {string} roleId
 * @param {Set} visited - per evitar cicles
 */
async function collectInheritedPermissions(roleId, visited = new Set()) {
  if (!roleId || visited.has(String(roleId))) return [];
  visited.add(String(roleId));

  const role = await Role.findById(roleId).populate("permissions", "name description category");
  if (!role) return [];

  const perms = [...(role.permissions || [])];

  if (role.parentRole) {
    const parentPerms = await collectInheritedPermissions(role.parentRole, visited);
    perms.push(...parentPerms);
  }

  return perms;
}

/**
 * GET /api/roles/:id/hierarchy
 * Retorna la cadena de rols pare fins a l'arrel
 */
async function getRoleHierarchy(req, res, next) {
  try {
    const chain = [];
    let currentId = req.params.id;
    const visited = new Set();

    while (currentId && !visited.has(String(currentId))) {
      visited.add(String(currentId));
      const role = await Role.findById(currentId)
        .populate("permissions", "name")
        .populate("parentRole", "name level");

      if (!role) break;
      chain.push({
        _id: role._id,
        name: role.name,
        level: role.level,
        permissions: role.permissions.map(p => p.name),
        parentRole: role.parentRole ? { _id: role.parentRole._id, name: role.parentRole.name, level: role.parentRole.level } : null
      });
      currentId = role.parentRole?._id || null;
    }

    if (chain.length === 0) return next(new ErrorResponse("Rol no trobat", 404));

    res.json({ success: true, data: chain });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/roles/:id/permissions
 * Retorna permisos propis + heretats de la jerarquia
 */
async function getRoleAllPermissions(req, res, next) {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return next(new ErrorResponse("Rol no trobat", 404));

    const allPerms = await collectInheritedPermissions(req.params.id);

    // Deduplicar per nom
    const seen = new Set();
    const unique = allPerms.filter(p => {
      const key = p.name || String(p._id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      success: true,
      data: {
        role: role.name,
        level: role.level,
        permissions: unique
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  addPermissionsToRole,
  removePermissionsFromRole,
  getRoleHierarchy,
  getRoleAllPermissions
};