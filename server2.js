if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const Recipient = require("mailersend").Recipient;
const EmailParams = require("mailersend").EmailParams;
const MailerSend = require("mailersend").MailerSend;
const Sender = require("mailersend").Sender;

const express = require('express');
const webpack = require('webpack');
const bwipjs = require('bwip-js');
const webpackConfig = require('./webpack.config.js');
const {
    MongoClient
} = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
let favicon = require('serve-favicon');
const compression = require('compression');
const ejs = require('ejs');
const fs = require('fs');
const checkAuthenticated = require('./middleware/authenticateJWT');
const app = express();
const compiler = webpack(webpackConfig);
app.use(require('webpack-dev-middleware')(compiler, {
    publicPath: webpackConfig.output.publicPath
}));
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));
app.set('views', './views');
app.set('view-engine', 'ejs');
app.use(compression());
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());

const {
    getHomePage,
    getOrderPage,
    getBarcodePage,
    getViewStocks,
} = require('./dbOps');
const {
    getStockQuery,
    deleteStock,
    fetStockItem
} = require('./stockOps');
const {
    getBarcodeQuery
} = require('./barcodeOps');
const {
    getCustomer
} = require('./customerOps.js');
const {
    getBillPage,
    submitBill,
    fetchOrderItem
} = require('./orderOps.js');
const secretKey = process.env.SESSION_SECRET;
let db;
function getUserRole(req) {
    const user = req.cookies.user;
    const role = req.cookies.role;
    return {
        user,
        role
    };
}
function renderTml(filename, tmlData) {
    const template = fs.readFileSync(filename, 'utf-8');
    const compiledTemplate = ejs.compile(template);
    return compiledTemplate(tmlData);
}
const uri = process.env.mongo_host;
const dbName = 'inventoryman';
async function connectToMongo() {
    const client = new MongoClient(uri, {
        useUnifiedTopology: true
    });
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
}
connectToMongo();
app.get('/login', (req, res) => {
    let data = {
        messages: {
            error: null
        }
    };
    res.send(renderTml('views/login.ejs', data))
});
app.get('/register', (req, res) => {
    res.render('register.ejs', {
        messages: {
            error: null
        }
    })
});
app.post('/register', async (req, res) => {
    const {
        email,
        password,
        role
    } = req.body;
    try {
        const existingUser = await db.collection('users').findOne({
            username: email
        });
        if (existingUser) {
            return res.status(400).json({
                error: 'Username already exists'
            });
        }
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                throw err;
            }
            bcrypt.hash(password, salt, async (err, hashedPassword) => {
                if (err) {
                    throw err;
                }
                await db.collection('users').insertOne({
                    username: email,
                    password: hashedPassword,
                    role
                });
                res.render('login.ejs', {
                    messages: {
                        error: "User registered successfully, Login to continue"
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});
app.post('/login', async (req, res) => {
    const {
        email,
        password
    } = req.body;
    try {
        const user = await db.collection('users').findOne({
            username: email
        });
        if (!user) {
            res.render('login.ejs', {
                messages: {
                    error: "Invalid credentials"
                }
            })
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            res.render('login.ejs', {
                messages: {
                    error: "Invalid credentials"
                }
            })
        }
        const token = jwt.sign({
            username: user.username,
            sub: user.role
        }, secretKey, {
            expiresIn: '1h',
        });
        res.cookie('token', token);
        res.cookie('user', email);
        res.cookie('role', user.role);
        res.redirect('/');
    } catch (error) {
        console.error('Error during login:', error);
    }
});
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});
app.get('/', checkAuthenticated, (req, res) => {
    getHomePage(req, (err, result) => {
        res.render('index.ejs', result);
    });
});
app.get('/orders', checkAuthenticated, (req, res) => {
    getOrderPage(req, (err, result) => {
        res.render('orders.ejs', result);
    });
});
app.get('/viewbarcodepage', checkAuthenticated, (req, res) => {
    getBarcodePage(req, (err, result) => {
        res.render('barcodeFilter.ejs', result);
    });
});
app.get('/viewstocks', checkAuthenticated, (req, res) => {
    getViewStocks(req, (err, result) => {
        res.render('viewstocks.ejs', result);
    });
});
app.post('/stocks_query', checkAuthenticated, (req, res) => {
    getStockQuery(req, (err, result) => {
        res.render('viewstocks.ejs', result);
    });
});
app.post('/barcode_query', checkAuthenticated, (req, res) => {
    getBarcodeQuery(req, (err, result) => {
        res.render('barcodeFilter.ejs', result);
    });
});
app.post('/fetchcustomer', checkAuthenticated, (req, res) => {
    getCustomer(req, (err, result) => {
        res.json(result);
    });
});

function generateBarcode(widthCm, heightCm, text, size, headerText, footerText) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: 'code128',
            text: text,
            scale: 3,
            includetext: false,
            textxalign: 'center',
            textfont: 'Inconsolata',
            textsize: 12,
            width: widthCm * 37.7952756,
            height: heightCm * 37.7952756
        }, (err, png) => {
            if (err) {
                reject(err);
            } else {
                resolve({ sticker: `data:image/png;base64,${png.toString('base64')}`, headerText, footerText });
            }
        });
    });
}
app.post('/barcodegen', checkAuthenticated, async (req, res) => {

    const widthCm = 5.25;
    const heightCm = 2.0;
    var products = JSON.parse(req.body.allStocks);
   
    index = 1;
    const generateBarcodePromises = products.map((product,index) => {
        const text = product.ItemID;
        let headerText = product.ItemName + "(" + product.Brand +")";
        let footerText = product.Amount;
        console.log('rendering ', index);
        index = index + 1;
        return generateBarcode(widthCm, heightCm, text, product.Size, headerText, footerText);
    });
    Promise.all(generateBarcodePromises)
        .then(barcodeStickers => {
            const chunkedItems = chunkArray(barcodeStickers, 48);

            // Render the EJS template with barcode stickers data
            console.log('rendering');
            res.render('barcodegen.ejs', { user: getUserRole(req), chunkedItems });
        })
        .catch(error => {
            console.error(error);
            res.status(500).send('Internal Server Error');
        });
    // products.forEach(async product => {
    //     headerText = product.ItemName;
    //     footerText = product.Amount;
    //     let text = product.ItemID;
    //     const x = 0; // You can adjust the x-coordinate based on your layout
    //     const y = 0; // You can adjust the y-coordinate based on your layout

    //     // // Generate barcode using bwip-js
    //     // bwipjs.toBuffer({
    //     //     bcid: 'code128', // Barcode type
    //     //     text: product.ItemID, // Text to encode in the barcode
    //     //     scale: 3, // Scale factor for the barcode
    //     //     includetext: true, // Include text on the barcode
    //     //     textxalign: 'center', // Text horizontal alignment
    //     //     textfont: 'Inconsolata', // Font for the text
    //     //     textsize: 12, // Font size for the text
    //     //     width: stickerWidthCm * 37.7952756, // Convert cm to points
    //     //     height: stickerHeightCm * 37.7952756 // Convert cm to points
    //     // }, (err, png) => {
    //     //     if (err) {
    //     //         console.error(err);
    //     //     } else {
    //     //         // Push barcode data to the array
    //     //         barcodeStickers.push({ x, y, barcode: `data:image/png;base64,${png.toString('base64')}` });
    //     //     }
    //     // });
    //     // Generate barcode using bwip-js (wrapped in a Promise)
    //     const barcodeBuffer = await generateBarcode(text, stickerWidthCm, stickerHeightCm);
    //     // Push barcode data to the array
    //     barcodeStickers.push({ x, y, barcode: `data:image/png;base64,${barcodeBuffer.toString('base64')}` });
    // });
    // // Render the EJS template with barcode stickers data
    // res.render('barcodegen.ejs', { user: getUserRole(req), barcodeStickers });
    // // Render the EJS template with barcode stickers data
    //res.render('barcodegen.ejs', { user: getUserRole(req), barcodeStickers });
    // res.render('barcodegen.ejs', {
    //     user: getUserRole(req),
    //     stickerWidth,
    //     stickerHeight,
    //     barcodeStickers: JSON.parse({
    //         barcodeStickers: req.body.allStocks,
    //     })
    // });
});

// app.post('/barcodegen', checkAuthenticated, (req, res) => {
//     res.render('barcodegen.ejs', {
//         user: getUserRole(req),
//         products: JSON.parse(req.body.allStocks)
//     });
// });
app.post('/deletestock', checkAuthenticated, (req, res) => {
    deleteStock(req, (err, result) => {
        res.redirect('/viewstocks');
    });
})
app.post('/fetchitem', checkAuthenticated, (req, res) => {
    fetStockItem(req, (err, result) => {
        res.json(result);
    });
})
app.get('/billing', checkAuthenticated, (req, res) => {
    getBillPage(req, (err, result) => {
        res.render('bill.ejs', result)
    });
});
app.post('/submitbill', checkAuthenticated, (req, res) => {
    submitBill(req, (err, result) => {
        res.redirect('/orders');
    });
})
app.post('/fetchorderitem', checkAuthenticated, (req, res) => {
    fetchOrderItem(req, (err, result) => {
        res.json(result);
    });
})

app.post('/addcategory', checkAuthenticated, (req, res) => {

    const categoriesCollection = db.collection('categories');

    const newCategory = {
        Category: req.body.new
    };

    categoriesCollection.insertOne(newCategory, (err2, result) => {
        if (err2) {
            console.error('Error inserting new category:', err2);

            return;
        }

        res.redirect('/categories');

    });

})

app.post('/addbrand', checkAuthenticated, (req, res) => {

    const brandsCollection = db.collection('brands');

    const newBrand = {
        Brand: req.body.new.toUpperCase()
    };

    brandsCollection.insertOne(newBrand, (err2, result) => {
        if (err2) {
            console.error('Error inserting new brand:', err2);

            return;
        }

        res.redirect('/brands');

    });

})

app.get('/orders_query', checkAuthenticated, (req, res) => {
    res.redirect('/orders');
});
app.post('/orders_query', checkAuthenticated, (req, res) => {

    const ordersCollection = db.collection('orders');
    const customerCollection = db.collection('customer');

    // const time_type = req.body['exampleRadios'];
    const phone = req.body['phone'];
    // const month = req.body['month'];
    // const year = req.body['year'];
    console.log(phone);

    let aggregationPipeline = [];
    let month_name = "";
    if (phone != null && phone.length == 10) {
        aggregationPipeline.push({
            $match: {
                CustomerPhone: phone
            }
        }, {
            $group: {
                _id: '$TransactionID',
                Amount: {
                    $sum: '$Amount'
                },
                TransactionDate: {
                    $first: '$TransactionDate'
                },
                TransactionTime: {
                    $first: '$TransactionTime'
                },
                CustomerPhone: {
                    $first: '$CustomerPhone'
                }
            }
        });
    }

    // Aggregate based on the selected time criteria
    ordersCollection.aggregate(aggregationPipeline).toArray((err, rows) => {
        if (!err) {
            // Find all documents in the orders collection
            ordersCollection.find().toArray((err1, rows1) => {
                if (!err1) {

                    if (phone != null && phone.length == 10) {
                        customerCollection.find({
                            "PhoneNumber": {
                                $in: [phone]
                            },
                        }).sort({
                            _id: -1
                        }).toArray((err1, customerInfo) => {
                            res.render('orders.ejs', {
                                user: getUserRole(req),
                                orders: rows,
                                customerInfo,
                                sub_orders: rows1,
                                selected_item: "None",
                                month_name: 'Phone',
                                year: phone
                            });
                        });

                    } else {
                        res.render('orders.ejs', {
                            user: getUserRole(req),
                            orders: rows,
                            sub_orders: rows1,
                            selected_item: "time_type",
                            month_name: "time_type" === 'month' ? month_name : 'None',
                            year: "selected_year"
                        });
                    }
                } else {
                    console.log(err1);
                }

                // Close the MongoDB connection

            });
        } else {
            console.log(err);

        }
    });

})

app.get('/sales_filter', checkAuthenticated, (req, res) => {
    rows = {}
    res.render('sales_filter.ejs', {
        user: getUserRole(req),
        is_paramater_set: false,
        time_type: 'none',
        filter_type: 'none',
        display_content: rows,
        month_name: 'None',
        year: "None",
        total_amount: "None"
    })
})

app.get('/stock_filter', (req, res) => {
    res.render('stock_filter.ejs', {
        user: getUserRole(req),
        filter_type: 'None',
        display_content: {},
        total_items: {}
    })
})

app.post('/stock_filter_query', checkAuthenticated, (req, res) => {

    const stockCollection = db.collection('stocks');

    var filter_type = req.body['exampleRadios1'];

    if (filter_type === 'brand') {
        stockCollection.aggregate([{
            $addFields: {
                total: {
                    $multiply: ["$Amount", "$Size"]
                }
                // Calculate amount * size and store in a new field called "total"
            }
        }, {
            $group: {
                _id: "$Brand", // Group by brand
                Amount: {
                    $sum: "$total"
                },
                Brand: {
                    $first: '$Brand'
                }, // Sum the calculated values and store in a field called "totalAmount"
                Count: {
                    $sum: '$Size'
                },
            }
        }, {
            $project: {
                _id: 0,
                Brand: 1,
                Count: 1,
                Amount: 1
            }
        }
        ]).toArray((err, rows) => {
            if (!err) {
                stockCollection.countDocuments({}, (err1, count) => {
                    if (!err1) {
                        res.render('stock_filter.ejs', {
                            user: getUserRole(req),
                            filter_type: filter_type,
                            display_content: rows,
                            total_items: count
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

    if (filter_type === 'category') {
        stockCollection.aggregate([{
            $addFields: {
                total: {
                    $multiply: ["$Amount", "$Size"]
                }
                // Calculate amount * size and store in a new field called "total"
            }
        }, {
            $group: {
                _id: '$Category',
                Count: {
                    $sum: '$Size'
                },
                Category: {
                    $first: '$Category'
                },
                Amount: {
                    $sum: '$total'
                }
            }
        }, {
            $project: {
                _id: 0,
                Category: 1,
                Count: 1,
                Amount: 1
            }
        }
        ]).toArray((err, rows) => {
            if (!err) {
                stockCollection.countDocuments({}, (err1, count) => {
                    if (!err1) {
                        res.render('stock_filter.ejs', {
                            user: getUserRole(req),
                            filter_type: filter_type,
                            display_content: rows,
                            total_items: count
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

})

app.post('/sales_filter_query', checkAuthenticated, (req, res) => {

    const ordersCollection = db.collection('orders');

    const time_type = req.body['exampleRadios'];

    if (time_type == 'month') {
        const month = parseInt(req.body['selected_month']);
        const year = parseInt(req.body['selected_year']);
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const month_name = monthNames[month - 1];

        const filter_type = req.body['exampleRadios1'];

        const aggregationPipeline = [{
            $match: {
                TMonth: month,
                TYear: year
            }
        }, {
            $group: {
                _id: filter_type === 'all' ? '$TransactionDate' : '$' + filter_type,
                Count: {
                    $sum: 1
                },
                Brand: {
                    $first: '$Brand'
                },
                Category: {
                    $first: '$Category'
                },
                Amount: {
                    $sum: '$Amount'
                }
            }
        }
        ];

        ordersCollection.aggregate(aggregationPipeline).toArray((err, rows) => {
            if (!err) {
                const totalAggregationPipeline = [{
                    $match: {
                        TMonth: month,
                        TYear: year
                    }
                }, {
                    $group: {
                        _id: null,
                        Amount: {
                            $sum: '$Amount'
                        },
                        Count: {
                            $sum: 1
                        }
                    }
                }
                ];

                ordersCollection.aggregate(totalAggregationPipeline).toArray((err1, rows1) => {
                    if (!err1) {
                        res.render('sales_filter.ejs', {
                            user: getUserRole(req),
                            is_paramater_set: true,
                            time_type: 'month',
                            filter_type: filter_type,
                            display_content: rows,
                            month_name: month_name,
                            year: year,
                            total_amount: rows1
                        });
                    } else {
                        console.log(err1);
                    }

                    // Close the MongoDB connection

                });
            } else {
                console.log(err);

            }
        });
    }

    if (time_type == 'year') {
        const year = parseInt(req.body['selected_year']);
        const filter_type = req.body['exampleRadios1'];

        const aggregationPipeline = [{
            $match: {
                TYear: year
            }
        }, {
            $group: {
                _id: filter_type === 'all' ? '$TMonth' : '$' + filter_type,
                Count: {
                    $sum: 1
                },
                Amount: {
                    $sum: '$Amount'
                }
            }
        }
        ];

        ordersCollection.aggregate(aggregationPipeline).toArray((err, rows) => {
            if (!err) {
                const totalAggregationPipeline = [{
                    $match: {
                        TYear: year
                    }
                }, {
                    $group: {
                        _id: null,
                        Amount: {
                            $sum: '$Amount'
                        },
                        Count: {
                            $sum: 1
                        }
                    }
                }
                ];

                ordersCollection.aggregate(totalAggregationPipeline).toArray((err1, rows1) => {
                    if (!err1) {
                        const total_amount = rows1;
                        res.render('sales_filter.ejs', {
                            user: getUserRole(req),
                            is_paramater_set: true,
                            time_type: 'year',
                            filter_type: filter_type,
                            display_content: rows,
                            month_name: 'None',
                            year: year,
                            total_amount: total_amount
                        });
                    } else {
                        console.log(err1);
                    }

                    // Close the MongoDB connection

                });
            } else {
                console.log(err);

            }
        });
    }

})


app.get('/categories', checkAuthenticated, (req, res) => {

    const categoriesCollection = db.collection('categories');

    categoriesCollection.find().toArray((err1, category) => {
        if (err1) {
            console.error('Error querying collection:', err1);

            return;
        }

        res.render('categories.ejs', {
            user: getUserRole(req),
            category: category.sort()
        });

    });

})

app.get('/brands', checkAuthenticated, (req, res) => {

    const brandsCollection = db.collection('brands');

    brandsCollection.find().toArray((err2, brand) => {
        if (err2) {
            console.error('Error querying collection:', err2);

            return;
        }

        res.render('brands.ejs', {
            user: getUserRole(req),
            brand:brand.sort()
        });

    });

})

app.get('/stocks', checkAuthenticated, (req, res) => {

    const categoryCollection = db.collection('categories');
    const brandCollection = db.collection('brands');
    const sizeCollection = db.collection('sizes');

    categoryCollection.find().toArray((err1, category) => {
        if (err1) {
            console.error('Error querying category collection:', err1);

            return;
        }

        brandCollection.find().toArray((err2, brand) => {
            if (err2) {
                console.error('Error querying brand collection:', err2);

                return;
            }

            sizeCollection.find().toArray((err3, size) => {
                if (err3) {
                    console.error('Error querying size collection:', err3);

                    return;
                }

                res.render('stocks.ejs', {
                    user: getUserRole(req),
                    category: category.sort(),
                    brand: brand.sort(),
                    size: size
                });

            });
        });
    });

})

app.post('/submitstock', checkAuthenticated, (req, res) => {

    const stockCollection = db.collection('stocks');

    const request1 = req.body;

    const date_format = new Date();
    const transaction_date =
        date_format.getDate() +
        '/' +
        (parseInt(date_format.getMonth() + 1)).toString() +
        '/' +
        date_format.getFullYear();

    const transaction_time =
        date_format.getHours() +
        ':' +
        date_format.getMinutes() +
        ':' +
        date_format.getSeconds();

    const new_req = {};

    for (const i in request1) {
        if (i.includes('number') || i.includes('total')) {
            delete request1[i];
        } else {
            new_req[i] = request1[i];
        }
    }

    const data = Object.entries(new_req).reduce((carry, [key, value]) => {
        const [text] = key.split(/\d+/);
        const index = key.substring(text.length) - 1;
        if (!Array.isArray(carry[index]))
            carry[index] = [];
        carry[index].push(value);
        return carry;
    }, []);

    for (let i = 0; i < data.length; i++) {
        data[i].push(transaction_date);
        data[i].push(transaction_time);
        data[i].push(date_format.getDate());
        data[i].push(date_format.getMonth() + 1);
        data[i].push(date_format.getFullYear());
    }

    var stockAdd = [];
    data.forEach(datas => {
        stockAdd.push({
            UserBy: getUserRole(req),
            ItemID: datas[0],
            ItemName: datas[1],
            Category: datas[2],
            Brand: datas[3].toUpperCase(),
            Size: parseInt(datas[4]),
            Amount: parseFloat(datas[5]),
            StockDate: datas[6],
            StockTime: datas[7],
            TDay: parseInt(datas[8]),
            TMonth: parseInt(datas[9]),
            TYear: parseInt(datas[10])
        })
    })

    stockCollection.insertMany(stockAdd, (err, result) => {
        if (err) {
            console.error('Error inserting values:', err);

            return;
        }

        res.redirect('/viewstocks');

    });

})

app.post('/deleteitem', checkAuthenticated, (req, res) => {

    const ordersCollection = db.collection('orders');

    const deleteid = req.body.deleteid;

    var objectId2 = new ObjectID(deleteid);

    ordersCollection.deleteMany({
        _id: objectId2
    }, (err, result) => {
        console.log('deleting order ' + deleteid);
        if (err) {
            console.error('Error deleting value:', err);

            return;
        }

        res.redirect('/orders');

    });

})

app.post('/deletecategory', checkAuthenticated, (req, res) => {

    const categoriesCollection = db.collection('categories');

    const deleteCategory = req.body.deleteid;

    categoriesCollection.deleteOne({
        Category: deleteCategory
    }, (err2, result) => {
        if (err2) {
            console.error('Error deleting category:', err2);

            return;
        }

        res.redirect('/categories');

    });

})

app.post('/deletebrand', checkAuthenticated, (req, res) => {

    const brandsCollection = db.collection('brands');

    const deleteBrand = req.body.deleteid;

    brandsCollection.deleteOne({
        Brand: deleteBrand
    }, (err2, result) => {
        if (err2) {
            console.error('Error deleting brand:', err2);

            return;
        }

        if (result.deletedCount > 0) { }
        else { }

        res.redirect('/brands');

    });

});

app.post('/sendmail', checkAuthenticated, async (req, res) => {
    fetchOrderItem(req, async (err, result) => {
        var orderDetails = result.rows;
        var htmlOrderTable = "";
        var invoiceNumber = orderDetails[0].TransactionID;
        var customerName = orderDetails[0].CustomerName;
        orderDetails.forEach((order) => {
            htmlOrderTable = htmlOrderTable + `<tr><td style="padding: 5px 10px 5px 0"width="80%"align="left"><p>₹${order.ItemName}</p></td><td style="padding: 5px 0"width="20%"align="left"><p>₹${order.Amount}</p></td></tr>`;
        })
        const mailersend = new MailerSend({
            api_key: "mlsn.bf184150b16271c73d239eed2fc07dc568d9fb774ee97ad148219864554a3feb",
        });

        const recipients = [new Recipient("keyur@thecyclehub.co.in", "Sanju Gajjar")];
        const sentFrom = new Sender("MS_TXAOnw@thecyclehub.co.in", "The Cycle Hub");

        const emailParams = new EmailParams()
            .setFrom(sentFrom)
            .setTo(recipients)
            .setSubject("Subject")
           // .setHtml(htmlOrderTable)
            .setText("Greetings from the team, you got this message through MailerSend.");
        try {
            
      
      await  mailersend.email.send(emailParams, (err) => { 
            console.log("here i am ",err);
      })
        } catch (error) {
            console.log("here i am ", error);
        }
        res.redirect('/orders');
    });
  
});
// Function to split the array into chunks of given size
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
}
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
