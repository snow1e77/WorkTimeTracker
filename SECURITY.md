# 🔒 Security Guide for WorkTime Tracker

## Overview

This document outlines the security measures implemented in the WorkTime Tracker application and provides guidelines for maintaining security in production environments.

## 🛡️ Security Features Implemented

### 1. Authentication & Authorization

- **SMS-based Authentication**: Secure phone number verification
- **JWT Tokens**: Short-lived access tokens (2h) with refresh tokens (7d)
- **bcrypt Password Hashing**: 12 rounds for maximum security
- **Role-based Access Control**: Worker and Admin roles
- **Session Management**: Secure token storage and rotation

### 2. API Security

- **Rate Limiting**: 
  - Global: 1000 requests per 15 minutes
  - Authentication: 5 attempts per 15 minutes
  - Admin operations: 3 attempts per 15 minutes
- **Input Validation**: Comprehensive validation using express-validator
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Token validation for state-changing operations

### 3. Network Security

- **HTTPS Enforcement**: TLS 1.2+ with modern cipher suites
- **HSTS Headers**: Strict Transport Security
- **Security Headers**: 
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Content-Security-Policy
  - Referrer-Policy
- **IP Whitelisting**: Admin endpoints restricted by IP
- **CORS Configuration**: Strict origin validation

### 4. Infrastructure Security

- **Docker Security**: 
  - Non-root containers
  - Read-only filesystems
  - Resource limits
  - Security profiles
- **Nginx Security**: 
  - Rate limiting
  - Request filtering
  - Attack pattern detection
- **Database Security**: 
  - SSL connections
  - Strong authentication
  - Connection pooling limits

### 5. Monitoring & Logging

- **Security Event Logging**: Failed login attempts, suspicious activity
- **Performance Monitoring**: Slow query detection
- **Fail2Ban Integration**: Automatic IP blocking
- **Log Retention**: 60+ days for security logs

## 🚀 Security Setup

### Quick Setup

Run the security setup script:

```powershell
.\scripts\setup-security.ps1
```

This script will:
- Generate strong passwords and secrets
- Create SSL certificates
- Configure Fail2Ban
- Set up production environment
- Create security configurations

### Manual Setup

1. **Generate Secrets**:
   ```bash
   # Generate 64-character JWT secret
   openssl rand -base64 64
   
   # Generate database password
   openssl rand -base64 32
   ```

2. **SSL Certificates**:
   ```bash
   # Self-signed for development
   openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes
   
   # For production, use Let's Encrypt or purchase certificates
   ```

3. **Environment Configuration**:
   - Copy `production.env.example` to `production.env`
   - Update all passwords and secrets
   - Configure your domain names
   - Set admin IP addresses

## 🔧 Production Deployment

### Pre-deployment Checklist

- [ ] All secrets generated and stored securely
- [ ] SSL certificates obtained and configured
- [ ] Domain names configured in Nginx
- [ ] Admin IP whitelist updated
- [ ] Database credentials secured
- [ ] Environment variables validated
- [ ] Monitoring configured

### Deployment Command

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Post-deployment Security Check

1. **SSL Test**: https://www.ssllabs.com/ssltest/
2. **Security Headers**: https://securityheaders.com/
3. **Vulnerability Scan**: Use tools like OWASP ZAP
4. **Penetration Testing**: Consider professional security audit

## 🔍 Security Monitoring

### Key Metrics to Monitor

- Failed authentication attempts
- Rate limit violations
- Suspicious URL patterns
- Database connection anomalies
- Certificate expiration dates

### Log Analysis

Check security logs regularly:

```bash
# View security events
docker logs worktime-server-prod | grep "Security Event"

# Check failed login attempts
grep "auth_failure" server/logs/security-*.log

# Monitor rate limiting
grep "429" nginx/logs/access.log
```

### Incident Response

1. **Immediate Response**:
   - Block attacking IP addresses
   - Rotate compromised credentials
   - Scale rate limits if needed

2. **Investigation**:
   - Analyze logs for attack patterns
   - Check for data breaches
   - Document incident details

3. **Recovery**:
   - Update security measures
   - Patch vulnerabilities
   - Notify users if necessary

## 🔐 Password Security

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Password Storage

- All passwords hashed with bcrypt (12 rounds)
- Salt generated per password
- No plaintext password storage

## 📱 Mobile App Security

### Additional Considerations

- Certificate pinning
- Root/jailbreak detection
- Secure storage using Keychain/Keystore
- Network security configuration

## 🆘 Security Contacts

### Reporting Security Issues

If you discover a security vulnerability, please report it to:

- **Email**: security@yourdomain.com
- **Encrypted**: Use PGP key [KEY_ID]
- **Response Time**: 24 hours for critical issues

### Security Team

- Security Officer: [Name] <email@domain.com>
- Technical Lead: [Name] <email@domain.com>

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Nginx Security Guide](https://nginx.org/en/docs/http/securing_nginx.html)

## 🔄 Security Updates

This security configuration should be reviewed and updated:

- **Monthly**: Check for security updates
- **Quarterly**: Review access controls and permissions
- **Annually**: Full security audit and penetration testing

---

**Last Updated**: $(Get-Date -Format "yyyy-MM-dd")  
**Version**: 1.0  
**Review Date**: Next review due in 3 months 