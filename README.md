# Backend SAI-B

## Descripción

Backend SAI-B es una aplicación de backend desarrollada en Node.js con TypeScript para el sistema SAI-B (Sistema de Administración de Información - Backend). Este proyecto implementa una arquitectura limpia (Clean Architecture) para la gestión de documentos, incluyendo funcionalidades de autenticación, subida de documentos PDF, versionado, comparación de versiones y gestión de usuarios.

El sistema permite a los usuarios autenticarse, subir documentos PDF, gestionar versiones de documentos, comparar diferencias entre versiones y realizar operaciones CRUD sobre documentos.

## Características

- **Autenticación JWT**: Sistema de login y autenticación basado en tokens JWT
- **Gestión de Documentos**: Subida, edición, eliminación y consulta de documentos PDF
- **Versionado de Documentos**: Sistema de versiones para documentos con historial
- **Comparación de Versiones**: Diferencias entre versiones de documentos usando el algoritmo de diff
- **Arquitectura Limpia**: Separación clara de responsabilidades con capas de dominio, aplicación, infraestructura y presentación
- **Base de Datos PostgreSQL**: Persistencia de datos en PostgreSQL
- **API RESTful**: Endpoints REST para todas las operaciones
- **Middleware de Seguridad**: CORS, Helmet para seguridad
- **Logging**: Morgan para logging de requests
- **File Upload**: Multer para manejo de archivos

## Tecnologías

### Backend
- **Node.js**: Entorno de ejecución
- **TypeScript**: Lenguaje de programación con tipado estático
- **Express.js**: Framework web para Node.js
- **PostgreSQL**: Base de datos relacional
- **JWT**: Autenticación basada en tokens
- **bcryptjs**: Hashing de contraseñas

### Dependencias Principales
- `express`: Framework web
- `pg`: Cliente PostgreSQL
- `jsonwebtoken`: Manejo de JWT
- `bcryptjs`: Encriptación de contraseñas
- `multer`: Manejo de uploads de archivos
- `pdf-parse`: Parsing de PDFs
- `diff`: Comparación de textos
- `cors`: Manejo de CORS
- `helmet`: Seguridad HTTP
- `morgan`: Logging HTTP
- `dotenv`: Variables de entorno

### Dependencias de Desarrollo
- `typescript`: Compilador TypeScript
- `nodemon`: Reinicio automático en desarrollo
- `tsx`: Ejecutor TypeScript
- `tsc-alias`: Alias de paths TypeScript
- `@types/*`: Tipos TypeScript

## Arquitectura

El proyecto sigue los principios de **Clean Architecture** con las siguientes capas:

### 1. Domain (Dominio)
- **Entities**: Entidades de negocio (User, Document, DocumentVersion)
- **Repositories**: Interfaces de repositorios (IDocumentRepository, IUserRepository)
- **Services**: Interfaces de servicios (IFileService, IPDFService)
- **Utils**: Utilidades del dominio (dateUtils)

### 2. Application (Aplicación)
- **Use Cases**: Casos de uso que implementan la lógica de negocio
- **DTOs**: Objetos de transferencia de datos

### 3. Infrastructure (Infraestructura)
- **Database**: Implementaciones de repositorios con PostgreSQL
- **Services**: Implementaciones de servicios externos (FileService, PdfService)

### 4. Presentation (Presentación)
- **Controllers**: Controladores HTTP
- **Routes**: Definición de rutas API
- **Middlewares**: Middleware de autenticación y upload

## Instalación

### Prerrequisitos
- Node.js (versión 18 o superior)
- pnpm (gestor de paquetes)
- PostgreSQL (base de datos)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/eguerreropropysol/SAI-B.git
   cd SAI-B
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**

   Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:
   ```env
   PORT=4000
   DB_HOST=localhost
   DB_USER=tu_usuario_postgres
   DB_PASSWORD=tu_contraseña_postgres
   DB_NAME=sai_db
   DB_PORT=5432
   JWT_SECRET=tu_clave_secreta_jwt
   ```

4. **Configurar la base de datos**

   Crear una base de datos PostgreSQL llamada `sai_db` y ejecutar los scripts de creación de tablas (si no se incluyen migraciones automáticas).

## Configuración

### Base de Datos

El proyecto utiliza PostgreSQL como base de datos. Las tablas principales son:

- **users**: Información de usuarios
- **documents**: Documentos principales
- **document_versions**: Versiones de documentos

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| PORT | Puerto del servidor | 4000 |
| DB_HOST | Host de la base de datos | localhost |
| DB_USER | Usuario de PostgreSQL | - |
| DB_PASSWORD | Contraseña de PostgreSQL | - |
| DB_NAME | Nombre de la base de datos | - |
| DB_PORT | Puerto de PostgreSQL | 5432 |
| JWT_SECRET | Clave secreta para JWT | - |

## Uso

### Desarrollo
```bash
pnpm run dev
```

### Producción
```bash
pnpm run build
pnpm start
```

### Scripts Disponibles
- `pnpm run dev`: Inicia el servidor en modo desarrollo con nodemon
- `pnpm run build`: Compila TypeScript a JavaScript
- `pnpm start`: Inicia el servidor en producción
- `pnpm test`: Ejecuta tests (no implementados aún)

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/profile` | Obtener perfil de usuario | Sí (JWT) |

### Documentos

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/documents` | Obtener todos los documentos | No |
| GET | `/api/documents/:id` | Obtener documento por ID | No |
| POST | `/api/documents/upload` | Subir nuevo documento | Sí (JWT) |
| PUT | `/api/documents/:id` | Editar documento | Sí (JWT) |
| DELETE | `/api/documents/:id` | Eliminar documento | Sí (JWT) |
| POST | `/api/documents/:id/version` | Subir nueva versión | Sí (JWT) |
| GET | `/api/documents/:id/compare` | Comparar versiones | Sí (JWT) |

### Ejemplos de Uso de la API

#### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "usuario", "password": "contraseña"}'
```

#### Subir Documento
```bash
curl -X POST http://localhost:4000/api/documents/upload \
  -H "Authorization: Bearer <token_jwt>" \
  -F "pdffile=@documento.pdf" \
  -F "title=Mi Documento" \
  -F "description=Descripción del documento"
```

## Estructura del Proyecto

```
backend-sai/
├── src/
│   ├── application/          # Casos de uso y DTOs
│   │   ├── dtos/
│   │   └── usecases/
│   ├── config/               # Configuración (DB, etc.)
│   ├── domain/               # Entidades, repositorios, servicios
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── services/
│   ├── infrastructure/       # Implementaciones concretas
│   │   ├── database/
│   │   └── services/
│   ├── presentation/         # Controladores, rutas, middlewares
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   └── routes/
│   ├── types/                # Tipos TypeScript
│   ├── app.ts                # Configuración Express
│   └── server.ts             # Punto de entrada
├── public/                   # Archivos estáticos
├── uploads/                  # Archivos subidos
├── dist/                     # Archivos compilados
├── package.json
├── tsconfig.json
└── README.md
```

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia ISC.

## Autor

Desarrollado por [eguerreropropysol](https://github.com/eguerreropropysol)

## Notas Adicionales

- El proyecto utiliza ES modules (`"type": "module"` en package.json)
- Los paths están configurados con `@/*` apuntando a `src/*`
- La aplicación se ejecuta en el puerto 4000 por defecto
- Los archivos subidos se almacenan en el directorio `uploads/`
- Se recomienda usar variables de entorno para configuración sensible
# sai-backend
