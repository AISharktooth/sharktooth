param(
  [Parameter(Mandatory=$true)][ValidateSet("dev","stage","prod")] [string] $Env,
  [Parameter(Mandatory=$true)] [string] $TenantId,

  [Parameter(Mandatory=$false)] [string] $SubscriptionId = "",
  [Parameter(Mandatory=$false)] [string] $Location = "",

  [Parameter(Mandatory=$false)] [string] $FoundationRg = "stai-prod-foundation",
  [Parameter(Mandatory=$false)] [string] $AcrName = "acrstaiprod"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Ok([string] $msg, [int] $code) {
  if ($code -ne 0) { throw $msg }
}

# Validate tenantId slug (t- + lowercase/nums/hyphen)
if ($TenantId -notmatch '^t-[a-z0-9]+(-[a-z0-9]+)*$') {
  throw "Invalid TenantId '$TenantId'. Expected format like: t-aisharktooth-demo (lowercase, digits, hyphen)."
}

if ([string]::IsNullOrWhiteSpace($SubscriptionId)) {
  $SubscriptionId = az account show --query id -o tsv
}
az account set --subscription $SubscriptionId | Out-Null

# Default location from foundation RG if not provided
if ([string]::IsNullOrWhiteSpace($Location)) {
  $Location = az group show -n $FoundationRg --query location -o tsv
  if ([string]::IsNullOrWhiteSpace($Location)) { throw "Could not determine location from foundation RG '$FoundationRg'." }
}

$tenantRg = "stai-$Env-tenant-$TenantId"
$uamiName = "uami-stai-$Env-tenant-$TenantId-ingest"

Write-Host "== Provision tenant =="
Write-Host "  subscription: $SubscriptionId"
Write-Host "  location:     $Location"
Write-Host "  tenantRg:     $tenantRg"
Write-Host "  uamiName:     $uamiName"

# Ensure tenant RG
$rgExists = az group exists -n $tenantRg
if ($rgExists -ne "true") {
  Write-Host "Creating resource group: $tenantRg"
  az group create -n $tenantRg -l $Location -o none
} else {
  Write-Host "Resource group exists: $tenantRg"
}

# Ensure UAMI
$uami = $null
try {
  $uami = az identity show -g $tenantRg -n $uamiName -o json | ConvertFrom-Json
  Write-Host "UAMI exists: $uamiName"
} catch {
  Write-Host "Creating UAMI: $uamiName"
  $uami = az identity create -g $tenantRg -n $uamiName -l $Location -o json | ConvertFrom-Json
}

$uamiPrincipalId = $uami.principalId
$uamiResourceId  = $uami.id

if ([string]::IsNullOrWhiteSpace($uamiPrincipalId)) { throw "UAMI principalId missing for $uamiName" }

# Resolve ACR resource ID
$acrId = az acr show -g $FoundationRg -n $AcrName --query id -o tsv
if ([string]::IsNullOrWhiteSpace($acrId)) { throw "ACR not found: $AcrName in RG $FoundationRg" }

# Ensure AcrPull assignment (tenant UAMI -> ACR)
$acrPullRoleId = az role definition list --name "AcrPull" --query "[0].id" -o tsv
if ([string]::IsNullOrWhiteSpace($acrPullRoleId)) { throw "Could not resolve role definition for AcrPull" }

$hasAcrPull = az role assignment list `
  --assignee-object-id $uamiPrincipalId `
  --scope $acrId `
  --query "[?roleDefinitionName=='AcrPull'] | length(@)" `
  -o tsv

if ($hasAcrPull -eq "0") {
  Write-Host "Assigning AcrPull on ACR to tenant UAMI..."
  az role assignment create `
    --assignee-object-id $uamiPrincipalId `
    --assignee-principal-type ServicePrincipal `
    --role "AcrPull" `
    --scope $acrId `
    -o none
} else {
  Write-Host "AcrPull already assigned."
}

# Deterministic storage account name (lowercase, <=24 chars)
# stai + env initial + 16 hex from sha1(tenantId)
$sha1 = [System.Security.Cryptography.SHA1]::Create()
$hashBytes = $sha1.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$Env|$TenantId"))
$hex = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
$envInitial = $Env.Substring(0,1).ToLower()
$storageName = ("stai" + $envInitial + $hex.Substring(0,16))  # length 4+1+16=21

Write-Host "Storage account name: $storageName"

# Deploy tenant storage + containers via Bicep (management plane)
$tags = @{
  "stai:env"    = $Env
  "stai:tenant" = $TenantId
  "stai:role"   = "tenant-storage"
}

$tagsJson = ($tags | ConvertTo-Json -Compress)

Write-Host "Deploying tenant storage (Bicep)..."
az deployment group create `
  -g $tenantRg `
  -n "tenant-storage" `
  --mode Incremental `
  --template-file "infra/tenant/tenant-storage.bicep" `
  --parameters location=$Location env=$Env tenantId=$TenantId storageAccountName=$storageName tags=$tagsJson `
  -o none

Write-Host "== Done =="
Write-Host "Tenant RG:   $tenantRg"
Write-Host "UAMI ID:     $uamiResourceId"
Write-Host "UAMI OID:    $uamiPrincipalId"
Write-Host "Storage:     $storageName"
Write-Host "ACR:         $AcrName"
