# 📁 Estructura de Fitxers T8 - Sistema Avançat de Rols i Permisos

```
task-manager-api/
│
├── 📄 .env                          # Variables d'entorn
├── 📄 .gitignore                    # Fitxers a ignorar
├── 📄 package.json                  # Dependències
├── 📄 app.js                        # ⚠️ MODIFICAT - Noves rutes
│
├── 📁 models/
│   ├── 📄 User.js                   # ⚠️ MODIFICAT - roles: [ObjectId]
│   ├── 📄 Task.js                   # ✅ Sense canvis
│   ├── 📄 Role.js                   # 🆕 NOU - Model de rols
│   ├── 📄 Permission.js             # 🆕 NOU - Model de permisos
│   └── 📄 AuditLog.js               # 🆕 NOU - Model d'auditoria
│
├── 📁 controllers/
│   ├── 📄 authController.js         # ⚠️ MODIFICAT - checkPermission endpoint
│   ├── 📄 taskController.js         # ✅ Sense canvis (auditoria via middleware)
│   ├── 📄 adminController.js        # 🆕 NOU - Gestió d'usuaris
│   ├── 📄 roleController.js         # 🆕 NOU - CRUD de rols
│   ├── 📄 permissionController.js   # 🆕 NOU - CRUD de permisos
│   └── 📄 auditController.js        # 🆕 NOU - Consulta d'auditoria
│
├── 📁 middleware/
│   ├── 📄 auth.js                   # ⚠️ MODIFICAT - Carregar rols i permisos
│   ├── 📄 checkPermission.js        # 🆕 NOU - Verificar permisos dinàmics
│   ├── 📄 auditLog.js               # 🆕 NOU - Registrar accions
│   ├── 📄 errorHandler.js           # ✅ Sense canvis
│   └── 📄 validators/
│       ├── 📄 _common.js            # ✅ Sense canvis
│       ├── 📄 authValidators.js     # ✅ Sense canvis
│       ├── 📄 taskValidators.js     # ✅ Sense canvis
│       ├── 📄 roleValidators.js     # 🆕 NOU - Validadors de rols
│       └── 📄 permissionValidators.js # 🆕 NOU - Validadors de permisos
│
├── 📁 routes/
│   ├── 📄 authRoutes.js             # ⚠️ MODIFICAT - Nou endpoint check-permission
│   ├── 📄 taskRoutes.js             # ⚠️ MODIFICAT - checkPermission middleware
│   └── 📄 adminRoutes.js            # ⚠️ MODIFICAT - Rutes de rols/permisos/audit
│
├── 📁 utils/
│   ├── 📄 errorResponse.js          # ✅ Sense canvis
│   ├── 📄 generateToken.js          # ✅ Sense canvis
│   └── 📄 seedData.js               # 🆕 NOU - Crear permisos i rols per defecte
│
└── 📄 seed.js                       # 🆕 NOU - Script per executar el seed
```

## 📊 Resum de Canvis

| Tipus | Quantitat |
|-------|-----------|
| 🆕 Fitxers nous | 12 |
| ⚠️ Fitxers modificats | 6 |
| ✅ Fitxers sense canvis | 7 |

## 🔑 Permisos del Sistema

```
tasks:create    - Crear tasques
tasks:read      - Veure tasques
tasks:update    - Editar tasques
tasks:delete    - Eliminar tasques
users:read      - Veure usuaris
users:manage    - Gestionar usuaris
roles:read      - Veure rols
roles:manage    - Gestionar rols
permissions:read    - Veure permisos
permissions:manage  - Gestionar permisos
audit:read      - Veure auditoria
```

## 👥 Rols per Defecte

| Rol | Permisos | Editable? |
|-----|----------|-----------|
| admin | TOTS | ❌ No |
| user | tasks:create, tasks:read, tasks:update, tasks:delete | ❌ No |
| viewer | tasks:read | ✅ Sí |
| editor | tasks:create, tasks:read, tasks:update, tasks:delete | ✅ Sí |
