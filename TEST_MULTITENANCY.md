# Multi-Tenancy Testing Instructions

## Start Server
```bash
cd /home/sigma/Gajjar/.SSN/InventotyMan2
node server2.js
```

## Test Each Tenant

### 1. Mobile Shop
**URL:** http://mobile.localhost:3000

**Expected Database:** `tenant_mobile_db`

**Test Steps:**
1. Open browser and navigate to http://mobile.localhost:3000/register
2. Register a new user (mobile@test.com / password123)
3. Login and check dashboard
4. Look at server logs - should see:
   ```
   [Tenant Access] Test Mobile Shop (mobile) - GET /
   getDbFromRequest called - req.tenant: { id: 'mobile', name: 'Test Mobile Shop', ... }
   Using tenant database: tenant_mobile_db
   ```

### 2. Restaurant
**URL:** http://restaurant.localhost:3000

**Expected Database:** `tenant_restaurant_db`

**Test Steps:**
1. Open http://restaurant.localhost:3000/register
2. Register (restaurant@test.com / password123)
3. Create orders - should use restaurant-specific fields
4. Verify different database in MongoDB

### 3. Clothing Shop
**URL:** http://clothing.localhost:3000

**Expected Database:** `tenant_clothing_db`

**Test Steps:**
1. Open http://clothing.localhost:3000/register
2. Register (clothing@test.com / password123)
3. Create products with clothing-specific fields (Size: S/M/L/XL, Color, etc.)

## Verify Data Isolation

### Check MongoDB Databases
```bash
mongosh

# List all databases
show dbs

# Check mobile tenant
use tenant_mobile_db
show collections
db.users.find()
db.orders.find()

# Check restaurant tenant
use tenant_restaurant_db
show collections
db.users.find()
db.orders.find()

# They should have completely separate data!
```

## Debug Issues

### If seeing "No tenant info found in request"

**Check:**
1. Server logs show tenant middleware is running: `[Tenant Access] Test Mobile Shop (mobile)`
2. Debug logs show `req.tenant` value
3. Route has both `checkAuthenticated` and `tenantMiddleware`

**Fix:**
- Clear browser cookies
- Use incognito/private window
- Try query parameter: `http://localhost:3000/?tenant=mobile`

### Alternative Testing Method (Query Parameter)
If subdomain isn't working:
```
http://localhost:3000/?tenant=mobile
http://localhost:3000/?tenant=restaurant  
http://localhost:3000/?tenant=clothing
```

## Expected Server Logs (Correct)
```
[Tenant Access] Test Mobile Shop (mobile) - GET /
getDbFromRequest called - req.tenant: { 
  id: 'mobile',
  name: 'Test Mobile Shop',
  businessType: 'mobile',
  dbName: 'tenant_mobile_db',
  domain: 'mobile.localhost'
}
Using tenant database: tenant_mobile_db
```

## Expected Server Logs (Problem)
```
[Tenant Access] Test Mobile Shop (mobile) - GET /
getDbFromRequest called - req.tenant: undefined
No tenant info found in request, using default database
```

If you see "undefined", the middleware is running but req.tenant is not persisting to the callback functions.
