/** task-manager-api/controllers/authController.js */
/**
 * Controlador d'Autenticació (authController) - VERSIÓ T8
 * 
 * CANVIS RESPECTE T7:
 * - Afegit endpoint checkPermission per verificar permisos
 * - Register ara assigna el rol 'user' per defecte
 * - Respostes inclouen els rols de l'usuari
 */

const User = require("../models/User");
const Role = require("../models/Role");
const ErrorResponse = require("../utils/errorResponse");
const generateToken = require("../utils/generateToken");

/**
 * Registre d'usuaris
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Comprovem si l'email ja existeix
    const exists = await User.findOne({ email });
    if (exists) {
      return next(new ErrorResponse("Email ja registrat", 400));
    }

    // Obtenim el rol 'user' per defecte
    const defaultRole = await Role.findOne({ name: "user" });
    if (!defaultRole) {
      return next(new ErrorResponse("Error de configuració: rol 'user' no trobat. Executa el seed.", 500));
    }

    // Creem el nou usuari amb el rol per defecte
    const user = await User.create({ 
      name, 
      email, 
      password,
      roles: [defaultRole._id],
      role: "user" // Camp legacy
    });

    // Generem el token
    const token = generateToken(user);

    // Obtenim els permisos per la resposta
    await user.populate({
      path: "roles",
      populate: {
        path: "permissions",
        select: "name"
      }
    });

    const permissions = [];
    for (const role of user.roles) {
      for (const perm of role.permissions) {
        if (!permissions.includes(perm.name)) {
          permissions.push(perm.name);
        }
      }
    }

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles.map(r => r.name),
        permissions,
        role: user.role // Legacy
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Inici de sessió (Login)
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Busquem l'usuari amb contrasenya i rols
    const user = await User.findOne({ email })
      .select("+password")
      .populate({
        path: "roles",
        populate: {
          path: "permissions",
          select: "name"
        }
      });
    
    if (!user) {
      return next(new ErrorResponse("Credencials invàlides", 401));
    }

    // Comparem la contrasenya
    const ok = await user.comparePassword(password);
    if (!ok) {
      return next(new ErrorResponse("Credencials invàlides", 401));
    }

    // Generem el token
    const token = generateToken(user);

    // Obtenim els permisos
    const permissions = [];
    for (const role of user.roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          if (!permissions.includes(perm.name)) {
            permissions.push(perm.name);
          }
        }
      }
    }

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles.map(r => r.name),
        permissions,
        role: user.role // Legacy
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Obtenir perfil de l'usuari actual
 * GET /api/auth/me
 */
async function getMe(req, res) {
  return res.json({ 
    success: true, 
    user: req.user 
  });
}

/**
 * Actualitzar perfil d'usuari
 * PUT /api/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    const { name, email } = req.body;

    if (email) {
      const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (exists) {
        return next(new ErrorResponse("Email ja en ús", 400));
      }
    }

    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;

    const updated = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    }).populate("roles", "name");

    if (!updated) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    return res.json({
      success: true,
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        roles: updated.roles.map(r => r.name),
        role: updated.role
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Canviar contrasenya
 * PUT /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    
    if (!user) {
      return next(new ErrorResponse("Usuari no trobat", 404));
    }

    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      return next(new ErrorResponse("currentPassword incorrecte", 401));
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: "Password actualitzat" });
  } catch (err) {
    return next(err);
  }
}

/**
 * Verificar si l'usuari té un permís específic
 * POST /api/auth/check-permission
 */
async function checkPermission(req, res, next) {
  try {
    const { permission } = req.body;

    if (!permission) {
      return next(new ErrorResponse("Cal especificar el permís a verificar", 400));
    }

    // req.user.permissions ja hauria d'estar carregat pel middleware auth
    const hasPermission = req.user.permissions && req.user.permissions.includes(permission);

    if (hasPermission) {
      return res.json({
        success: true,
        hasPermission: true,
        message: "Tens permís per fer aquesta acció"
      });
    } else {
      return res.status(403).json({
        success: false,
        hasPermission: false,
        message: "No tens permís per fer aquesta acció"
      });
    }
  } catch (err) {
    return next(err);
  }
}

/**
 * Obtenir tots els permisos de l'usuari actual
 * GET /api/auth/my-permissions
 */
async function getMyPermissions(req, res) {
  return res.json({
    success: true,
    data: {
      roles: req.user.roles,
      permissions: req.user.permissions
    }
  });
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  checkPermission,
  getMyPermissions
};
