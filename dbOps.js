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
        const pipeline = [
          {
            $addFields: {
              BillDateObj: {
                $cond: [
                  { $regexMatch: { input: "$BillDate", regex: "/\\d{2}\\/\\d{2}\\/\\d{4}/" } },
                  { $dateFromString: { dateString: "$BillDate", format: "%d/%m/%Y" } },
                  { $dateFromString: { dateString: "$BillDate", format: "%Y-%m-%d" } }
                ]
              },
              total: { $multiply: ["$Amount", "$Size"] }
            }
          },
          {
            $match: {
              BillDateObj: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: '_id',
              TotalItemsOrdered: { $sum: "$total" }
            }
          }
        ];
        // For order count
        const countPipeline = [
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
        ordersCollection.aggregate(countPipeline).toArray((err, resultCount) => {
          ordersCollection.aggregate(pipeline).toArray((err, result) => {
            if (err) {
              console.error('Error executing aggregation:', err);
              return;
            }
            var returnData = {
              user: getUserRole(req),
              total_sales: result,
              ord_num: [{ NumberOfProducts: resultCount ? resultCount.length : 0 }],
              stock_num: [{ NumberOfProducts: (resultStocksCount.length != null && resultStocksCount.length != undefined) ? resultStocksCount.length : 0 }],
              total_stock: resultStock,
              period: period,
              startDate: startDate,
              endDate: endDate
            };
            callback(err, returnData);
          });
        });
      });
    });
}
exports.getOrderPage = function (req, callback) { 
    const ordersCollection = db.collection('orders');
    const customerCollection = db.collection('customer');
    ordersCollection
      .aggregate([
        {
          $group: {
            _id: "$TransactionID",
            Amount: {
              $sum: "$Amount"
            },
            TransactionDate: {
              $first: "$TransactionDate"
            },
            TransactionTime: {
              $first: "$TransactionTime"
            },
            CustomerPhone: {
              $first: "$CustomerPhone"
            },
            mongoId: {
              $first: "$_id"
            },
            BillDate: {
              $first: "$BillDate"
            }
          }
        },
        {
          $sort: { mongoId: -1 }
        }
      ])
      .toArray((err, rows) => {
        if (!err) {
          ordersCollection
            .find()
            .sort({ _id: -1 })
            .toArray((err1, rows1) => {
              if (!err1) {
                let customerPhonesList = rows.map(x => x.CustomerPhone);
                customerCollection
                  .find({ PhoneNumber: { $in: customerPhonesList } })
                  .sort({ _id: -1 })
                  .toArray((err1, customerInfo) => {
                    if (customerInfo != null) {
                      let result = {
                        user: getUserRole(req),
                        orders: rows,
                        sub_orders: rows1,
                        customerInfo: customerInfo,
                        selected_item: "None",
                        month_name: "None",
                        year: "None"
                      };
                      callback(err, result);
                    } else {
                      let result = {
                        user: getUserRole(req),
                        orders: rows,
                        sub_orders: rows1,
                        customerInfo: undefined,
                        selected_item: "None",
                        month_name: "None",
                        year: "None"
                      };
                      callback(err, result);
                    }
                  });
              } else {
                console.log(err1);
              }
            });
        } else {
          console.log(err);
        }
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