# SSL Setup Script for WorkTime Tracker
# Simple SSL certificate setup

param(
    [string]$Domain = "localhost"
)

Write-Host "Setting up SSL certificates for WorkTime Tracker" -ForegroundColor Green
Write-Host "Domain: $Domain" -ForegroundColor Cyan

# Create directories
$sslDir = "nginx/ssl"
New-Item -ItemType Directory -Force -Path $sslDir | Out-Null

# Check for OpenSSL
function Test-OpenSSL {
    try {
        $null = Get-Command openssl -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Create self-signed certificate
function New-SelfSignedCert {
    param([string]$Domain)
    
    Write-Host "Creating self-signed SSL certificate..." -ForegroundColor Yellow
    
    if (-not (Test-OpenSSL)) {
        Write-Host "OpenSSL not found. Installing..." -ForegroundColor Red
        
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            choco install openssl -y
        } else {
            Write-Host "Please install OpenSSL manually:" -ForegroundColor Yellow
            Write-Host "1. Download from https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
            Write-Host "2. Or install Chocolatey: choco install openssl" -ForegroundColor White
            return $false
        }
    }
    
    $keyPath = "$sslDir/key.pem"
    $certPath = "$sslDir/cert.pem"
    $configPath = "$sslDir/openssl.conf"
    
    # Create OpenSSL config
    $opensslConfig = @"
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=RU
ST=Moscow
L=Moscow
O=WorkTimeTracker
OU=IT Department
CN=$Domain

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $Domain
DNS.2 = www.$Domain
DNS.3 = localhost
DNS.4 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
"@
    
    $opensslConfig | Out-File -FilePath $configPath -Encoding UTF8
    
    try {
        # Generate private key and certificate
        & openssl req -new -x509 -nodes -days 365 -keyout $keyPath -out $certPath -config $configPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Self-signed certificate created successfully" -ForegroundColor Green
            Write-Host "Key: $keyPath" -ForegroundColor Cyan
            Write-Host "Certificate: $certPath" -ForegroundColor Cyan
            return $true
        } else {
            Write-Host "Error creating certificate" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Update Nginx config
function Update-NginxConfig {
    param([string]$Domain)
    
    Write-Host "Updating Nginx configuration..." -ForegroundColor Yellow
    
    # Update nginx.conf
    if (Test-Path "nginx/nginx.conf") {
        $nginxConfig = Get-Content "nginx/nginx.conf" -Raw
        $nginxConfig = $nginxConfig -replace "your-domain\.com", $Domain
        $nginxConfig | Out-File -FilePath "nginx/nginx.conf" -Encoding UTF8
    }
    
    # Update nginx.prod.conf
    if (Test-Path "nginx/nginx.prod.conf") {
        $nginxProdConfig = Get-Content "nginx/nginx.prod.conf" -Raw
        $nginxProdConfig = $nginxProdConfig -replace "yourdomain\.com", $Domain
        $nginxProdConfig | Out-File -FilePath "nginx/nginx.prod.conf" -Encoding UTF8
    }
    
    Write-Host "Nginx configuration updated for domain: $Domain" -ForegroundColor Green
}

# Create Docker Compose override
function New-DockerOverride {
    $dockerOverride = @"
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: worktime-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./src:/usr/share/nginx/html:ro
    networks:
      - worktime-network
    restart: unless-stopped
    depends_on:
      - server

networks:
  worktime-network:
    driver: bridge
"@
    
    $dockerOverride | Out-File -FilePath "docker-compose.ssl.yml" -Encoding UTF8
    Write-Host "Created docker-compose.ssl.yml override file" -ForegroundColor Green
}

# Test SSL configuration
function Test-SSLConfig {
    Write-Host "Testing SSL configuration..." -ForegroundColor Yellow
    
    $keyPath = "$sslDir/key.pem"
    $certPath = "$sslDir/cert.pem"
    
    if ((Test-Path $keyPath) -and (Test-Path $certPath)) {
        Write-Host "SSL files found" -ForegroundColor Green
        
        if (Test-OpenSSL) {
            try {
                $keyCheck = & openssl rsa -in $keyPath -check -noout 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "SSL key and certificate are valid" -ForegroundColor Green
                } else {
                    Write-Host "SSL validation error" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "Error checking SSL: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "SSL files not found" -ForegroundColor Red
    }
}

# Main execution
Write-Host "Creating self-signed SSL certificate..." -ForegroundColor Cyan

$success = New-SelfSignedCert -Domain $Domain

if ($success) {
    Update-NginxConfig -Domain $Domain
    New-DockerOverride
    Test-SSLConfig
    
    Write-Host "`nSSL certificates configured successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Start application: docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d" -ForegroundColor White
    Write-Host "2. Open browser: https://$Domain" -ForegroundColor White
    Write-Host "3. Accept security exception for self-signed certificate" -ForegroundColor White
    
    if ($Domain -eq "localhost") {
        Write-Host "`nTip: Add domain to hosts file for testing:" -ForegroundColor Yellow
        Write-Host "   C:\Windows\System32\drivers\etc\hosts" -ForegroundColor White
        Write-Host "   127.0.0.1 $Domain" -ForegroundColor White
    }
} else {
    Write-Host "`nFailed to configure SSL certificates" -ForegroundColor Red
    exit 1
} 