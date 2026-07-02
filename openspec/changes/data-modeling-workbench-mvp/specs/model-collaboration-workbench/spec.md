## ADDED Requirements

### Requirement: Project Boundary Management
The system SHALL allow authorized internal users to create, view, update, filter, sort, archive, and open model projects with an explicit subject domain boundary and pilot scope.

#### Scenario: Create bounded model project
- **WHEN** an authorized architect creates a model project with name, project code, subject domain, subdomain, pilot scope, owner, and description
- **THEN** the system persists the project as a draft project and returns available permission actions, version, and audit metadata

#### Scenario: Prevent unbounded project scope
- **WHEN** a user submits a model project without a confirmed subject domain or with an invalid subject domain boundary
- **THEN** the system rejects the request with the frozen unified error structure and does not create the project

#### Scenario: Archive model project
- **WHEN** an authorized user archives an inactive model project with the current optimistic lock version
- **THEN** the system marks the project as archived and removes it from default active project queries

### Requirement: Model Object And Field Maintenance
The system SHALL allow authorized architects and warehouse developers to maintain business objects, logical entities, logical fields, physical tables, and physical fields inside a model project.

#### Scenario: Maintain model tree assets
- **WHEN** an authorized user creates or updates business objects, logical entities, physical tables, and fields in a draft project
- **THEN** the system updates the project object tree and returns node-level metadata, status, and available actions

#### Scenario: Reject stale model update
- **WHEN** a user updates a model object or field with a stale optimistic lock version
- **THEN** the system rejects the request with a conflict error and preserves the latest persisted model state

#### Scenario: Archive model object with dependency checks
- **WHEN** an authorized user archives a model object that is referenced by mappings, validations, review, or version snapshots
- **THEN** the system either blocks the archive with dependency details or records a safe archive that does not mutate immutable versions

### Requirement: Permission Actions For Workbench Operations
The system SHALL return UI-consumable permission actions for project, model asset, import, mapping, validation, review, publish, version, and export operations.

#### Scenario: Render disabled action from permission result
- **WHEN** the frontend requests project detail, object tree, review detail, version detail, or export task detail
- **THEN** the response includes available actions that allow the UI to enable or disable commands without guessing authorization rules

#### Scenario: Fail closed on unauthorized command
- **WHEN** a user invokes a command without the required permission action
- **THEN** the system denies the command, returns the frozen authorization error structure, and writes an audit record when required
