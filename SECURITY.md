# Security Policy

## Supported Versions

Latest stable release receives security updates.

## Reporting a Vulnerability

If you discover a security vulnerability in OpenBron, please report it privately by emailing the project maintainers. **Do not open a public issue.**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive a response within 48 hours. We will keep you informed of the fix progress.

## Security Best Practices

- All API keys and credentials are stored as environment variables, never in code
- Proxy routing through SOCKS5h prevents DNS leakage
- No plaintext credential storage in the database
- Docker containers run as non-root users
- Regular dependency updates via Dependabot
