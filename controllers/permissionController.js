/** task-manager-api/controllers/permissionController.js */
/**
 * Controlador de Permisos (permissionController)
 * Gestiona el CRUD de permisos:
 * - Crear nous permisos
 * - Llistar permisos
 * - Obtenir detalls d'un permís
 * - Actualitzar permisos
 * - Eliminar permisos
 * - Obtenir categories
 */

const Permission = require("../models/Permission");
const Role = require("../models/Role");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Crear un nou permís
 * POST /api/admin/permissions
 */
async function createPermission(req, res, next) {
  try {
    const { name, description, category } = req.body;

    // Comprovem si el nom ja existeix
    const exists = await Permission.findOne({ name: name.toLowerCase() });
    if (exists) {
      return next(new ErrorResponse("Ja existeix un permís amb aquest nom", 400));
    }

    // Creem el permís
    const permission = await Permission.create({
      name,
      description,
      category
    });

    res.status(201).json({
      success: true,
      message: "Permís creat correctament",
      data: permission
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir tots els permisos
 * GET /api/admin/permissions
 */
async function getAllPermissions(req, res, next) {
  try {
    const { category, grouped } = req.query;

    // Si es demana agrupat per categoria
    if (grouped === "true") {
      const permissions = await Permission.getByCategory();
      return res.json({
        success: true,
        data: permissions
      });
    }

    // Filtrar per categoria si s'especifica
    const filter = category ? { category: category.toLowerCase() } : {};
    const permissions = await Permission.find(filter).sort({ category: 1, name: 1 });

    res.json({
      success: true,
      count: permissions.length,
      data: permissions
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir categories de permisos
 * GET /api/admin/permissions/categories
 */
async function getPermissionCategories(req, res, next) {
  try {
    const categories = await Permission.distinct("category");

    res.json({
      success: true,
      data: categories.sort()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir un permís per ID
 * GET /api/admin/permissions/:id
 */
async function getPermissionById(req, res, next) {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return next(new ErrorResponse("Permís no trobat", 404));
    }

    // Comptem quants rols tenen aquest permís
    const roleCount = await Role.countDocuments({ permissions: permission._id });

    res.json({
      success: true,
      data: {
        ...permission.toJSON(),
        roleCount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualitzar un permís
 * PUT /api/admin/permissions/:id
 */
async function updatePermission(req, res, next) {
  try {
    const { description, category } = req.body;

    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return next(new ErrorResponse("Permís no trobat", 404));
    }

    // No permetre modificar permisos del sistema
    if (permission.isSystem) {
      // Només permetre canviar descripció
      if (category && category.toLowerCase() !== permission.category) {
        return next(new ErrorResponse("No es pot canviar la categoria d'un permís del sistema", 400));
      }
    }

    // Actualitzar camps permesos
    if (description !== undefined) {
      permission.description = description;
    }
    if (category !== undefined && !permission.isSystem) {
      permission.category = category;
    }

    await permission.save();

    res.json({
      success: true,
      message: "Permís actualitzat correctament",
      data: permission
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar un permís
 * DELETE /api/admin/permissions/:id
 */
async function deletePermission(req, res, next) {
  try {
    const permission = await Permission.findById(req.params.id);
    
    if (!permission) {
      return next(new ErrorResponse("Permís no trobat", 404));
    }

    // No permetre eliminar permisos del sistema
    if (permission.isSystem) {
      return next(new ErrorResponse("No es pot eliminar un permís del sistema", 400));
    }

    // Eliminem el permís de tots els rols que el tinguin
    await Role.updateMany(
      { permissions: permission._id },
      { $pull: { permissions: permission._id } }
    );

    // Eliminem el permís
    await permission.deleteOne();

    res.json({
      success: true,
      message: "Permís eliminat correctament"
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir rols que tenen un permís específic
 * GET /api/admin/permissions/:id/roles
 */
async function getRolesWithPermission(req, res, next) {
  try {
    const permission = await Permission.findById(req.params.id);
    
    if (!permission) {
      return next(new ErrorResponse("Permís no trobat", 404));
    }

    const roles = await Role.find({ permissions: permission._id })
      .select("name description isSystem");

    res.json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPermission,
  getAllPermissions,
  getPermissionCategories,
  getPermissionById,
  updatePermission,
  deletePermission,
  getRolesWithPermission
};
