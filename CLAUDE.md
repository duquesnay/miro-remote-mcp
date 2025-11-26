# Miro MCP - Project Learnings

## Project Learnings

### 2025-11-26 - Docker Registry-Based Deployment Implementation

**Methodological: "Is it on?" - State Before Solutions**
When debugging connectivity/access issues, validate basic state (power, process running, service enabled) before diving into configuration debugging. Example: Dev server SSH timeout was diagnosed with nmap, security groups, UFW analysis when the actual issue was the server being powered off. Always check: Does it exist? → Is it running? → How is it configured?

**Technical: Scaleway instance_keys Pattern for Persistent SSH Access**
Scaleway instances regenerate `/root/.ssh/authorized_keys` from `/root/.ssh/instance_keys` on boot. Direct edits to authorized_keys are ephemeral. For deployment keys that must survive reboots:
```bash
echo 'ssh-ed25519 AAAA... github-actions' >> /root/.ssh/instance_keys
scw-fetch-ssh-keys --upgrade
```
This prevented GitHub Actions deployment failures after server reboots.

**Methodological: Worktree Isolation for Infrastructure Changes**
Using `git worktree` for deployment architecture changes (CI/CD workflows, Docker configs) provides safe isolation for testing complete deployment flows without risking main branch stability. More valuable for infrastructure than feature development since deployment testing requires pushing to test CI integration.

### Proposed Decision Anchors

**1. CI/CD Architecture: Docker Registry vs Build-on-Server**
- **Decision**: Use GitHub Container Registry (ghcr.io) with images built in CI
- **Rationale**: Faster deployments (pull vs build), consistent artifacts, easier rollbacks
- **Trade-offs**: Requires registry authentication, slightly more complex workflow
- **Context**: Migrated from tarball-upload + server-side build pattern

**2. Deployment Trigger Strategy: Tags vs Branch-based**
- **Decision**: Main branch = production tag, dev branch = dev tag, feat/* branches = branch-name tag
- **Added**: dev-* tags trigger dev deployment regardless of branch
- **Rationale**: Flexible testing without polluting main branch
- **Context**: Supports hotfixes and feature testing before merge
