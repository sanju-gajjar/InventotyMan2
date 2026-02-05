/**
 * Tenant Registry
 * Maps tenant identifiers to their database names and business types
 * 
 * NOTE: In production, this should be moved to a central database
 * For now, using a simple in-memory map
 */

const tenants = {
  // Default tenant (existing shop) - accessible via localhost or www
  'default': {
    id: 'default',
    name: 'Default Mobile Shop',
    businessType: 'mobile',
    dbName: 'test', // Current database name
    domain: 'localhost', // Can be domain or subdomain
    status: 'active',
    createdAt: new Date('2024-01-01')
  },
  
  // Test tenant for Mobile & Accessories business
  'mobile': {
    id: 'mobile',
    name: 'Test Mobile Shop',
    businessType: 'mobile',
    dbName: 'tenant_mobile_db',
    domain: 'mobile.localhost',
    status: 'active',
    createdAt: new Date()
  },
  
  // Test tenant for Restaurant/Food business
  'restaurant': {
    id: 'restaurant',
    name: 'Test Restaurant',
    businessType: 'restaurant',
    dbName: 'tenant_restaurant_db',
    domain: 'restaurant.localhost',
    status: 'active',
    createdAt: new Date()
  },
  
  // Test tenant for Clothing/Garment business
  'clothing': {
    id: 'clothing',
    name: 'Test Clothing Shop',
    businessType: 'clothing',
    dbName: 'tenant_clothing_db',
    domain: 'clothing.localhost',
    status: 'active',
    createdAt: new Date()
  }
};

/**
 * Get tenant by identifier (subdomain, tenantId, or domain)
 */
function getTenant(identifier) {
  // Direct lookup by tenant ID
  if (tenants[identifier]) {
    return tenants[identifier];
  }

  // Lookup by domain
  const tenant = Object.values(tenants).find(t => t.domain === identifier);
  if (tenant) {
    return tenant;
  }

  // Return default tenant if not found
  return tenants.default;
}

/**
 * Register a new tenant
 */
function registerTenant(tenantData) {
  const tenantId = tenantData.id || `shop_${tenantData.name.toLowerCase().replace(/\s+/g, '_')}`;
  
  if (tenants[tenantId]) {
    throw new Error(`Tenant with ID '${tenantId}' already exists`);
  }

  const newTenant = {
    id: tenantId,
    name: tenantData.name,
    businessType: tenantData.businessType || 'mobile',
    dbName: tenantData.dbName || `${tenantId}_db`,
    domain: tenantData.domain || tenantId,
    status: 'active',
    createdAt: new Date(),
    ...tenantData
  };

  tenants[tenantId] = newTenant;
  return newTenant;
}

/**
 * List all tenants
 */
function listTenants() {
  return Object.values(tenants);
}

/**
 * Update tenant
 */
function updateTenant(tenantId, updates) {
  if (!tenants[tenantId]) {
    throw new Error(`Tenant '${tenantId}' not found`);
  }

  tenants[tenantId] = {
    ...tenants[tenantId],
    ...updates,
    updatedAt: new Date()
  };

  return tenants[tenantId];
}

/**
 * Deactivate tenant
 */
function deactivateTenant(tenantId) {
  if (!tenants[tenantId]) {
    throw new Error(`Tenant '${tenantId}' not found`);
  }

  tenants[tenantId].status = 'inactive';
  tenants[tenantId].deactivatedAt = new Date();
  return tenants[tenantId];
}

module.exports = {
  getTenant,
  registerTenant,
  listTenants,
  updateTenant,
  deactivateTenant,
  tenants
};
