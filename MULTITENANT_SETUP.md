# Multi-Tenant System Setup Guide

## Overview
This application now supports **multi-tenancy** with complete data isolation. Each tenant (shop) has:
- **Separate database** (same MongoDB connection, different database names)
- **Business type configuration** (mobile, restaurant, clothing)
- **Complete data isolation** (orders, stock, customers are separate)

---

## Local Development Testing

### 1. Access Different Tenants via Subdomains

You can test each business type using subdomain-based URLs:

| Business Type | URL | Database | Status |
|--------------|-----|----------|--------|
| **Mobile Shop** | http://mobile.localhost:3000 | `tenant_mobile_db` | ✅ Active |
| **Restaurant** | http://restaurant.localhost:3000 | `tenant_restaurant_db` | ✅ Active |
| **Clothing Shop** | http://clothing.localhost:3000 | `tenant_clothing_db` | ✅ Active |
| **Default** | http://localhost:3000 | `test` | ✅ Active |

### 2. How Subdomain Resolution Works

Modern browsers (Chrome, Firefox, Edge) automatically resolve `*.localhost` subdomains without any configuration:
- `mobile.localhost` → Mobile shop tenant
- `restaurant.localhost` → Restaurant tenant
- `clothing.localhost` → Clothing shop tenant

**No /etc/hosts modification needed!** Browsers handle `.localhost` natively.

### 3. Testing Steps

#### Step 1: Start the Server
```bash
cd /home/sigma/Gajjar/.SSN/InventotyMan2
npm start
# or
node server2.js
```

#### Step 2: Register Users for Each Tenant

**For Mobile Shop:**
```bash
# Open: http://mobile.localhost:3000/register
# Create user: mobile@test.com / password123
```

**For Restaurant:**
```bash
# Open: http://restaurant.localhost:3000/register
# Create user: restaurant@test.com / password123
```

**For Clothing Shop:**
```bash
# Open: http://clothing.localhost:3000/register
# Create user: clothing@test.com / password123
```

#### Step 3: Verify Data Isolation

1. Login to mobile tenant and create some products
2. Login to restaurant tenant - you won't see mobile shop's data
3. Check MongoDB to see separate databases:
   ```bash
   mongosh
   show dbs
   # You should see:
   # - test (default)
   # - tenant_mobile_db
   # - tenant_restaurant_db
   # - tenant_clothing_db
   ```

---

## Business Type Differences

### 🔧 Mobile & Accessories Shop
**Fields:**
- Brand, Category, Item ID, Item Name
- Serial Number (for individual tracking)
- Stock quantity, Price, Discount, GST

**Dashboard:**
- Out of Stock alerts
- Fast-moving inventory
- Slow-moving inventory
- Low stock warnings

### 🍽️ Restaurant / Food Shop
**Fields:**
- Category (Veg, Non-Veg, Beverages)
- Item ID, Item Name, Unit (kg, liter, pieces)
- Table Number, Order Type (Dine-in, Takeaway, Delivery)
- Expiry Date, Price, GST

**Dashboard:**
- Daily sales
- Popular items
- Expiring items

### 👔 Clothing / Garment Shop
**Fields:**
- Brand, Category, Sub-Category (Men, Women, Kids)
- Item ID, Item Name
- Cloth Size (S, M, L, XL, XXL), Color
- Stock quantity, Price, Discount, GST

**Dashboard:**
- Out of Stock alerts
- Fast-moving inventory
- Size distribution
- Slow-moving inventory

---

## Tenant Identification Methods

The system supports multiple ways to identify tenants:

### Priority Order:
1. **Query parameter**: `?tenant=mobile`
2. **Custom header**: `X-Tenant-ID: mobile`
3. **Session**: Stored after login
4. **Cookie**: `tenantId=mobile`
5. **Subdomain**: `mobile.localhost` → tenant ID = `mobile`

### Examples:

**Using Query Parameter (testing):**
```
http://localhost:3000/login?tenant=restaurant
```

**Using Custom Header (API calls):**
```bash
curl -H "X-Tenant-ID: clothing" http://localhost:3000/api/categories
```

**Using Subdomain (production-like):**
```
http://restaurant.localhost:3000
```

---

## Admin Endpoints

### Register New Tenant
```bash
POST /admin/register-tenant
Content-Type: application/json

{
  "name": "Radhe Mobile",
  "businessType": "mobile",
  "domain": "radhe.example.com"
}
```

### List All Tenants
```bash
GET /admin/tenants
```

**Response:**
```json
{
  "success": true,
  "tenants": [
    {
      "id": "mobile",
      "name": "Test Mobile Shop",
      "businessType": "mobile",
      "dbName": "tenant_mobile_db",
      "domain": "mobile.localhost",
      "status": "active"
    }
  ]
}
```

### List All Databases (Debug)
```bash
GET /admin/databases
```

---

## Troubleshooting

### Issue: "Tenant not found"
**Solution:** Check tenant registry in `config/tenantRegistry.js` and ensure the tenant exists.

### Issue: Subdomain not working
**Solution:** 
1. Ensure you're using `http://` not `https://`
2. Include the port: `http://mobile.localhost:3000`
3. Try query parameter instead: `http://localhost:3000?tenant=mobile`

### Issue: Seeing wrong tenant's data
**Solution:**
1. Clear cookies: `document.cookie.split(";").forEach(c => document.cookie = c.trim().split("=")[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/');`
2. Use incognito/private window
3. Check browser console for tenant info

### Issue: Database not created
**Solution:** MongoDB creates databases automatically when first document is inserted. Create a user or product first.

---

## Security Notes

1. **Data Isolation:** Each tenant has a completely separate database - no shared collections
2. **Authentication:** Users are stored per-tenant, no cross-tenant access
3. **Middleware Protection:** All routes require authentication + tenant identification
4. **Query Parameter Override:** Useful for testing, but should be disabled in production

---

## Production Deployment

For production with real domains:

1. **Update tenant registry:**
   ```javascript
   'radhe_mobile': {
     id: 'radhe_mobile',
     name: 'Radhe Mobile',
     businessType: 'mobile',
     dbName: 'radhe_mobile_db',
     domain: 'radhe.yourdomain.com',
     status: 'active'
   }
   ```

2. **Configure DNS:**
   - Add A record: `radhe.yourdomain.com` → Server IP
   - Or CNAME: `radhe.yourdomain.com` → `yourdomain.com`

3. **SSL Certificate:**
   - Use wildcard SSL: `*.yourdomain.com`
   - Or individual certificates per subdomain

4. **Disable Query Parameter Override:**
   - Remove `req.query.tenant` check in `tenantMiddleware.js`

---

## Database Backup Strategy

**Per-Tenant Backup:**
```bash
# Backup single tenant
mongodump --db tenant_mobile_db --out ./backups/mobile/

# Restore single tenant
mongorestore --db tenant_mobile_db ./backups/mobile/tenant_mobile_db/
```

**All Tenants Backup:**
```bash
# Backup all databases
mongodump --out ./backups/all_tenants/

# Restore all
mongorestore ./backups/all_tenants/
```

---

## Next Steps

1. ✅ Test each business type in local dev
2. ⏳ Create initial users for each tenant
3. ⏳ Add sample data for testing
4. ⏳ Test data isolation (ensure no cross-tenant leaks)
5. ⏳ Prepare for production deployment

---

## Support

For issues or questions:
1. Check logs: `console.log` shows tenant access
2. Verify tenant middleware is applied to routes
3. Check MongoDB databases: `show dbs` in mongosh
4. Review tenant registry configuration

**Log Format:**
```
[Tenant Access] Test Mobile Shop (mobile) - GET /
[Tenant Access] Test Restaurant (restaurant) - POST /submitbill
```
