# Bou specialist skills

Bou keeps specialist guidance in small reviewable files. The desktop-control skill below is already loaded by the native app for its dedicated PC-control flow. The five new guides define assistant behavior for code generation, code review, software development, security review, and defensive cybersecurity.

A skill changes how the assistant reasons; it does not grant a new permission or connector. The React web companion contains text-guidance versions of these skills. It has no desktop, filesystem, browser, messaging, or code-execution runner.

## Approval rule

- Reading supplied code for an answer is read-only.
- Before a future integration writes files, it must show a proposed diff and wait for the user's approval.
- Before a future integration runs code, it must show the exact command, scope the environment, and wait for approval.
- Security testing must be limited to systems the user owns or is authorized to assess.
- Sending, publishing, deleting, installing, changing access controls, or modifying security settings always requires a separate, specific approval.
