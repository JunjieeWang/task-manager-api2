/** task-manager-api/models/Task.js */
/**
 * Model de Tasca (Task)
 * Defineix l'esquema i el model de Mongoose per a les tasques
 */

const mongoose = require("mongoose");

/**
 * Esquema de Tasca
 * - user: Referència a l'usuari propietari (ObjectId)
 * - title: Títol de la tasca (obligatori)
 * - description: Descripció detallada (opcional)
 * - cost: Cost estimat o real (opcional, per defecte 0)
 * - hours_estimated: Hores estimades (opcional, per defecte 0)
 * - completed: Estat de completitud (Boolean, per defecte false)
 * - image: URL o base64 de la imatge (opcional, String buit per defecte)
 * - timestamps: Afegeix createdAt i updatedAt automàticament
 */
const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "L'usuari és obligatori"],
      index: true, // Índex per millorar les consultes per usuari
    },
    title: {
      type: String,
      required: [true, "El títol és obligatori"],
      trim: true,
      maxlength: [200, "El títol no pot superar els 200 caràcters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "La descripció no pot superar els 1000 caràcters"],
      default: "",
    },
    cost: {
      type: Number,
      min: [0, "El cost no pot ser negatiu"],
      default: 0,
    },
    hours_estimated: {
      type: Number,
      min: [0, "Les hores estimades no poden ser negatives"],
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // Afegeix createdAt i updatedAt automàticament
  }
);

/**
 * Índex compost per millorar les consultes
 * Cerques per usuari i estat de completitud són comunes
 */
taskSchema.index({ user: 1, completed: 1 });

/**
 * Índex per ordenar per data de creació
 */
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Task", taskSchema);