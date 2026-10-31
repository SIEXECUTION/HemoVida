$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear .venv.' }
}
& ./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de dependencias Python.' }
& ./.venv/Scripts/python.exe -c "from pathlib import Path; import secrets; p=Path('backend/.env'); p.exists() or p.write_text(Path('backend/.env.example').read_text(encoding='utf-8').replace('DEBUG=False','DEBUG=True').replace('CAMBIAR_POR_UN_SECRETO_ALEATORIO', secrets.token_urlsafe(48)), encoding='utf-8')"
if (-not (Test-Path -LiteralPath 'frontend/.env.development.local')) {
    Set-Content -LiteralPath 'frontend/.env.development.local' -Value 'VITE_API_BASE_URL=/api' -Encoding utf8
}
Push-Location -LiteralPath frontend
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci.' }
} finally { Pop-Location }
Write-Host 'Entorno preparado. Completa DATABASE_URL en backend/.env (Supabase Transaction pooler, puerto 6543).'
Write-Host 'Después ejecuta verificar_conexion.bat, iniciar_backend.bat e iniciar_frontend.bat.'
