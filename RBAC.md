# PalmyraShift RBAC

This project uses **role-based access control (RBAC)** with a single role assigned per user at the platform level.

## Roles (highest to lowest)

### 1) `PLATFORM_ADMIN`
**Who**: platform owner / super-admin.

**Authorities**
- Full access to all services and all data.
- Manage users: create/disable users, reset roles.
- Manage platform configuration: services, ownership, settings.
- View audit/activity logs (when added).

### 2) `SERVICE_OWNER`
**Who**: leader responsible for one service module (e.g. SMM Growth).

**Authorities**
- Manage the assigned service: settings, workflows, templates (when added).
- Assign/remove **STAFF** in that service (when service-scoped membership is added).
- View all client work inside that service.
- Cannot change global platform settings or access other services unless explicitly granted.

### 3) `STAFF`
**Who**: internal team member delivering work.

**Authorities**
- Access internal tools for assigned services.
- Create/update deliverables and client work items for assigned services.
- Read client context needed to deliver the service.
- Cannot manage roles or platform settings.

### 4) `CLIENT`
**Who**: customer user.

**Authorities**
- Access only their own client workspace data (when organizations/workspaces are added).
- Submit requests/intake forms, view status and deliverables.
- Manage their own profile.
- Cannot access internal staff tooling or other clients.

## Notes / next steps

- **Service scoping**: Right now the role is stored as `User.role`. The next step is adding a `Service` + `Membership` table so `SERVICE_OWNER` / `STAFF` can be scoped per service.
- **Client scoping**: Add `Organization` (client account) and link users to orgs to ensure data isolation between clients.

