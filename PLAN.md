# CI/CD Hardening Plan

## Objective

Close the review findings in `.github/`, `Dockerfile`, `docker-compose.yml`, and `Caddyfile` without weakening the existing guarantees:

- untrusted pull requests never receive deployment or registry credentials;
- production uses the exact image tested by CI, addressed by digest;
- deployments verify the image revision internally and over public HTTPS;
- failed deployments can reliably restore both the previous image and its configuration;
- changes remain small enough to review and roll back independently.

## Scope

### In scope

- GitHub branch and environment protection
- pull-request validation of the production container
- deployment and rollback correctness
- application-aware health checks
- production hostname configuration
- container runtime hardening
- dependency and container vulnerability maintenance
- release/image retention
- deployment race and downtime reduction

### Out of scope

- application feature changes
- unrelated Svelte refactoring
- changing hosting providers
- a multi-host/high-availability platform unless zero-downtime deployment is explicitly required

## Decisions required before implementation

1. **Production approval:** choose fully automatic deployment after protected `master` CI, or require a production-environment reviewer.
2. **Production domain:** provide a domain controlled by the project and access to its DNS records.
3. **Runtime isolation:** choose either rootless Docker on the host or a non-root user inside the container with managed volume ownership.
4. **Vulnerability policy:** define which findings block publication, recommended initially as fixable `CRITICAL` findings, then tighten to `HIGH` after establishing an exception process.
5. **Availability target:** decide whether brief single-container restart downtime is acceptable. If not, complete the optional blue/green phase.

## Implementation plan

### Phase 1 — Validate the production container before merge

**Files:** `.github/workflows/ci.yml`

1. Add a stable, required PR job named `Production container check`.
2. Run it only for pull requests; retain the existing push-only image publication job so PRs never receive `packages: write`, `id-token: write`, or registry credentials.
3. In the PR job:
    - check out without persisted credentials;
    - build the Docker image with `RELEASE=$GITHUB_SHA`;
    - rely on the Dockerfile's `caddy validate` step;
    - start the exact local image;
    - poll `/health/version` with the expected `Host` header;
    - compare the response with `$GITHUB_SHA`;
    - always print container logs on failure and remove the container.
4. Add `pnpm build` to the quality job so production bundling failures are reported before the slower container job.
5. Add workflow linting with a commit-pinned `actionlint` integration or a checksum-verified binary.
6. Keep all third-party actions pinned to full commit SHAs.

**Acceptance criteria:**

- A PR that breaks `Dockerfile`, `Caddyfile`, static generation, or container routing fails before merge.
- The PR workflow has only `contents: read`.
- A forked PR cannot log in to GHCR or access production secrets.
- The push workflow still builds once, smoke-tests that image, pushes it, records its digest, and attests it.

### Phase 2 — Enforce repository and production protections

**Configuration:** GitHub repository settings; no repository file can enforce these controls by itself.

Apply this phase only after Phase 1's new check exists on the default branch.

1. Update `master` branch protection or replace it with an enforced ruleset:
    - require pull requests;
    - require at least one approving review;
    - require CODEOWNER review;
    - dismiss stale approvals;
    - require approval of the latest push;
    - require `Tests, checks, formatting, and linting`;
    - require `Production container check`;
    - require branches to be current before merge;
    - continue blocking force pushes and deletion;
    - include administrators, or strictly limit bypass actors.
2. Keep the production environment restricted to `master`.
3. If manual production approval was selected, add required reviewers, prevent self-review where supported, and disable administrator bypass where operationally acceptable.
4. Verify that all owners in `.github/CODEOWNERS` are valid and have repository access. Add a second owner/team to avoid a single-person review bottleneck.
5. Update the CODEOWNERS comment so it describes enforced settings rather than implying the file alone requires review.

**Acceptance criteria:**

- GitHub API reports `require_code_owner_reviews: true` and at least one required approval.
- Both CI checks are required on `master`.
- A CI/CD file cannot merge without the configured independent review.
- Production accepts deployments only from `master` under the selected approval policy.

### Phase 3 — Make rollback restore the complete previous release

**Files:** `.github/workflows/deploy.yml`

1. Record three rollback values before activation:
    - previous image digest/reference;
    - previous release directory;
    - previous image revision label.
2. Validate the previous directory before use:
    - it resolves beneath `/opt/project-reader/releases/`;
    - it contains a regular, immutable `docker-compose.yml`;
    - its revision matches the previous image label.
3. In both rollback paths, construct the Compose command from the previous release's Compose file, not the failed release's file.
4. Start the previous image with `--wait`, verify `/health/version`, and only then restore the `current` symlink.
5. Preserve rollback metadata until rollback succeeds or the new public deployment is finalized.
6. Add a remote deployment lock with `flock` so manual operations cannot race the GitHub concurrency group.
7. Clean abandoned `.incoming-*`, temporary symlinks, and stale rollback files safely after their retention window.

**Acceptance criteria:**

- A deployment that changes Compose configuration and then fails restores the previous image under the previous Compose configuration.
- Failed rollback leaves diagnostic metadata intact and exits non-zero.
- Initial deployment, where no previous release exists, shuts down only the failed candidate and reports that no rollback target exists.

### Phase 4 — Use an application-aware health check

**Files:** `docker-compose.yml`, possibly `Caddyfile`

1. Replace the admin API healthcheck with an HTTP request to `/health/version` through the public Caddy routing path and expected `Host` header.
2. Keep conservative startup timing and retries so certificate initialization does not cause false failures.
3. Continue comparing the exact release value during activation; Compose health should establish application availability, while deployment verification establishes revision identity.
4. After the healthcheck no longer depends on port 2019, evaluate disabling Caddy's admin API for the immutable runtime. If retained, ensure it remains bound only to localhost and is never published.

**Acceptance criteria:**

- Missing `/srv`, a broken route, or an unreadable version file marks the container unhealthy.
- `docker compose up --wait` fails before activation when the application cannot serve the health route.
- Port 2019 is not exposed on the host.

### Phase 5 — Replace the hardcoded `sslip.io` production address

**Files:** `Caddyfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

**Prerequisite:** a project-controlled domain with DNS pointing to the production host.

1. Define non-secret GitHub environment/repository variables such as `PRODUCTION_HOST` and `PRODUCTION_URL`.
2. Make the Caddy site address configurable through a validated environment placeholder with a safe local CI default.
3. Pass the hostname explicitly to Compose and all remote deployment/rollback commands.
4. Replace hardcoded workflow `Host` headers and public verification URLs with the validated variable.
5. Validate the hostname against a strict DNS-name pattern before interpolating it into shell or SSH commands.
6. Add the controlled domain, verify ACME issuance and HTTPS, and retain a temporary redirect from the old hostname only if continuity is needed.
7. Remove the old hostname after DNS/TLS monitoring confirms the migration.

**Acceptance criteria:**

- The production IP or hostname changes in one environment setting rather than several files.
- CI smoke tests still work without public DNS or ACME access.
- Production serves a valid certificate for a domain controlled by the project.

### Phase 6 — Reduce runtime privilege

**Files:** `Dockerfile`, `docker-compose.yml`; production host configuration

1. Perform a short spike comparing:
    - rootless Docker on the production host; and
    - an explicit unprivileged runtime UID/GID inside the image.
2. Prefer rootless Docker if host networking, persistent volumes, and operational tooling support it.
3. If using a non-root container user:
    - create a fixed UID/GID in the image;
    - arrange ownership of `/data` and `/config` before Caddy starts;
    - confirm low-port binding through the minimum required capability or use an externally mapped high-port design;
    - retain `read_only`, `no-new-privileges`, and `cap_drop: [ALL]`;
    - remove `NET_BIND_SERVICE` if it is no longer needed.
4. Add `pids_limit` and conservative memory/CPU limits after measuring normal usage.
5. Verify certificate renewal and persistence after container recreation and host restart.

**Acceptance criteria:**

- The effective host/container privilege model is documented.
- Caddy does not have more privilege than required.
- `/data` and `/config` remain writable only where required.
- TLS issuance, renewal, health checks, and graceful shutdown continue to work.

### Phase 7 — Add dependency, SBOM, and vulnerability maintenance

**Files:** `.github/dependabot.yml`, `.github/workflows/ci.yml`

1. Add Dependabot's `npm` ecosystem for `/` so `package.json` and `pnpm-lock.yaml` receive updates.
2. Group compatible patch/minor updates and cap concurrent update PRs.
3. Keep weekly checks for GitHub Actions and Docker digests.
4. Generate an SPDX or CycloneDX SBOM from the exact local image before publication.
5. Scan that same image with a pinned scanner/version before pushing.
6. After the digest is known, attach the SBOM attestation to the published digest and retain the existing provenance attestation.
7. Upload scan and SBOM reports as short-retention workflow artifacts without including credentials.
8. Document suppression rules with owner, reason, and expiry; do not use an unbounded ignore file.

**Acceptance criteria:**

- pnpm dependency updates are opened automatically.
- The image is scanned before publication under the agreed blocking policy.
- GHCR contains provenance and SBOM attestations for the deployed digest.

### Phase 8 — Align release and image retention

**Files:** `.github/workflows/deploy.yml`

1. Store the deployed immutable image reference in each release directory.
2. Define one retention policy, initially the latest three successful releases plus the active release.
3. During cleanup:
    - identify retained releases first;
    - collect their image digests;
    - remove only release directories outside the retained set;
    - remove only images not active and not referenced by retained releases.
4. Add disk-usage logging before and after cleanup.
5. Alert or fail safely when free space is low rather than deleting the current rollback target.

**Acceptance criteria:**

- Every retained release has a locally available image and Compose file.
- Manual rollback to each retained release succeeds even when the image is older than seven days.
- Cleanup never deletes the active or immediate rollback image.

### Phase 9 — Close smaller CI/deployment gaps

**Files:** `.github/workflows/deploy.yml`, `package.json`, `scripts/`

1. Recheck the selected deployment policy immediately before activation:
    - if only the current `master` tip may deploy, query it again and reject a stale release;
    - otherwise document that the latest successful revision may deploy while newer CI is running.
2. Pin the runner image (`ubuntu-24.04` or the selected tested release) instead of relying indefinitely on mutable `ubuntu-latest`.
3. Align the Node.js version used by quality checks with the production build image at an agreed patch/minor policy.
4. Either restore `scripts/check-effects.mjs` and add it to CI, or remove the broken `check:effects` script from `package.json`.
5. Document production prerequisites: Docker/Compose versions, host directories, SSH user permissions, firewall ports, backups for Caddy data, and recovery commands.

**Acceptance criteria:**

- Deployment freshness behavior is explicit and tested.
- No package script points to a missing file.
- Host bootstrap and disaster recovery can be reproduced from documentation.

### Optional Phase 10 — Blue/green deployment

Complete this phase only if the agreed availability target does not permit the current single-container restart window.

1. Separate the stable TLS edge proxy from versioned application containers.
2. Run the candidate application on an internal Docker network without public host ports.
3. Verify the candidate's release endpoint before switching traffic.
4. Atomically update/reload the edge proxy upstream.
5. Keep the previous slot running until public verification succeeds.
6. Roll back by switching the upstream, not by recreating a container.
7. Test Caddy reload failure, candidate failure, host restart, and certificate renewal.

**Acceptance criteria:**

- A failed candidate receives no public traffic.
- Successful deployment has no observable connection refusal during the switch.
- Rollback does not depend on starting the previous image during an outage.

## Proposed pull-request sequence

1. **PR 1: PR production-build gate** — container check, `pnpm build`, workflow linting.
2. **Settings change:** require the new checks and enforce CODEOWNER/approval rules.
3. **PR 2: Transactional rollback and application health** — previous Compose rollback, remote lock, healthcheck, failure cleanup.
4. **PR 3: Retention correctness and deployment documentation** — release image metadata, safe pruning, host runbook, dead script resolution.
5. **PR 4: Dependency and image supply-chain checks** — npm Dependabot, SBOM, vulnerability policy and scanner.
6. **PR 5: Controlled-domain migration** — only after DNS is ready.
7. **PR 6: Runtime privilege reduction** — after staging proves the selected rootless/non-root design.
8. **PR 7: Blue/green architecture** — optional, based on the availability decision.

Each PR should be independently deployable and should avoid mixing repository-settings changes with unverified workflow check names.

## Verification matrix

Run the following before declaring the plan complete:

| Scenario                               | Expected result                                         |
| -------------------------------------- | ------------------------------------------------------- |
| Normal application PR                  | quality, build, and container checks pass               |
| Broken Svelte production build         | PR quality/build check fails                            |
| Invalid Caddyfile                      | PR container build fails validation                     |
| Missing `/srv/health/version`          | container becomes unhealthy                             |
| Forked PR                              | no secrets, registry login, attestations, or deployment |
| Successful `master` push               | one tested image is pushed and deployed by digest       |
| Image label mismatch                   | activation is rejected                                  |
| New Compose config fails               | previous image and previous Compose config are restored |
| Public HTTPS verification fails        | previous release is restored and verified               |
| Two deployment attempts                | GitHub concurrency and remote lock serialize activation |
| Previous release older than seven days | retained release still rolls back successfully          |
| Production host restart                | current release and TLS state recover automatically     |
| Dependency with blocking CVE           | publication fails with an actionable report             |

## Final definition of done

- All required GitHub protections are verified through the API or settings export.
- Pull requests validate the production Docker/Caddy path without privileged credentials.
- Automatic rollback restores the previous image, previous Compose configuration, and previous revision.
- Health checks exercise the application route rather than only Caddy's admin API.
- Production uses a controlled, configurable domain.
- Runtime privilege and resource limits are documented and tested.
- pnpm dependencies, Docker images, and actions receive automated updates.
- Every published image has provenance, an SBOM, and a vulnerability result.
- Release cleanup preserves every advertised rollback target.
- `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build`, workflow linting, Docker build, Compose validation, container smoke tests, and staged deployment/rollback tests all pass.
