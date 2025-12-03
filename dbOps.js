function getUserRole(req) {
    const user = req.cookies.user;
    const role = req.cookies.role;
    return { user, role };
}
exports.getHomePage = function (req,callback) {
    const stockCollection = db.collection('stocks');
    // Determine filter period
    const period = req.query.period || 'currentFY';
    const now = new Date();
    let startDate, endDate;
    if (period.startsWith('fy')) {
        // Financial year: fy2024 means 1 Apr 2023 to 31 Mar 2024
        const fy = parseInt(period.replace('fy', ''));
        startDate = new Date(fy - 1, 3, 1); // April 1, previous year
        endDate = new Date(fy, 2, 31, 23, 59, 59); // March 31, fy year
    } else if (period === 'last3months') {
        endDate = now;
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (period === 'lastmonth') {
        endDate = now;
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else {
        // Default: current financial year
        const fy = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
        startDate = new Date(fy - 1, 3, 1);
        endDate = new Date(fy, 2, 31, 23, 59, 59);
    }

    // Stock pipeline (all stock, not date filtered)
    stockCollection.find({}).toArray((err, resultStocksCount) => {
      if (err) {
        console.log(err);
      }
      const pipelineStock = [
        { $addFields: { total: { $multiply: ["$Amount", "$Size"] } } },
        { $group: { _id: '_id', TotalItemsOrdered: { $sum: '$total' } } }
      ];
      stockCollection.aggregate(pipelineStock).toArray((err, resultStock) => {
        if (err) {
          console.error('Error executing aggregation:', err);
          return;
        }
        const ordersCollection = db.collection('orders');
        // Orders pipeline: parse BillDate and filter
        // Helper: parse BillDate as DD/MM/YYYY or fallback to YYYY-MM-DD
        const baseMatch = [
          {
            $addFields: {
              BillDateObj: {
                $cond: [
                  { $regexMatch: { input: "$BillDate", regex: "/\\d{2}\\/\\d{2}\\/\\d{4}/" } },
                  { $dateFromString: { dateString: "$BillDate", format: "%d/%m/%Y" } },
                  { $dateFromString: { dateString: "$BillDate", format: "%Y-%m-%d" } }
                ]
              }
            }
          },
          {
            $match: {
              BillDateObj: { $gte: startDate, $lte: endDate }
            }
          }
        ];
        // Sales trend (monthly sales)
        const salesTrendPipeline = [
          ...baseMatch,
          {
            $group: {
              _id: { year: { $year: "$BillDateObj" }, month: { $month: "$BillDateObj" } },
              totalSales: { $sum: "$Amount" }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];
        // Orders trend (monthly orders)
        const ordersTrendPipeline = [
          ...baseMatch,
          {
            $group: {
              _id: { year: { $year: "$BillDateObj" }, month: { $month: "$BillDateObj" } },
              totalOrders: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];
        // Top products (by sales)
        const topProductsPipeline = [
          ...baseMatch,
          {
            $group: {
              _id: "$ItemName",
              totalSales: { $sum: "$Amount" },
              count: { $sum: 1 }
            }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 5 }
        ];
        // Top customers (by purchase amount)
        const topCustomersPipeline = [
          ...baseMatch,
          {
            $group: {
              _id: "$CustomerPhone",
              totalAmount: { $sum: "$Amount" },
              count: { $sum: 1 }
            }
          },
          { $sort: { totalAmount: -1 } },
          { $limit: 5 }
        ];
        // Low stock alerts (products below threshold)
        const lowStockPipeline = [
          { $match: { Size: { $lt: 5 } } },
          { $project: { ItemID: 1, ItemName: 1, Size: 1 } },
          { $sort: { Size: 1 } },
          { $limit: 10 }
        ];

        // Run all aggregations in parallel
        Promise.all([
          ordersCollection.aggregate(salesTrendPipeline).toArray(),
          ordersCollection.aggregate(ordersTrendPipeline).toArray(),
          ordersCollection.aggregate(topProductsPipeline).toArray(),
          ordersCollection.aggregate(topCustomersPipeline).toArray(),
          stockCollection.aggregate(lowStockPipeline).toArray(),
          // Existing stats
          ordersCollection.aggregate([...baseMatch, { $group: { _id: '_id', TotalItemsOrdered: { $sum: "$Amount" } } }]).toArray(),
          ordersCollection.aggregate([...baseMatch]).toArray(),
        ]).then(([salesTrend, ordersTrend, topProducts, topCustomers, lowStock, total_sales, resultCount]) => {
          var returnData = {
            user: getUserRole(req),
            total_sales: total_sales,
            ord_num: [{ NumberOfProducts: resultCount ? resultCount.length : 0 }],
            stock_num: [{ NumberOfProducts: (resultStocksCount.length != null && resultStocksCount.length != undefined) ? resultStocksCount.length : 0 }],
            total_stock: resultStock,
            period: period,
            startDate: startDate,
            endDate: endDate,
            salesTrend,
            ordersTrend,
            topProducts,
            topCustomers,
            lowStock
          };
          callback(null, returnData);
        }).catch(err => {
          console.error('Dashboard aggregation error:', err);
          callback(err, null);
        });
      });
    });
}
exports.getOrderPage = function (req, callback) { 
    const ordersCollection = db.collection('orders');
    const customerCollection = db.collection('customer');
    // Pagination and search params
    const page = parseInt(req.query.page) || 1;
    const pageSize = 20;
    const searchCustomer = req.query.customer || '';
    const searchPhone = req.query.phone || '';
    const searchOrder = req.query.order || '';

    // Build search filter
    let filter = {};
    if (searchOrder) {
        filter.TransactionID = { $regex: searchOrder, $options: 'i' };
    }
    if (searchPhone) {
        filter.CustomerPhone = searchPhone;
    }

    // For customer name search, need to lookup customer collection
    let customerNameFilter = {};
    if (searchCustomer) {
        customerNameFilter.CustomerName = { $regex: searchCustomer, $options: 'i' };
    }

    // Find matching customer phones if searching by name
    function getCustomerPhones(cb) {
        if (searchCustomer) {
            customerCollection.find(customerNameFilter).toArray((err, customers) => {
                if (err || !customers) return cb([]);
                cb(customers.map(c => c.PhoneNumber));
            });
        } else {
            cb(null);
        }
    }

    getCustomerPhones((phones) => {
        if (phones && phones.length > 0) {
            filter.CustomerPhone = { $in: phones };
        }
        ordersCollection.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$TransactionID",
                    Amount: { $sum: "$Amount" },
                    TransactionDate: { $first: "$TransactionDate" },
                    TransactionTime: { $first: "$TransactionTime" },
                    CustomerPhone: { $first: "$CustomerPhone" },
                    mongoId: { $first: "$_id" },
                    BillDate: { $first: "$BillDate" }
                }
            },
            { $sort: { mongoId: -1 } },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]).toArray((err, rows) => {
            if (!err) {
                let customerPhonesList = rows.map(x => x.CustomerPhone);
                customerCollection.find({ PhoneNumber: { $in: customerPhonesList } }).toArray((err1, customerInfo) => {
                    let result = {
                        user: getUserRole(req),
                        orders: rows,
                        customerInfo: customerInfo,
                        page,
                        pageSize,
                        searchCustomer,
                        searchPhone,
                        searchOrder
                    };
                    callback(err, result);
                });
            } else {
                console.log(err);
                callback(err, null);
            }
        });
    });
}

exports.getBarcodePage = function (req, callback) { 
    try {

        const brandsCollection = db.collection('brands');

        brandsCollection.find().toArray((err1, brands) => {
            if (err1) {
                console.error('Error querying brand collection:', err1);
                callback(err1, null);
            }

            const categoriesCollection = db.collection('categories');

            categoriesCollection.find().toArray((err2, categories) => {
                if (err2) {
                    console.error('Error querying category collection:', err2);

                    callback(err2, null);
                }
                let result = {
                    user: getUserRole(req),
                    brands: brands.sort(),
                    categories: categories.sort(),
                    display_content: 'None',
                    filter_type: 'None',
                    filter_name: 'None'
                };
                callback(err2, result);

            });
        });
    } catch (error) {
        console.log(error);
    }
}
exports.getViewStocks = function (req, callback) { 
    const stockCollection = db.collection('stocks');

    stockCollection.find().sort({
        TYear: -1,
        Tmonth: -1,
        TDay: -1,
        StockTime: -1
    }).toArray((err, allStocks) => {
        if (err) {
            console.error('Error querying stock collection:', err);

            return;
        }

        const brandsCollection = db.collection('brands');

        brandsCollection.find().toArray((err1, brands) => {
            if (err1) {
                console.error('Error querying brand collection:', err1);

                return;
            }

            const categoriesCollection = db.collection('categories');

            categoriesCollection.find().toArray((err2, categories) => {
                if (err2) {
                    console.error('Error querying category collection:', err2);

                    return;
                }
                let result={
                    user: getUserRole(req),
                    all_stocks: allStocks,
                    brands: brands.sort(),
                    categories: categories.sort(),
                    display_content: 'None',
                    filter_type: 'None',
                    filter_name: 'None'
               };
                callback(err2, result);
            });
        });
    });
}