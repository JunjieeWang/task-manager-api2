/** task-manager-api/models/Role.js */
/**
 * Model de Rol (Role)
 * Defineix els rols del sistema amb els seus permisos associats
 * 
 * Un rol és una col·lecció de permisos que es pot assignar a usuaris
 * Els rols del sistema (admin, user) no es poden eliminar ni renombrar
 */

const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    // Nom únic del rol
    name: {
      type: String,
      required: [true, "Nom del rol requerit"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "El nom ha de tenir mínim 2 caràcters"],
      maxlength: [30, "El nom ha de tenir màxim 30 caràcters"]
    },

    // Descripció del rol
    description: {
      type: String,
      required: [true, "Descripció requerida"],
      trim: true,
      maxlength: [200, "La descripció ha de tenir màxim 200 caràcters"]
    },

    // Array de referències a permisos
    permissions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission"
    }],

    // Nivell jeràrquic: VIEWER(1) < USER(2) < MANAGER(3) < ADMIN(4) < SUPER_ADMIN(5)
    level: {
      type: Number,
      default: 1,
      min: 1
    },

    // Rol pare del qual hereta permisos
    parentRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null
    },

    // Indica si és un rol del sistema (no es pot eliminar ni renombrar)
    isSystem: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Mètode d'instància per obtenir els noms dels permisos
roleSchema.methods.getPermissionNames = async function() {
  await this.populate("permissions", "name");
  return this.permissions.map(p => p.name);
};

// Mètode estàtic per trobar rol amb permisos poblats
roleSchema.statics.findWithPermissions = async function(query = {}) {
  return this.find(query).populate("permissions", "name description category");
};

// Mètode estàtic per trobar un rol per nom amb permisos
roleSchema.statics.findByName = async function(name) {
  return this.findOne({ name: name.toLowerCase() }).populate("permissions", "name description category");
};

// Virtual per comptar permisos
roleSchema.virtual("permissionCount").get(function() {
  return this.permissions ? this.permissions.length : 0;
});

// Assegurar que els virtuals s'inclouen al JSON
roleSchema.set("toJSON", { virtuals: true });
roleSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Role", roleSchema);
