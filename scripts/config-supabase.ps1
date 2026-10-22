# =============================================================================
#  O Nioaquense - Configuracao do Supabase
#  Wizard interativo para conectar o portal ao Supabase
# =============================================================================

$ErrorActionPreference = "Continue"
$host.UI.RawUI.WindowTitle = "O Nioaquense - Configuracao Supabase"

Write-Host "`n" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  O Nioaquense - Configuracao do Supabase    " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = "$env:USERPROFILE\Documents\Projetos Claude\O Nioaquense"
$projectName = "o-nioaquense"
$siteUrl = "https://onioaquense.com"

# -----------------------------------------------------------------------------
# PASSO 1: Criar projeto no Supabase
# -----------------------------------------------------------------------------
Write-Host "PASSO 1/5 - Criar projeto no Supabase" -ForegroundColor Yellow
Write-Host ""
Write-Host "Vou abrir o dashboard do Supabase no seu navegador."
Write-Host "1. Crie um novo projeto chamado: '$projectName'"
Write-Host "2. Aguarde o provisionamento (pode demorar 1-2 minutos)"
Write-Host "3. Anote a URL do projeto (ex: https://xxxx.supabase.co)"
Write-Host ""

Start-Process "https://supabase.com/dashboard/new" -ErrorAction SilentlyContinue

$supabaseUrl = Read-Host "Cole aqui a URL do projeto Supabase (Project URL)"
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    Write-Host "ERRO: URL do Supabase e obrigatoria." -ForegroundColor Red
    exit 1
}
# Normalizar URL
if ($supabaseUrl -notmatch "^https://") {
    $supabaseUrl = "https://$supabaseUrl"
}
Write-Host "URL registrada: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------------------------
# PASSO 2: Obter as chaves
# -----------------------------------------------------------------------------
Write-Host "PASSO 2/5 - Obter as chaves de API" -ForegroundColor Yellow
Write-Host ""
Write-Host "No dashboard do Supabase:"
Write-Host "  Settings > API"
Write-Host ""
Write-Host "Anote:"
Write-Host "  1. Project URL (ja registrada acima)"
Write-Host "  2. Anon public key (starts with eyJ...)"
Write-Host "  3. service_role secret key (starts with eyJ...)"
Write-Host ""

$anonKey = Read-Host "Cole aqui a Anon public key"
if ([string]::IsNullOrWhiteSpace($anonKey)) {
    Write-Host "ERRO: Anon key e obrigatoria." -ForegroundColor Red
    exit 1
}
Write-Host "Anon key registrada." -ForegroundColor Green

$serviceRoleKey = Read-Host "Cole aqui a service_role secret key"
if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    Write-Host "AVISO: Service role key nao informada. Algumas funcionalidades (upload de midia, leitura de tabelas restritas) nao funcionarao."
    $serviceRoleKey = ""
} else {
    Write-Host "Service role key registrada." -ForegroundColor Green
}
Write-Host ""

# -----------------------------------------------------------------------------
# PASSO 3: Executar migrations
# -----------------------------------------------------------------------------
Write-Host "PASSO 3/5 - Executar migrations no Supabase" -ForegroundColor Yellow
Write-Host ""
Write-Host "Vou abrir o SQL Editor do Supabase."
Write-Host "Execute estas migrations NA ORDEM:"
Write-Host "  1. supabase/migrations/001_initial_schema.sql"
Write-Host "  2. supabase/migrations/002_admin_storage.sql"
Write-Host "  3. supabase/migrations/003_commercial_utilities.sql"
Write-Host "  4. supabase/migrations/004_lottery_market.sql"
Write-Host "  5. supabase/migrations/005_reader_media.sql"
Write-Host ""
Write-Host "Apos executar cada uma, confirme se nao houve erros."
Write-Host ""

Start-Process "$supabaseUrl/project/_/sql" -ErrorAction SilentlyContinue

$confirmed = Read-Host "Todas as 5 migrations foram executadas com sucesso? (s/n)"
if ($confirmed -ne "s" -and $confirmed -ne "S") {
    Write-Host "AVISO: Execute as migrations antes de continuar."
}
Write-Host ""

# -----------------------------------------------------------------------------
# PASSO 4: Configurar secrets no Cloudflare Worker
# -----------------------------------------------------------------------------
Write-Host "PASSO 4/5 - Configurar secrets no Cloudflare Worker" -ForegroundColor Yellow
Write-Host ""
Write-Host "Configurando as variaveis secretas no wrangler..."
Write-Host ""

Set-Location $baseDir

function Set-WranglerSecret($name, $value) {
    Write-Host "Configurando $name..."
    $result = echo $value | npx wrangler secret put $name --env production 2>&1
    if ($LASTEXITCODE -eq 0 -or $result -match "Updated|updated|success|Sucesso") {
        Write-Host "  $name configurado com sucesso." -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ERRO ao configurar $name." -ForegroundColor Red
        Write-Host "  $result" | Select-Object -First 5
        return $false
    }
}

$ok1 = Set-WranglerSecret "PUBLIC_SUPABASE_URL" $supabaseUrl
$ok2 = Set-WranglerSecret "PUBLIC_SUPABASE_ANON_KEY" $anonKey

if ($serviceRoleKey) {
    $ok3 = Set-WranglerSecret "SUPABASE_SERVICE_ROLE_KEY" $serviceRoleKey
} else {
    $ok3 = $true
}

Write-Host ""

# -----------------------------------------------------------------------------
# PASSO 5: Deploy e teste
# -----------------------------------------------------------------------------
Write-Host "PASSO 5/5 - Deploy e teste de conexao" -ForegroundColor Yellow
Write-Host ""
Write-Host "Fazendo deploy do worker com as novas secrets..."
npx wrangler deploy --env production 2>&1 | Select-Object -Last 15

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Configuracao do Supabase concluida!        " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "O que foi feito:" -ForegroundColor Green
Write-Host "  - Projeto Supabase: $projectName" -ForegroundColor Green
Write-Host "  - URL: $supabaseUrl" -ForegroundColor Green
Write-Host "  - Anon key: configurada" -ForegroundColor Green
Write-Host "  - Service role: $(if ($serviceRoleKey) { "configurada" } else { "nao configurada (opcional)" })" -ForegroundColor Green
Write-Host "  - Secrets no Cloudflare Worker: atualizadas" -ForegroundColor Green
Write-Host ""
Write-Host "O portal agora esta rodando com Supabase Auth ativo."
Write-Host "O modo de demonstracao esta desabilitado automaticamente."
Write-Host ""
Write-Host "Proximo passo (opcional):"
Write-Host "  - Criar bucket R2 para imagens: npx wrangler r2 bucket create o-nioaquense-capas"
Write-Host "  - Descomentem a secao [[r2_buckets]] no wrangler.toml"
Write-Host ""
Write-Host "Acesse o portal: https://onioaquense.com" -ForegroundColor Cyan
Write-Host ""
