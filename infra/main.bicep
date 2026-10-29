targetScope = 'subscription'

metadata deployment = { 'app-onboard-skill': 'true' }

param resourceGroupName string = 'nhsuk-intent-capture-copy-rg-uks'
param webAppName string = 'nhsuk-intent-capture-copy-uks'
param appServicePlanName string = 'nhsuk-intent-capture-copy-plan-uks'

resource webApp 'Microsoft.Web/sites@2024-04-01' existing = {
  name: webAppName
  scope: resourceGroup(resourceGroupName)
}

resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' existing = {
  name: appServicePlanName
  scope: resourceGroup(resourceGroupName)
}

output webAppId string = webApp.id
output webAppHostname string = webApp.properties.defaultHostName
output appServicePlanId string = appServicePlan.id