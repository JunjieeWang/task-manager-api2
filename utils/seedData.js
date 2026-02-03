/** task-manager-api/utils/seedData.js */
/**
 * Seed Data - Crear permisos, rols i usuaris per defecte
 * 
 * Executa aquest script un cop per inicialitzar el sistema amb:
 * - Permisos del sistema
 * - Rols per defecte (admin, user, viewer, editor)
 * - Usuaris de prova (admin, editor, user)
 */

const Permission = require("../models/Permission");
const Role = require("../models/Role");
const User = require("../models/User");

/**
 * Permisos del sistema
 */
const SYSTEM_PERMISSIONS = [
  // Permisos de tasques
  { name: "tasks:create", description: "Crear noves tasques", category: "tasks", isSystem: true },
  { name: "tasks:read", description: "Veure tasques", category: "tasks", isSystem: true },
  { name: "tasks:update", description: "Editar tasques", category: "tasks", isSystem: true },
  { name: "tasks:delete", description: "Eliminar tasques", category: "tasks", isSystem: true },
  
  // Permisos d'usuaris
  { name: "users:read", description: "Veure llista d'usuaris", category: "users", isSystem: true },
  { name: "users:manage", description: "Gestionar usuaris (crear, eliminar, modificar)", category: "users", isSystem: true },
  
  // Permisos de rols
  { name: "roles:read", description: "Veure rols disponibles", category: "roles", isSystem: true },
  { name: "roles:manage", description: "Gestionar rols (crear, eliminar, modificar)", category: "roles", isSystem: true },
  
  // Permisos de permisos
  { name: "permissions:read", description: "Veure permisos disponibles", category: "permissions", isSystem: true },
  { name: "permissions:manage", description: "Gestionar permisos (crear, eliminar, modificar)", category: "permissions", isSystem: true },
  
  // Permisos d'auditoria
  { name: "audit:read", description: "Veure registres d'auditoria", category: "audit", isSystem: true }
];

/**
 * Rols per defecte del sistema
 */
const SYSTEM_ROLES = [
  {
    name: "admin",
    description: "Administrador amb tots els permisos",
    permissions: "ALL", // Especial: assignem tots els permisos
    isSystem: true
  },
  {
    name: "user",
    description: "Usuari estàndard amb permisos de tasques",
    permissions: ["tasks:create", "tasks:read", "tasks:update", "tasks:delete"],
    isSystem: true
  },
  {
    name: "viewer",
    description: "Usuari amb només permisos de lectura",
    permissions: ["tasks:read"],
    isSystem: false
  },
  {
    name: "editor",
    description: "Usuari amb permisos complets de tasques i lectura d'usuaris",
    permissions: ["tasks:create", "tasks:read", "tasks:update", "tasks:delete", "users:read"],
    isSystem: false
  }
];

/**
 * Crea els permisos del sistema si no existeixen
 */
async function seedPermissions() {
  console.log("Creant permisos del sistema...");
  
  const created = [];
  const existing = [];
  
  for (const permData of SYSTEM_PERMISSIONS) {
    const exists = await Permission.findOne({ name: permData.name });
    
    if (exists) {
      existing.push(permData.name);
    } else {
      await Permission.create(permData);
      created.push(permData.name);
    }
  }
  
  console.log(`Permisos creats: ${created.length}`);
  console.log(`Permisos existents: ${existing.length}`);
  
  return { created, existing };
}

/**
 * Crea els rols del sistema si no existeixen
 */
async function seedRoles() {
  console.log("👥 Creant rols del sistema...");
  
  const created = [];
  const existing = [];
  
  // Obtenim tots els permisos per l'admin
  const allPermissions = await Permission.find();
  const allPermissionIds = allPermissions.map(p => p._id);
  
  for (const roleData of SYSTEM_ROLES) {
    const exists = await Role.findOne({ name: roleData.name });
    
    if (exists) {
      existing.push(roleData.name);
    } else {
      // Determinem quins permisos assignar
      let permissionIds;
      
      if (roleData.permissions === "ALL") {
        permissionIds = allPermissionIds;
      } else {
        const perms = await Permission.find({ name: { $in: roleData.permissions } });
        permissionIds = perms.map(p => p._id);
      }
      
      await Role.create({
        name: roleData.name,
        description: roleData.description,
        permissions: permissionIds,
        isSystem: roleData.isSystem
      });
      
      created.push(roleData.name);
    }
  }
  
  console.log(`Rols creats: ${created.length}`);
  console.log(`Rols existents: ${existing.length}`);
  
  return { created, existing };
}

/**
 * Actualitza usuaris existents sense rols per assignar-los el rol 'user'
 */
async function migrateUsersWithoutRoles() {
  console.log("Migrant usuaris sense rols...");
  
  const userRole = await Role.findOne({ name: "user" });
  const adminRole = await Role.findOne({ name: "admin" });
  
  if (!userRole || !adminRole) {
    console.log("No s'han trobat els rols bàsics. Executa seedRoles primer.");
    return { migrated: 0 };
  }
  
  // Busquem usuaris sense rols o amb array buit
  const usersWithoutRoles = await User.find({
    $or: [
      { roles: { $exists: false } },
      { roles: { $size: 0 } }
    ]
  });
  
  let migrated = 0;
  
  for (const user of usersWithoutRoles) {
    // Assignem rol segons el camp legacy 'role'
    if (user.role === "admin") {
      user.roles = [adminRole._id];
    } else {
      user.roles = [userRole._id];
    }
    
    await user.save();
    migrated++;
  }
  
  console.log(`Usuaris migrats: ${migrated}`);
  
  return { migrated };
}

/**
 * Crea usuaris de prova si no existeixen
 */
async function seedTestUsers() {
  console.log("👤 Creant usuaris de prova...");
  
  const adminRole = await Role.findOne({ name: "admin" });
  const userRole = await Role.findOne({ name: "user" });
  const editorRole = await Role.findOne({ name: "editor" });
  
  if (!adminRole || !userRole || !editorRole) {
    console.log("No s'han trobat els rols bàsics. Executa seedRoles primer.");
    return { created: 0, existing: 0 };
  }
  
  const testUsers = [
    {
      name: "Admin",
      email: "admin@example.com",
      password: "admin123",
      roles: [adminRole._id],
      role: "admin"
    },
    {
      name: "Editor",
      email: "editor@example.com",
      password: "editor123",
      roles: [editorRole._id],
      role: "user"
    },
    {
      name: "User",
      email: "user@example.com",
      password: "user123",
      roles: [userRole._id],
      role: "user"
    }
  ];
  
  let created = 0;
  let existing = 0;
  
  for (const userData of testUsers) {
    const exists = await User.findOne({ email: userData.email });
    
    if (exists) {
      existing++;
      console.log(`   ℹ️  ${userData.email} ja existeix`);
    } else {
      await User.create(userData);
      created++;
      console.log(`Creat: ${userData.email} (password: ${userData.password})`);
    }
  }
  
  console.log(`   Usuaris nous: ${created}`);
  console.log(`   ℹ️  Usuaris existents: ${existing}`);
  
  return { created, existing };
}

/**
 * Executa tot el seed
 */
async function runSeed() {
  console.log("\n========================================");
  console.log("INICIANT SEED DEL SISTEMA T8");
  console.log("========================================\n");
  
  try {
    // 1. Crear permisos
    const permResults = await seedPermissions();
    
    // 2. Crear rols
    const roleResults = await seedRoles();
    
    // 3. Migrar usuaris existents
    const migrateResults = await migrateUsersWithoutRoles();
    
    // 4. Crear usuaris de prova
    const userResults = await seedTestUsers();
    
    console.log("\n========================================");
    console.log("SEED COMPLETAT AMB ÈXIT");
    console.log("========================================");
    console.log(`   Permisos nous: ${permResults.created.length}`);
    console.log(`   Rols nous: ${roleResults.created.length}`);
    console.log(`   Usuaris migrats: ${migrateResults.migrated}`);
    console.log(`   Usuaris de prova creats: ${userResults.created}`);
    console.log("========================================");
    console.log("\nCREDENCIALS DE PROVA:");
    console.log("   Admin:  admin@example.com / admin123");
    console.log("   Editor: editor@example.com / editor123");
    console.log("   User:   user@example.com / user123");
    console.log("========================================\n");
    
    return {
      success: true,
      permissions: permResults,
      roles: roleResults,
      migratedUsers: migrateResults,
      testUsers: userResults
    };
  } catch (error) {
    console.error("\nERROR EN EL SEED:", error.message);
    throw error;
  }
}

module.exports = {
  seedPermissions,
  seedRoles,
  migrateUsersWithoutRoles,
  seedTestUsers,
  runSeed,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES
};