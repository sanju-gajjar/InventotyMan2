/**
 * Tenant Identification Middleware
 * Identifies the tenant from the request and attaches tenant info to req.tenant
 * 
 * Supports multiple identification methods:
 * 1. Subdomain (radhe.yourdomain.com)
 * 2. Query parameter (?tenant=shop_id)
 * 3. Custom header (X-Tenant-ID)
 * 4. Session/Cookie (for logged-in users)
 */

const { getTenant } = require('../config/tenantRegistry');
const { getBusinessType } = require('../config/tenantConfig');

/**
 * Extract tenant identifier from various sources
 */
function identifyTenant(req) {
  // Priority 1: Query parameter (useful for testing and admin)
  if (req.query.tenant) {
    return req.query.tenant;
  }

  // Priority 2: Custom header
  if (req.headers['x-tenant-id']) {
    return req.headers['x-tenant-id'];
  }

  // Priority 3: Session (if user is logged in)
  if (req.session && req.session.tenantId) {
    return req.session.tenantId;
  }

  // Priority 4: Cookie
  if (req.cookies && req.cookies.tenantId) {
    return req.cookies.tenantId;
  }

  // Priority 5: Subdomain extraction
  const host = req.headers.host || req.hostname || 'localhost';
  
  // Handle localhost with port (e.g., mobile.localhost:3000)
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');
  
  // For localhost subdomain: mobile.localhost, restaurant.localhost, etc.
  if (parts.length >= 2) {
    const subdomain = parts[0];
    
    // If subdomain exists and is not 'www' or 'localhost', use it
    if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
      return subdomain;
    }
  }
  
  // Check if host matches a full domain (with port stripped)
  if (hostWithoutPort !== 'localhost' && !hostWithoutPort.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return hostWithoutPort;
  }

  // Default: Use 'default' tenant
  return 'default';
}

/**
 * Middleware function to attach tenant info to request
 */
function tenantMiddleware(req, res, next) {
  try {
    // Identify tenant
    const tenantIdentifier = identifyTenant(req);
    
    // Get tenant details
    const tenant = getTenant(tenantIdentifier);
    
    if (!tenant) {
      console.error(`Tenant not found: ${tenantIdentifier}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found. Please contact administrator.' 
      });
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      console.error(`Tenant inactive: ${tenantIdentifier}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is inactive. Please contact administrator.' 
      });
    }

    // Get business type configuration
    const businessConfig = getBusinessType(tenant.businessType);

    // Attach tenant info to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      businessType: tenant.businessType,
      dbName: tenant.dbName,
      domain: tenant.domain,
      config: businessConfig
    };

    // Log tenant access (optional, useful for debugging)
    console.log(`[Tenant Access] ${tenant.name} (${tenant.id}) - ${req.method} ${req.path}`);

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error identifying tenant. Please try again.' 
    });
  }
}

/**
 * Optional: Middleware to require specific business type
 */
function requireBusinessType(...allowedTypes) {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(500).json({ 
        success: false, 
        message: 'Tenant not identified' 
      });
    }

    if (!allowedTypes.includes(req.tenant.businessType)) {
      return res.status(403).json({ 
        success: false, 
        message: `This feature is only available for ${allowedTypes.join(', ')} businesses` 
      });
    }

    next();
  };
}

/**
 * Optional: Skip tenant middleware for public routes
 */
function optionalTenant(req, res, next) {
  try {
    const tenantIdentifier = identifyTenant(req);
    const tenant = getTenant(tenantIdentifier);
    
    if (tenant && tenant.status === 'active') {
      const businessConfig = getBusinessType(tenant.businessType);
      req.tenant = {
        id: tenant.id,
        name: tenant.name,
        businessType: tenant.businessType,
        dbName: tenant.dbName,
        domain: tenant.domain,
        config: businessConfig
      };
    }
  } catch (error) {
    console.error('Optional tenant middleware error:', error);
  }
  
  next();
}

module.exports = {
  tenantMiddleware,
  requireBusinessType,
  optionalTenant,
  identifyTenant
};
