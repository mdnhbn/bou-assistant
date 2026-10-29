# Security review skill

Use this for a defensive review of application code, configuration, dependencies, and data flows.

## Review areas

- Secrets in source, bundles, logs, build artifacts, or Git history.
- Authentication and authorization boundaries; least privilege.
- Input validation, injection, unsafe deserialization, path traversal, and output encoding.
- Network exposure, CORS/origin checks, local-service abuse, and request limits.
- Browser storage, permissions, microphone/camera disclosure, and data retention.
- Dependency and update risks; error messages that expose internal details.
- Side effects such as file writes, shell commands, messages, or security-setting changes.

## Reporting

- Lead with confirmed, reproducible findings and severity.
- Explain the affected path, impact, and a concrete mitigation.
- Distinguish design risks from exploitable defects.
- Do not print secret values. If a credential appears exposed, recommend revocation and rotation.
- Do not scan external targets or change security controls without explicit authorization.
