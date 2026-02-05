#!/bin/bash
# Script to find all routes in server2.js that need tenant middleware updates

echo "=== Routes with checkAuthenticated but without tenantMiddleware ==="
grep -n "app\.\(get\|post\).*checkAuthenticated.*async (req, res)" /home/sigma/Gajjar/.SSN/InventotyMan2/server2.js | grep -v tenantMiddleware

echo ""
echo "=== Direct db.collection usage (needs getDbFromRequest) ==="
grep -n "const.*Collection = db\.collection" /home/sigma/Gajjar/.SSN/InventotyMan2/server2.js | head -50
