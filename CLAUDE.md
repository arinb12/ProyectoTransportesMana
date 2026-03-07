# ProyectoTransportesMana - AI Assistant Reference Guide

## Project Overview

**What**: School transportation management system for managing students, buses, attendance, schedules, and alerts

**Architecture**: Multi-project ASP.NET Core solution
- REST API backend (ProyectoTransportesManaAPI)
- MVC web application frontend (ProyectoTransportesMana)
- Shared contracts library (ProyectoTransportesMana.Contracts)
- Test project (Test)

**Purpose**: Comprehensive management platform for transport services including user management, vehicle tracking, route planning, attendance monitoring, and parent notifications.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | ASP.NET Core 9.0 (.NET 9.0) |
| Language | C# with nullable reference types |
| Database | SQL Server (transportes_mana database) |
| Data Access | Dapper ORM with stored procedures |
| Frontend | Server-side MVC with Bootstrap, jQuery |
| API Authentication | JWT Bearer tokens |
| Web Authentication | Session-based with custom filters |
| Email | SMTP via NETCore.MailKit |
| API Docs | OpenAPI/Swagger |

## Project Structure

### Core Projects

| Project | Purpose | Key Features |
|---------|---------|--------------|
| `ProyectoTransportesManaAPI/` | REST API backend | JWT auth, OpenAPI docs, 15 controllers |
| `ProyectoTransportesMana/` | MVC web application | Session auth, 16 controllers, Razor views |
| `ProyectoTransportesMana.Contracts/` | Shared contracts | DTOs, request/response models |
| `Test/` | Test project | Unit and integration tests |
| `ManaDB.sql` | Database schema | Tables, stored procedures, initial data |

### Key Directories

**API Project (ProyectoTransportesManaAPI/):**
- `Controllers/` - 15 API controllers (v1 routing)
- `Models/` - Domain models and DTOs
- `Helpers/` - Utility classes (PasswordHasher, etc.)

**Web Project (ProyectoTransportesMana/):**
- `Controllers/` - 16 MVC controllers
- `Views/` - Razor views organized by feature
- `Models/` - ViewModels, filters, domain models
- `Services/` - Business logic (EmailService, etc.)
- `wwwroot/` - Static assets (CSS, JS, images) organized by feature
  - `css/components/` - Reusable component styles
  - `js/shared/` - Shared JavaScript utilities

## Build, Run & Test

**Prerequisites**: .NET 9.0 SDK, SQL Server 2022+, execute ManaDB.sql

**Build**: `dotnet build ProyectoTransportesMana.sln`

**Run** (both projects required simultaneously):
```bash
# Terminal 1 - API (https://localhost:7238)
dotnet run --project ProyectoTransportesManaAPI/ProyectoTransportesManaAPI.csproj

# Terminal 2 - Web (https://localhost:7272)
dotnet run --project ProyectoTransportesMana/ProyectoTransportesMana.csproj
```

**Test**: `dotnet test Test/Test.csproj`

**Database**: Execute ManaDB.sql on SQL Server, update connection string in API appsettings.json

## Configuration

**API** (ProyectoTransportesManaAPI/appsettings.json):
- `ConnectionStrings:DefaultConnection` - SQL Server connection string
- `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience` - JWT configuration

**Web** (ProyectoTransportesMana/appsettings.json):
- `ApiBaseUrl` - REST API base URL (default: https://localhost:7238)
- `EmailSettings` - SMTP config (Host, Port, Username, Password, SenderEmail, SenderName)

**Note**: MVC app communicates with API via HttpClient with JWT tokens from session.

## Additional Documentation

For detailed information on implementation patterns and conventions:

- **[Architectural Patterns](.claude/docs/architectural_patterns.md)** - Design patterns, conventions, and best practices used across the codebase
- **API Endpoints** - (Create when needed: `.claude/docs/api_endpoints.md`)
- **Database Schema** - (Create when needed: `.claude/docs/database_schema.md`)

## Adding New Features or Fixing Bugs
**IMPORTANT**: When you work on a new feature or bug, create an entire plan first before doing any change/implementation. Ask all the questions required before doing the plan. Include questions that could improve the requested feature/bug fix so it includes best practices


## Quick Reference

**Add Feature**: (1) Create controller, (2) Add views/endpoints, (3) Add CSS/JS to wwwroot/{feature}/, (4) Add stored procedures, (5) Update routing

**Debug**: Browser console → API responses in network tab → SQL Server → error logs (sp_registrar_error)

**Common Tasks**: Users (GestionUsuarios), Attendance (AsistenciaController), Routes (GestionRutas), Notifications (IEmailService)
