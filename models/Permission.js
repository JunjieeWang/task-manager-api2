/** task-manager-api/models/Permission.js */
/**
 * Model de Permís (Permission)
 * Defineix els permisos granulars del sistema
 * 
 * Cada permís representa una acció específica que es pot realitzar
 * Format del nom: "recurs:acció" (ex: tasks:create, users:manage)
 */

const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    // Nom únic del permís (format: recurs:acció)
    name: {
      type: String,
      required: [true, "Nom del permís requerit"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z]+:[a-z]+$/, "Format invàlid. Usar: recurs:acció (ex: tasks:create)"]
    },

    // Descripció del que permet fer aquest permís
    description: {
      type: String,
      required: [true, "Descripció requerida"],
      trim: true
    },

    // Categoria per agrupar permisos (tasks, users, roles, etc.)
    category: {
      type: String,
      required: [true, "Categoria requerida"],
      trim: true,
      lowercase: true
    },

    // Indica si és un permís del sistema (no es pot eliminar)
    isSystem: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Índex per cercar per categoria
permissionSchema.index({ category: 1 });

// Mètode estàtic per obtenir permisos agrupats per categoria
permissionSchema.statics.getByCategory = async function() {
  const permissions = await this.find().sort({ category: 1, name: 1 });
  
  // Agrupem per categoria
  const grouped = {};
  for (const perm of permissions) {
    if (!grouped[perm.category]) {
      grouped[perm.category] = [];
    }
    grouped[perm.category].push(perm);
  }
  
  return grouped;
};

module.exports = mongoose.model("Permission", permissionSchema);
