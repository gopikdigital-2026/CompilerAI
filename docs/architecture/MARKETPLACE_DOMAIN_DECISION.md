# Marketplace Domain Decision

**Date:** July 26, 2026  
**Status:** DECISION — Keep Separate  
**Reviewed by:** Sprint 36.1 Production Readiness

---

## Context

The CompilerAI monorepo contains two marketplace-related packages:

- `@compilerai/marketplace` (packages/marketplace/) — Tool Marketplace
- `@compilerai/skills-marketplace` (packages/skills-marketplace/) — Skills Marketplace

This document reviews whether these are genuinely different domains or if they should be merged.

---

## Analysis

### @compilerai/marketplace — Tool Marketplace

| Aspect | Description |
|--------|-------------|
| **Purpose** | Manages external tool integration — installing, versioning, and verifying third-party tools |
| **Core entities** | ToolManifest, InstalledTool, ToolVersion, ToolPermission |
| **Key services** | ToolRegistry, ToolInstaller, ToolUninstaller, ToolVersionManager, ToolCompatibilityChecker, ToolSignatureVerifier, ToolPermissionAnalyzer, ToolSearchService |
| **Use case** | A developer installs a GitHub connector tool from the marketplace, verifies its signature, checks compatibility, and manages its version |
| **Security model** | Signature verification, permission analysis, compatibility checking |
| **Lifecycle** | Install → Verify → Version → Uninstall |

### @compilerai/skills-marketplace — Skills Marketplace

| Aspect | Description |
|--------|-------------|
| **Purpose** | Manages AI skill lifecycle — creating, registering, sandboxing, and executing AI skills |
| **Core entities** | SkillManifest, SkillRecord, SkillStatus, SkillPermission, SkillDependency |
| **Key services** | SkillsMarketplace, SkillBuilder, SkillRegistry, PermissionEngine, SkillSandbox, SkillInstaller, LifecycleManager, Marketplace |
| **Use case** | An AI agent uses a skill to analyze a GitHub repository, with sandboxed execution and permission enforcement |
| **Security model** | Permission engine, sandboxed execution, lifecycle management |
| **Lifecycle** | Create → Register → Install → Enable → Execute → Disable → Uninstall |

---

## Comparison

| Dimension | marketplace | skills-marketplace |
|-----------|-------------|-------------------|
| Domain | External tool integration | AI skill lifecycle |
| Manifest type | ToolManifest (tools, connectors) | SkillManifest (AI skills, agents) |
| Execution model | None (tools are libraries) | Sandboxed execution |
| Versioning | Semantic versioning with compatibility | Lifecycle-based (draft → published → deprecated) |
| Security | Signature verification | Permission engine + sandbox |
| Dependencies | 0 cross-package | 0 cross-package |
| Tests | 78 | 88 |

---

## Decision

**KEEP SEPARATE.** The two packages serve genuinely different domains:

1. **marketplace** manages **external tools** (connectors, libraries) that are installed and linked at the platform level. Tools don't execute — they provide capabilities.

2. **skills-marketplace** manages **AI skills** that are registered, sandboxed, and executed by agents. Skills have a lifecycle (enable/disable) and runtime execution model.

### Rationale

- Tools and skills have different manifest schemas, different security models, and different lifecycle semantics.
- Merging would create a package with two distinct responsibilities, violating the Single Responsibility Principle.
- Both packages have zero cross-package dependencies and can evolve independently.
- The naming convention clearly distinguishes them: "marketplace" (tools) vs "skills-marketplace" (skills).

---

## Allowed Dependencies

Neither package depends on the other. Both are independent:

- `marketplace`: no cross-package dependencies
- `skills-marketplace`: no cross-package dependencies

Future integration (if needed) should be through public API interfaces, not direct imports.

---

## Ownership

| Package | Owner | Domain |
|---------|-------|--------|
| @compilerai/marketplace | Platform Team | Tool integration |
| @compilerai/skills-marketplace | AI Runtime Team | Skill lifecycle |

---

## Conclusion

The two packages are correctly separated. No merge, rename, or type sharing is needed at this time. The domains are distinct, the dependencies are clean, and both packages have comprehensive test coverage.
