/** task-manager-api/models/User.js */
/**
 * Model d'Usuari (User) - VERSIÓ T8
 * Defineix l'esquema de la col·lecció d'usuaris a MongoDB
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Definició de l'esquema d'usuari
const userSchema = new mongoose.Schema(
  {
    // Nom de l'usuari (opcional)
    name: { 
      type: String, 
      trim: true,
      default: ""
    },
    
    // Email de l'usuari (obligatori i únic)
    email: {
      type: String,
      required: [true, "Email requerit"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    
    // Contrasenya de l'usuari (obligatòria, mínim 6 caràcters)
    password: {
      type: String,
      required: [true, "Password requerit"],
      minlength: [6, "Password mínim 6 caràcters"],
      select: false,  // No s'inclou per defecte a les consultes
    },
    
    // CANVI T8: Array de rols en lloc d'un sol rol
    // Un usuari pot tenir múltiples rols
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role"
    }],

    // Camp legacy per compatibilitat (opcional)
    // Pots eliminar-lo si no necessites compatibilitat amb T7
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  { 
    timestamps: true
  }
);

/**
 * Middleware pre-save: Xifra la contrasenya abans de guardar
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

/**
 * Mètode d'instància: Compara una contrasenya en text pla amb la xifrada
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

/**
 * MÈTODE NOU T8: Obté tots els permisos de l'usuari
 * Combina els permisos de tots els seus rols
 * @returns {Promise<string[]>} Array de noms de permisos
 */
userSchema.methods.getAllPermissions = async function() {
  // Poblem els rols amb els seus permisos
  await this.populate({
    path: "roles",
    populate: {
      path: "permissions",
      select: "name"
    }
  });

  // Recollim tots els permisos de tots els rols
  const permissionSet = new Set();
  
  for (const role of this.roles) {
    if (role.permissions) {
      for (const perm of role.permissions) {
        permissionSet.add(perm.name);
      }
    }
  }

  return Array.from(permissionSet);
};

/**
 * MÈTODE NOU T8: Verifica si l'usuari té un permís específic
 * @param {string} permissionName - Nom del permís a verificar
 * @returns {Promise<boolean>} True si té el permís
 */
userSchema.methods.hasPermission = async function(permissionName) {
  const permissions = await this.getAllPermissions();
  return permissions.includes(permissionName);
};

/**
 * MÈTODE NOU T8: Verifica si l'usuari té algun dels permisos especificats
 * @param {string[]} permissionNames - Array de noms de permisos
 * @returns {Promise<boolean>} True si té almenys un dels permisos
 */
userSchema.methods.hasAnyPermission = async function(permissionNames) {
  const permissions = await this.getAllPermissions();
  return permissionNames.some(p => permissions.includes(p));
};

/**
 * MÈTODE NOU T8: Verifica si l'usuari té tots els permisos especificats
 * @param {string[]} permissionNames - Array de noms de permisos
 * @returns {Promise<boolean>} True si té tots els permisos
 */
userSchema.methods.hasAllPermissions = async function(permissionNames) {
  const permissions = await this.getAllPermissions();
  return permissionNames.every(p => permissions.includes(p));
};

/**
 * MÈTODE NOU T8: Obté els noms dels rols de l'usuari
 * @returns {Promise<string[]>} Array de noms de rols
 */
userSchema.methods.getRoleNames = async function() {
  await this.populate("roles", "name");
  return this.roles.map(r => r.name);
};

/**
 * Transformació toJSON: Elimina la contrasenya quan es serialitza
 */
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
