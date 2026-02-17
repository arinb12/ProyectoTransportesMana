# Architectural Patterns and Design Conventions

## Table of Contents

1. [Introduction](#introduction)
2. [Dependency Injection Patterns](#dependency-injection-patterns)
3. [API Design Patterns](#api-design-patterns)
4. [Data Access Patterns](#data-access-patterns)
5. [MVC Frontend Patterns](#mvc-frontend-patterns)
6. [Authentication & Authorization](#authentication--authorization)
7. [Cross-Cutting Concerns](#cross-cutting-concerns)
8. [Naming Conventions](#naming-conventions)
9. [Code Organization](#code-organization)
10. [Best Practices to Follow](#best-practices-to-follow)

---

## Introduction

This document describes architectural patterns, design decisions, and conventions used consistently across the ProyectoTransportesMana codebase. These patterns have been identified by analyzing the implementation across multiple files and represent the established way of doing things in this project.

**Scope**: Only patterns used in 2+ files are documented here to ensure they represent true conventions rather than one-off implementations.

**Purpose**: Guide AI assistants and developers in making changes that are consistent with the existing codebase architecture.

---

## Dependency Injection Patterns

### Service Registration in Program.cs

Both projects use constructor-based dependency injection configured in Program.cs.

**API Project** (ProyectoTransportesManaAPI/Program.cs):
- Line 1-23: Standard ASP.NET Core DI setup
- Controllers, JSON serialization, Swagger, authentication services

**Web Project** (ProyectoTransportesMana/Program.cs):
- Line 1-9: MVC services with session support
- Line 24-43: HttpClient factory with custom configuration
- Line 45-54: Application services (EmailService, etc.)

### HttpClient Factory Pattern

**Location**: ProyectoTransportesMana/Program.cs:24-43

The web application uses IHttpClientFactory to manage HTTP clients for API communication:

```csharp
builder.Services.AddHttpClient("APIClient", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["ApiBaseUrl"]);
    // Configuration for timeout, headers, etc.
});
```

**Used in**:
- HomeController.cs (multiple API calls)
- AsistenciaController.cs (attendance API calls)
- GestionUsuariosController.cs (user management API calls)
- All MVC controllers that communicate with the API

**Pattern**: Controllers inject IHttpClientFactory, create named clients, and automatically include JWT tokens from session.

### Options Pattern for Configuration

**EmailSettings Configuration**:
- ProyectoTransportesMana/Models/EmailSettings.cs:5-15
- Registered in Program.cs:45-47
- Injected as IOptions<EmailSettings> in EmailService

**JWT Configuration**:
- Configured via IConfiguration in API Program.cs
- Accessed as configuration values, not strongly-typed options

**Pattern**: Use Options pattern for complex configuration sections that require validation or multiple related properties.

---

## API Design Patterns

### RESTful Route Naming

**Convention**: `/api/v1/{resource}`

**Examples**:
- `[Route("api/v1/[controller]")]` - Standard pattern used across all API controllers
- AsistenciaController.cs:7
- AlertasController.cs:10
- AutobusController.cs:10
- CuentaController.cs:11
- All 15 API controllers follow this pattern

### Authorization Pattern

**JWT Bearer Authentication**:
- Configured in ProyectoTransportesManaAPI/Program.cs:24-37
- Applied via `[Authorize]` attribute on controllers or actions
- Global authorization policy requires authenticated users by default

**Examples**:
- AlertasController.cs:9 `[Authorize]`
- AsistenciaController.cs:6 `[Authorize]`
- AutobusController.cs:9 `[Authorize]`
- CuentaController.cs:10 (mixed - some actions allow anonymous)

**Pattern**: Apply `[Authorize]` at controller level, use `[AllowAnonymous]` for specific actions like login/register.

### API Response Patterns

**Success Responses**:
- 200 OK - Successful GET/PUT operations with data
- 201 Created - Successful POST operations (e.g., AutobusController.cs:45)
- 204 No Content - Successful DELETE operations
- 200 OK with boolean/object - Update operations

**Error Responses**:
- 400 Bad Request - Validation errors, invalid model state
- 404 Not Found - Resource not found
- 500 Internal Server Error - Unhandled exceptions

**Examples**:
- AutobusController.cs:57 `return NotFound("Autobús no encontrado")`
- CuentaController.cs:68 `return BadRequest("Usuario o contraseña incorrectos")`
- AlertasController.cs:49 `return StatusCode(500, "Error interno del servidor")`

**Pattern**: Return appropriate HTTP status codes with descriptive messages. Use ProblemDetails for structured error responses.

### Model Validation Pattern

**Location**: All API controllers

**Pattern**:
```csharp
if (!ModelState.IsValid)
{
    return BadRequest(ModelState);
}
```

**Examples**:
- CuentaController.cs:51-54
- EstudianteController.cs:32-35
- Multiple controllers validate input using data annotations

**Convention**: Check ModelState.IsValid before processing requests. Return 400 Bad Request with validation errors.

---

## Data Access Patterns

### Connection Management with Dapper

**Pattern**: Use `using var con = new SqlConnection(connectionString)` for automatic disposal.

**Examples**:
- AsistenciaController.cs:27 `using var con = new SqlConnection(_connectionString);`
- AlertasController.cs:24
- AutobusController.cs:19
- Consistent across all 15 API controllers

**Convention**: Never store or reuse SqlConnection instances. Create new connections per request and rely on connection pooling.

### Stored Procedure Execution (Primary Pattern)

**Pattern**: Use Dapper's QueryAsync/ExecuteAsync with stored procedure command type.

**Examples**:

**Query with Results**:
```csharp
var result = await con.QueryAsync<AlertaDto>(
    "sp_obtener_alertas",
    commandType: CommandType.StoredProcedure
);
```
- AlertasController.cs:26-29
- AutobusController.cs:21-24
- EstudianteController.cs:24-27

**Execute without Results**:
```csharp
await con.ExecuteAsync(
    "sp_registrar_asistencia",
    parametros,
    commandType: CommandType.StoredProcedure
);
```
- AsistenciaController.cs:29-32
- CuentaController.cs:106-109

**Pattern**: Prefer stored procedures over raw SQL for business logic. Use raw SQL only for simple queries.

### Parameter Binding Patterns

**Anonymous Objects (Simple Parameters)**:
```csharp
var parameters = new {
    Usuario = loginRequest.Usuario,
    Contrasena = hashedPassword
};
```
- CuentaController.cs:64-67
- Simple parameter passing for stored procedures

**DynamicParameters (Complex Scenarios)**:
```csharp
var parametros = new DynamicParameters();
parametros.Add("@TipoTabla", tablaAsistencias.AsTableValuedParameter("dbo.TipoTablaAsistencia"));
```
- AsistenciaController.cs:63-64
- Used for table-valued parameters, output parameters, or dynamic parameter lists

### Table-Valued Parameters Pattern

**Location**: AsistenciaController.cs:39-86

**Pattern**: For bulk operations, create DataTable and pass as table-valued parameter.

**Steps**:
1. Create DataTable with matching schema (lines 41-44)
2. Populate DataTable with data (lines 47-59)
3. Create DynamicParameters (line 62)
4. Add TVP parameter (line 63-64)
5. Execute stored procedure (lines 68-71)

**Use Case**: Batch insert/update operations for better performance.

---

## MVC Frontend Patterns

### HttpClient Usage with Token Injection

**Pattern**: Create HttpClient from factory, inject JWT token from session, make API calls.

**Example** (HomeController.cs:17-44):
```csharp
var client = _httpClientFactory.CreateClient("APIClient");
var token = HttpContext.Session.GetString("JWTToken");
if (!string.IsNullOrEmpty(token))
{
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", token);
}
```

**Used in**: All MVC controllers that make API calls (16 controllers).

**Convention**: Always check for token in session before making authenticated API requests.

### API Communication Patterns

**POST Requests**:
```csharp
var response = await client.PostAsJsonAsync("api/v1/cuenta/login", loginRequest);
if (response.IsSuccessStatusCode)
{
    var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
}
```
- LoginController.cs:48-55
- AsistenciaController.cs (various POST operations)

**GET Requests**:
```csharp
var response = await client.GetAsync("api/v1/estudiante");
if (response.IsSuccessStatusCode)
{
    var estudiantes = await response.Content.ReadFromJsonAsync<List<EstudianteDto>>();
}
```
- EstudianteController.cs:23-29
- Multiple controllers follow this pattern

**Convention**: Check IsSuccessStatusCode before deserializing response content. Handle error responses appropriately.

### Session Management Pattern

**Stored Values**:
- `UserId` - Current user's ID
- `Rol` - User's role (for authorization)
- `JWTToken` - JWT bearer token for API calls
- `UserName` - User's display name

**Setting Session**:
- LoginController.cs:59-62
- After successful authentication

**Reading Session**:
- Used in all controllers via HttpContext.Session.GetString()
- Custom filters check session values

**Convention**: Store minimal data in session. Use JWT claims for additional user information.

### ViewModel vs DTO Pattern

**ViewModels** (ProyectoTransportesMana/Models/):
- Used for MVC views
- May combine data from multiple sources
- Include display-specific properties
- Example: LoginViewModel.cs, various ViewModels

**DTOs** (ProyectoTransportesMana.Contracts/):
- Shared contracts between API and MVC
- Match database schema or API responses
- No view-specific logic
- Example: EstudianteDto.cs, AlertaDto.cs

**Convention**: Use DTOs for API communication, create ViewModels when views need different data structures.

---

## Authentication & Authorization

### Multi-Layered Authentication

**Layer 1: API Authentication (JWT Bearer)**:
- ProyectoTransportesManaAPI/Program.cs:24-37
- JWT token validation on all API requests
- Token contains user ID, role, username

**Layer 2: MVC Authentication (Session-based)**:
- Session stores JWT token and user information
- Custom filters validate session state
- Example: SeguridadAttribute, AutorizarRolesAttribute

**Pattern**: MVC app stores JWT in session, includes it in API requests. API validates JWT independently.

### Custom Authorization Filters

**[Seguridad] Attribute** (ProyectoTransportesMana/Models/Filters/Seguridad.cs):
- Checks if user is logged in (session has UserId)
- Redirects to login if not authenticated
- Applied to controllers requiring authentication

**[AutorizarRoles] Attribute** (ProyectoTransportesMana/Models/Filters/AutorizarRoles.cs):
- Checks if user has required role
- Redirects to error page if unauthorized
- Applied to controllers/actions with role restrictions

**Usage Examples**:
- GestionUsuariosController.cs: `[AutorizarRoles("Administrador")]`
- AsistenciaController.cs: `[Seguridad]`

### Password Hashing Pattern

**Location**: ProyectoTransportesManaAPI/Helpers/PasswordHasher.cs:5-49

**Algorithm**: PBKDF2 with SHA256
- 10,000 iterations
- 32-byte salt
- 32-byte hash

**Pattern**:
```csharp
// Hash password
string hashedPassword = PasswordHasher.HashPassword(plainPassword);

// Verify password
bool isValid = PasswordHasher.VerifyPassword(plainPassword, hashedPassword);
```

**Used in**:
- CuentaController.cs:63 (login verification)
- CuentaController.cs:106 (new user registration)
- CuentaController.cs:276 (password reset)

**Convention**: Never store plain-text passwords. Always use PasswordHasher for hashing and verification.

### JWT Claims Pattern

**Token Generation** (CuentaController.cs:70-86):
- Claims: UserId, Username, Role
- Signed with symmetric key
- 8-hour expiration

**Token Validation**:
- Automatic via JWT middleware (API Program.cs:24-37)
- Validates issuer, audience, signing key, expiration

**Convention**: Include minimal claims needed for authorization. Store additional user data in database.

---

## Cross-Cutting Concerns

### Error Logging to Database

**Pattern**: Log exceptions to database using stored procedure.

**Implementation**:
- ErrorController.cs (MVC app)
- Stores error details: message, stack trace, user, timestamp
- Uses sp_registrar_error stored procedure

**Usage**:
```csharp
catch (Exception ex)
{
    // Log error to database
    await LogErrorToDatabase(ex);
    return StatusCode(500, "Error interno del servidor");
}
```

**Examples**:
- AsistenciaController.cs:86-92
- AlertasController.cs:45-51
- Multiple controllers implement error logging

**Convention**: Log all unhandled exceptions to database for troubleshooting. Return generic error messages to clients.

### Email Service Pattern

**Interface**: IEmailService (ProyectoTransportesMana/Services/IEmailService.cs)

**Implementation**: EmailService (ProyectoTransportesMana/Services/EmailService.cs)
- Uses NETCore.MailKit for SMTP
- Configured via IOptions<EmailSettings>
- Sends HTML and plain text emails

**Registration**: Program.cs:50 `builder.Services.AddTransient<IEmailService, EmailService>();`

**Usage Pattern**:
```csharp
public class SomeController : Controller
{
    private readonly IEmailService _emailService;

    public SomeController(IEmailService emailService)
    {
        _emailService = emailService;
    }

    public async Task SendNotification()
    {
        await _emailService.SendEmailAsync(to, subject, body);
    }
}
```

**Convention**: Inject IEmailService for sending emails. Keep email logic in service layer, not controllers.

### Configuration Pattern

**IConfiguration Injection**:
- All controllers and services can inject IConfiguration
- Access via `_configuration["Key"]` or `_configuration.GetSection("Section")`

**Examples**:
- API controllers inject IConfiguration for connection string
- MVC Program.cs:19 for ApiBaseUrl
- EmailService uses IOptions<EmailSettings>

**Convention**: Use IConfiguration for simple values, IOptions<T> for complex configuration sections.

### Global Exception Handling

**API**: Uses built-in exception handling middleware
- ProyectoTransportesManaAPI/Program.cs (implicit)
- Returns 500 status code with error details

**MVC**: Custom error controller
- ErrorController.cs handles error views
- Logs errors to database

**Pattern**: Let exceptions bubble up, handle at global level, log to database, return appropriate responses.

---

## Naming Conventions

### File Naming

**Controllers**:
- Format: `{Entity}Controller.cs`
- Examples: EstudianteController.cs, AutobusController.cs
- Known issue: GestionMaestrasControler.cs (typo - missing 'l')

**ViewModels**:
- Format: `{Purpose}ViewModel.cs` or `{Entity}ViewModel.cs`
- Examples: LoginViewModel.cs, EstudianteViewModel.cs
- Location: ProyectoTransportesMana/Models/

**DTOs**:
- Format: `{Entity}Dto.cs`, `{Entity}Request.cs`, `{Entity}Response.cs`
- Examples: EstudianteDto.cs, LoginRequest.cs, LoginResponse.cs
- Location: ProyectoTransportesMana.Contracts/

**Views**:
- Format: `{Action}.cshtml`
- Location: `/Views/{Controller}/{Action}.cshtml`
- Examples: Index.cshtml, Create.cshtml, Edit.cshtml

**Static Files**:
- Format: kebab-case
- Examples: gestion-asistencia.css, gestion-usuarios.js
- Location: `/wwwroot/{feature-name}/`

### Stored Procedure Naming

**Format**: `sp_{verb}_{entity}` (snake_case)

**Examples**:
- `sp_obtener_alertas` (get alerts)
- `sp_registrar_asistencia` (register attendance)
- `sp_actualizar_autobus` (update bus)
- `sp_eliminar_estudiante` (delete student)

**Convention**: Use Spanish for stored procedure names to match database naming. Use descriptive verbs.

### Variable and Parameter Naming

**C# Code**: camelCase for local variables, PascalCase for properties/methods
```csharp
var connectionString = _configuration["ConnectionStrings:DefaultConnection"];
var estudiantes = await con.QueryAsync<EstudianteDto>(...);
```

**Database Parameters**: PascalCase with @ prefix
```csharp
var parameters = new {
    @Usuario = loginRequest.Usuario,
    @Contrasena = hashedPassword
};
```

---

## Code Organization

### Feature-Based Organization

**Pattern**: Group related files by feature/module.

**Static Assets** (wwwroot/):
```
wwwroot/
├── css/
│   ├── components/          # Shared components
│   ├── gestion-asistencia/  # Attendance feature
│   ├── gestion-usuarios/    # User management feature
│   └── ...
├── js/
│   ├── shared/              # Shared utilities
│   ├── gestion-asistencia/  # Attendance scripts
│   └── ...
└── images/
    ├── gestion-asistencia/  # Attendance images
    └── ...
```

**Views** (Views/):
```
Views/
├── Home/
│   ├── Index.cshtml
│   └── ...
├── GestionUsuarios/
│   ├── Index.cshtml
│   ├── Create.cshtml
│   └── Edit.cshtml
└── ...
```

**Convention**: Keep all assets for a feature in same-named folders for easy discovery and maintenance.

### Shared vs Feature-Specific Code

**Shared Components**:
- `/wwwroot/css/components/` - Reusable UI components (cards, forms, buttons)
- `/wwwroot/js/shared/` - Utility functions used across features
- `/Views/Shared/` - Layout, partial views used everywhere

**Feature-Specific**:
- Feature folders contain CSS, JS, and images specific to that feature
- Keep feature code isolated to minimize coupling

**Convention**: If code is used in 2+ features, move it to shared. Otherwise, keep it feature-specific.

### Models Organization

**API Project** (ProyectoTransportesManaAPI/Models/):
- Domain models matching database schema
- API-specific DTOs (if any)
- Configuration models

**MVC Project** (ProyectoTransportesMana/Models/):
- ViewModels for views
- Custom filters (Filters/)
- Email settings and configurations

**Contracts Project** (ProyectoTransportesMana.Contracts/):
- Shared DTOs between API and MVC
- Request/Response models

**Convention**: Keep shared contracts in Contracts project. Keep project-specific models in respective projects.

### Controller Organization

**API Controllers** (ProyectoTransportesManaAPI/Controllers/):
- RESTful endpoints
- Focus on data access and business logic
- No view rendering

**MVC Controllers** (ProyectoTransportesMana/Controllers/):
- Action methods return views or redirects
- Handle user interaction
- Make API calls via HttpClient
- Manage session and cookies

**Convention**: API controllers handle data, MVC controllers handle UI. Avoid mixing concerns.

---

## Best Practices to Follow

### 1. Data Access Security

**Always Use Parameterized Queries**:
- ✅ `var result = await con.QueryAsync<T>("sp_name", parameters)`
- ❌ Never concatenate user input into SQL strings
- **Reason**: Prevent SQL injection attacks

**Prefer Stored Procedures**:
- ✅ Use stored procedures for consistency and security
- ⚠️ Use raw SQL only for simple, parameterized queries
- **Reason**: Centralized business logic, better performance, easier to audit

### 2. Async/Await Best Practices

**Use Async All The Way**:
- ✅ `await con.QueryAsync(...)`
- ✅ `await client.GetAsync(...)`
- ❌ Avoid `.Result` or `.Wait()` (blocking)
- **Known Issues**: HomeController.cs:33,37 use blocking calls

**Reason**: Avoid deadlocks, improve scalability, better resource utilization.

### 3. Exception Handling

**Handle Exceptions Explicitly**:
- ✅ Log exceptions to database
- ✅ Return appropriate HTTP status codes
- ❌ Avoid empty catch blocks
- ❌ Don't expose stack traces to clients

**Pattern**:
```csharp
try
{
    // Business logic
}
catch (Exception ex)
{
    await LogErrorToDatabase(ex);
    return StatusCode(500, "Error interno del servidor");
}
```

### 4. Validation

**Model Validation**:
- Use data annotations on DTOs and ViewModels
- Check ModelState.IsValid in controllers
- Return 400 Bad Request with validation errors

**Authorization Checks**:
- Apply [Authorize] on API controllers
- Use [Seguridad] and [AutorizarRoles] on MVC controllers
- Validate permissions before data operations

### 5. Session and Token Management

**MVC App**:
- Store JWT token in session
- Check session before making API calls
- Clear session on logout

**API**:
- Validate JWT on every request
- Don't trust session data - rely on JWT claims
- Use short token expiration (8 hours)

### 6. Code Organization Best Practices

**Follow Feature-Based Organization**:
- Group related files together
- Keep features isolated
- Extract shared code to shared folders

**Naming Consistency**:
- Follow established naming patterns
- Use descriptive names
- Match conventions in existing code

### 7. Configuration Management

**Development vs Production**:
- ⚠️ appsettings.json contains credentials (OK for development)
- ✅ Use environment variables in production
- ✅ Consider Azure Key Vault or similar for secrets

**Connection Strings**:
- Store in appsettings.json for development
- Override with environment variables in production

### 8. API Design Best Practices

**RESTful Conventions**:
- Use appropriate HTTP verbs (GET, POST, PUT, DELETE)
- Return correct status codes
- Use consistent URL structure

**Error Responses**:
- Return descriptive error messages
- Use ProblemDetails for structured errors
- Don't expose sensitive information

### 9. Testing Considerations

**Unit Tests**:
- Test business logic in isolation
- Mock dependencies (IHttpClientFactory, IEmailService, etc.)
- Use test databases for data access tests

**Integration Tests**:
- Test full request pipeline
- Test authentication and authorization
- Test API communication between projects

### 10. Performance Considerations

**Database Access**:
- Use connection pooling (automatic with SqlConnection)
- Use table-valued parameters for bulk operations
- Index frequently queried columns

**HttpClient**:
- Always use IHttpClientFactory (never create HttpClient directly)
- Reuse named clients
- Set appropriate timeouts

---

## Summary

These patterns represent the established architecture of ProyectoTransportesMana. When making changes:

1. **Follow existing patterns** - Look for similar implementations before creating new patterns
2. **Be consistent** - Use the same naming, organization, and coding style as existing code
3. **Prioritize security** - Always validate input, use parameterized queries, handle exceptions
4. **Keep it simple** - Don't over-engineer solutions, follow existing patterns
5. **Document deviations** - If you must deviate from patterns, document why

For questions or clarifications on these patterns, refer to specific file:line references provided throughout this document.
