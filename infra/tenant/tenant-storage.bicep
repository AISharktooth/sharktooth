@description('Deployment location (should match the tenant RG region).')
param location string

@description('Environment name, e.g. prod/stage/dev.')
param env string

@description('Tenant ID slug, e.g. t-aisharktooth-demo.')
param tenantId string

@description('Globally-unique storage account name (lowercase, 3-24 chars).')
param storageAccountName string

@description('Optional tags to apply to resources.')
param tags object = {}

resource stg 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    accessTier: 'Hot'
    // Keep public network enabled for now (you said public networking is OK).
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
    // Enable HNS if you plan SFTP/ADLS patterns later. Safe to enable now.
    isHnsEnabled: true
  }
}

resource blob 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  name: '${stg.name}/default'
}

resource roRaw 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${blob.name}/ro-raw'
  properties: { }
}

resource roProcessed 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${blob.name}/ro-processed'
  properties: { }
}

resource roQuarantine 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${blob.name}/ro-quarantine'
  properties: { }
}

output storageAccountResourceId string = stg.id
output storageAccountName string = stg.name
