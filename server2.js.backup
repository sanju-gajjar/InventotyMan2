

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const nodemailer = require('nodemailer');
const express = require('express');
const webpack = require('webpack');
const bwipjs = require('bwip-js');
const webpackConfig = require('./webpack.config.js');
const { MongoClient } = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const compression = require('compression');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const checkAuthenticated = require('./middleware/authenticateJWT');
const app = express();

// IMPORTANT: Set up middleware BEFORE defining routes
const port = process.env.PORT || 3000;
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(compression());
app.use(favicon(__dirname + '/public/favicon.ico'));

// Serve uploaded invoices
app.use('/invoices', express.static(path.join(__dirname, 'public/invoices')));

const compiler = webpack(webpackConfig);
app.use(require('webpack-dev-middleware')(compiler, {
    publicPath: webpackConfig.output.publicPath
}));

// NOW define routes after middleware is set up
// Endpoint to download invoice PDF - generates HTML page that auto-generates PDF from DB
app.get('/download-invoice/:transactionId', async (req, res) => {
    try {
        const transactionId = decodeURIComponent(req.params.transactionId);
        const ordersCollection = db.collection('orders');
        
        const orders = await ordersCollection.find({ TransactionID: transactionId }).toArray();
        
        if (!orders || orders.length === 0) {
            return res.status(404).send('Invoice not found');
        }
        
        // Return an HTML page that will auto-generate and download the PDF
        res.render('download-invoice.ejs', {
            transactionId: transactionId,
            orders: orders,
            customer: {
                name: orders[0].CustomerName,
                phone: orders[0].CustomerPhone,
                email: orders[0].CustomerEmail,
                address: orders[0].CustomerAddress
            },
            billDate: orders[0].BillDate
        });
    } catch (err) {
        console.error('Error fetching invoice:', err);
        res.status(500).send('Failed to fetch invoice');
    }
});

// API endpoints for autocomplete
app.get('/api/categories', checkAuthenticated, async (req, res) => {
    try {
        const categoriesCollection = db.collection('categories');
        const categories = await categoriesCollection.find().toArray();
        res.json(categories.map(c => c.Category));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.get('/api/brands', checkAuthenticated, async (req, res) => {
    try {
        const brandsCollection = db.collection('brands');
        const brands = await brandsCollection.find().toArray();
        res.json(brands.map(b => b.Brand));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch brands' });
    }
});

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
const uri =process.env.mongo_host;
const dbName = 'inventoryman';
async function connectToMongo() {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    global.db = db; // Make db available globally for other modules
    console.log('Db connected');
}

// app.get('*', (req, res) => {
//    getHomePage(req, (err, result) => {
//        res.render('index.ejs', result);
//    });
//     //res.send("Please pay your oustanding to re-enable your service, please contact your service provider for bill and payment related queries.");
// });
app.get('/login', (req, res) => {
    let data = {
        messages: {
            error: null
        }
    };
   // res.send("Please contact service provider to complete the payment bill for resume the instance");
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
    //res.send("Please pay your oustanding to re-enable your service, please contact your service provider for bill and payment related queries.");
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
function generateBarcode(widthCm, heightCm, text, count, headerText, footerText) {
    const generateBarcodePromises = [];

    for (let i = 0; i < count; i++) {
        generateBarcodePromises.push(new Promise((resolve, reject) => {
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
        }));
    }

    return Promise.all(generateBarcodePromises);
}

app.post('/barcodegen', checkAuthenticated, async (req, res) => {
    const widthCm = 5.25;
    const heightCm = 2.0;
    const products = JSON.parse(req.body.allStocks);

    const generateBarcodePromises = products.map((product) => {
        const text = product.ItemID;
        const headerText = product.ItemName + "(" + product.Brand + ")";
        const footerText = product.Amount;

        return generateBarcode(widthCm, heightCm, text, product.Size, headerText, footerText);
    });

    Promise.all(generateBarcodePromises)
        .then((barcodeStickersArrays) => {
            const barcodeStickers = barcodeStickersArrays.flat();
            const chunkedItems = chunkArray(barcodeStickers, 48);

            // Render the EJS template with barcode stickers data
            console.log('rendering');
            res.render('barcodegen.ejs', { user: getUserRole(req), chunkedItems });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send('Internal Server Error');
        });
});

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
// ...existing code...
// Add /fetchorderitem route after app initialization
app.post('/fetchorderitem', checkAuthenticated, (req, res) => {
    fetchOrderItem(req, (err, result) => {
        if (err) {
            return res.status(500).json({ status: "failed", error: 'Failed to fetch order item', details: err });
        }
        res.json({ status: 200, ...result });
    });
});

// ...existing code...
// Move /fetchorderitem route after app initialization
app.post('/submitbill', checkAuthenticated, async (req, res) => {
    try {
        // Promisify fetchOrderItem if not already
        const fetchOrderItemAsync = (req) => {
            return new Promise((resolve, reject) => {
                fetchOrderItem(req, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        };
        const result = await fetchOrderItemAsync(req);
        var orderDetails = result.rows;
        var htmlOrderTable = "";
        var invoiceNumber = orderDetails[0].TransactionID;
        var customerName = orderDetails[0].CustomerName;
        var CustomerEmail = orderDetails[0].CustomerEmail;
        var total = 0.0;
        orderDetails.forEach((order) => {
            total = total + order.Amount;
            htmlOrderTable = htmlOrderTable + `<tr><td style="padding: 5px 10px 5px 0"width="80%"align="left"><p>₹${order.ItemName}</p></td><td style="padding: 5px 0"width="20%"align="left"><p>₹${order.Amount}</p></td></tr>`;
        });
        let transporter = nodemailer.createTransport({
            host: process.env.ehost,
            port: 587,
            secure: false,
            auth: {
                user: process.env.euser,
                pass: process.env.pass
            }
        });
        let info = await transporter.sendMail({
            from: 'keyurgajjar91@gmail.com',
            to: CustomerEmail,
            subject: `Thank for shoping at Phoner #Invoice: ${invoiceNumber}`,
            text: `Hi, ${customerName}`,
            html: `<!DOCTYPE html PUBLIC'-//W3C//DTD XHTML 1.0 Transitional//EN''http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'><html xmlns='http://www.w3.org/1999/xhtml'xmlns:o='urn:schemas-microsoft-com:office:office'><head><meta charset='UTF-8'><meta content='width=device-width, initial-scale=1'name='viewport'><meta name='x-apple-disable-message-reformatting'><meta http-equiv='X-UA-Compatible'content='IE=edge'><meta content='telephone=no'name='format-detection'><title></title><!--[if(mso 16)]><style type='text/css'>a{text-decoration:none;}</style><![endif]--><!--[if gte mso 9]><style>sup{font-size:100%!important;}</style><![endif]--><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--></head><body><div class='es-wrapper-color'><!--[if gte mso 9]><v:background xmlns:v='urn:schemas-microsoft-com:vml'fill='t'><v:fill type='tile'color='#eeeeee'></v:fill></v:background><![endif]--><table class='es-wrapper'width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-email-paddings'valign='top'><table cellpadding='0'cellspacing='0'class='es-content esd-header-popover'align='center'><tbody><tr><td class='esd-stripe'esd-custom-block-id='7954'align='center'><table class='es-content-body'style='background-color: transparent;'width='600'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-structure es-p15t es-p15b es-p10r es-p10l'align='left'><!--[if mso]><table width='580'cellpadding='0'cellspacing='0'><tr><td width='282'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='esd-container-frame'width='282'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='es-infoblock esd-block-text es-m-txt-c'align='left'><p style='font-family: arial, helvetica\ neue, helvetica, sans-serif;'><br></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='278'valign='top'><![endif]--><table class='es-right'cellspacing='0'cellpadding='0'align='right'><tbody><tr><td class='esd-container-frame'width='278'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td align='right'class='es-infoblock esd-block-text es-m-txt-c'><p></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr></tr><tr><td class='esd-stripe'esd-custom-block-id='7681'align='center'><table class='es-header-body'style='background-color: #044767;'width='600'cellspacing='0'cellpadding='0'bgcolor='#044767'align='center'><tbody><tr><td class='esd-structure es-p35t es-p35b es-p35r es-p35l'align='left'><!--[if mso]><table width='530'cellpadding='0'cellspacing='0'><tr><td width='340'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='es-m-p0r es-m-p20b esd-container-frame'width='340'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-m-txt-c'align='left'><img src="https://i.imgur.com/b1IoAnu.png"><h1 style='color: #ffffff; line-height: 100%;'>Phoner</h1></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='278'valign='top'><![endif]--><table class='es-right'cellspacing='0'cellpadding='0'align='right'><tbody><tr><td class='esd-container-frame'width='278'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td align='right'class='es-infoblock esd-block-text es-m-txt-c'><p></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr></tr><tr><td class='esd-stripe'esd-custom-block-id='7681'align='center'><table class='es-header-body'style='background-color: #044767;'width='600'cellspacing='0'cellpadding='0'bgcolor='#044767'align='center'><tbody><tr><td class='esd-structure es-p35t es-p35b es-p35r es-p35l'align='left'><!--[if mso]><table width='530'cellpadding='0'cellspacing='0'><tr><td width='340'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='es-m-p0r es-m-p20b esd-container-frame'width='340'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-m-txt-c'align='left'><img src="https://i.imgur.com/b1IoAnu.png"><h1 style='color: #ffffff; line-height: 100%;'>Phoner</h1></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='170'valign='top'><![endif]--><table cellspacing='0'cellpadding='0'align='right'><tbody><tr class='es-hidden'><td class='es-m-p20b esd-container-frame'esd-custom-block-id='7704'width='170'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-spacer es-p5b'align='center'style='font-size:0'><table width='100%'height='100%'cellspacing='0'cellpadding='0'border='0'><tbody><tr><td style='border-bottom: 1px solid #044767; background: rgba(0, 0, 0, 0) none repeat scroll 0% 0%; height: 1px; width: 100%; margin: 0px;'></td></tr></tbody></table></td></tr><tr><td><table cellspacing='0'cellpadding='0'align='right'><tbody><tr><td align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text'align='right'><p>The Cycle Hub</p></td></tr></tbody></table></td><td class='esd-block-image es-p10l'valign='top'align='left'style='font-size:0'></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-stripe'align='center'><table class='es-content-body'width='600'cellspacing='0'cellpadding='0'bgcolor='#ffffff'align='center'><tbody><tr><td class='esd-structure es-p40t es-p35b es-p35r es-p35l'esd-custom-block-id='7685'style='background-color: #f7f7f7;'bgcolor='#f7f7f7'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-image es-p20t es-p25b es-p35r es-p35l'align='center'style='font-size:0'></td></tr><tr><td class='esd-block-text es-p15b'align='center'><h2 style='color: #333333; font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;'>Thanks for your purchase</h2></td></tr><tr><td class='esd-block-text es-m-txt-l es-p20t'align='left'><h3 style='font-size: 18px;'>Hello ${customerName},</h3></td></tr><tr><td class='esd-block-text es-p15t es-p10b'align='left'><p style='font-size: 16px; color: #777777;'>Please find the invoice below for your purchase</p></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td class='esd-structure es-p40t es-p40b es-p35r es-p35l'esd-custom-block-id='7685'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p20t'align='center'><h3 style='color: #333333;'>INVOICE</h3></td></tr><tr><td class='esd-block-text es-p15t es-p10b'align='center'><p style='font-size: 16px; color: #777777;'>INVOICE NUMBER: ${invoiceNumber}</p></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table cellpadding='0'cellspacing='0'class='es-content'align='center'><tbody><tr><td class='esd-stripe'align='center'><table class='es-content-body'width='600'cellspacing='0'cellpadding='0'bgcolor='#ffffff'align='center'><tbody><tr><td class='esd-structure es-p20t es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p10t es-p10b es-p10r es-p10l'bgcolor='#eeeeee'align='left'><table style='width: 500px;'class='cke_show_border'cellspacing='1'cellpadding='1'border='0'align='left'><tbody><tr><td width='80%'><h4>Order Confirmation#</h4></td><td width='20%'><h4>${invoiceNumber}</h4></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td class='esd-structure es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p10t es-p10b es-p10r es-p10l'align='left'><table style='width: 500px;'class='cke_show_border'cellspacing='1'cellpadding='1'border='0'align='left'><tbody>${htmlOrderTable}</tbody></table></td></tr></tbody></table></td></tr><tr><td class='esd-structure es-p10t es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table style='border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;'width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p15t es-p15b es-p10r es-p10l'align='left'><table style='width: 500px;'class='cke_show_border'cellspacing='1'cellpadding='1'border='0'align='left'><tbody><tr><td width='80%'><h4>TOTAL</h4></td><td width='20%'><h4>${total}</h4></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr></tr><tr><td class='esd-stripe'esd-custom-block-id='7797'align='center'><table class='es-content-body'style='background-color: #1b9ba3;'width='600'cellspacing='0'cellpadding='0'bgcolor='#1b9ba3'align='center'><tbody><tr><td class='esd-structure es-p35t es-p35b es-p35r es-p35l'align='left'><table cellpadding='0'cellspacing='0'width='100%'><tbody><tr><td width='530'align='left'class='esd-container-frame'><table cellpadding='0'cellspacing='0'width='100%'><tbody><tr><td align='center'class='esd-empty-container'style='display: none;'></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-footer'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-stripe'esd-custom-block-id='7684'align='center'><table class='es-footer-body'width='600'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-structure es-p35t es-p40b es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p35b'align='center'><p><b>Keyur Gajjar</b></p></td></tr><tr><td esdev-links-color='#777777'align='left'class='esd-block-text es-m-txt-c es-p5b'><p style='color: #777777;'>Thanks your shooping and waiting for your next visit.</p></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='esd-footer-popover es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-stripe'align='center'><table class='es-content-body'style='background-color: transparent;'width='600'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-structure es-p30t es-p30b es-p20r es-p20l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='560'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td align='center'class='esd-empty-container'style='display: none;'></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></body></html>`,
        });
        const mailCollection = db.collection('mail');
        const newMail = {
            Total: total,
            From: 'keyurgajjar91@gmail.com',
            To: CustomerEmail,
            MessageId: info.messageId,
            Subject: `Thank for shoping at Phoner #Invoice: ${invoiceNumber}`,
            SentOn: new Date()
        };
        await mailCollection.insertOne(newMail);
        res.status(200).json({
            error: null,
            message: `Message sent: ${info.messageId} to mail: ${CustomerEmail}`
        });
    } catch (err) {
        console.error('Error in /sendmail:', err);
        res.status(500).json({
            error: 'Error Sending mail: ' + err.message
        });
    }
});
// ...existing code...
app.get('/edititem', checkAuthenticated, (req, res) => {
    // res.render('editOrder.ejs', {
    //     user: getUserRole(req),
    //     orderData: getOderData(req.query.edititemid)
    // })
    const ordersCollection = db.collection('orders');
    const customerCollection = db.collection("customer");

    const edititemid = req.query.edititemid;
    var objectId2 = new ObjectID(edititemid);
    // First, find the item by _id to get its TransactionID
    ordersCollection.findOne({ _id: objectId2 }, (err1, item) => {
        if (err1 || !item) {
            console.error('Error editing value:', err1);
            return;
        }
        // Now, find all items with the same TransactionID
        ordersCollection.find({ TransactionID: item.TransactionID }).toArray((err2, items) => {
            if (err2 || !items || items.length === 0) {
                console.error('Error fetching order items:', err2);
                return;
            }
            customerCollection.find({ PhoneNumber: items[0].CustomerPhone }).toArray((err3, customers) => {
                res.render("editOrder.ejs", {
                    user: getUserRole(req),
                    orderItems: items,
                    customerData: customers[0]
                });
            });
        });
    });
    // ordersCollection.find({
    //     _id: objectId2
    // }, (err, result) => {
       

    // });
});
app.post('/edititem', checkAuthenticated, (req, res) => {
        const ordersCollection = db.collection('orders');
        const customerCollection = db.collection("customer");

        // Arrays for multiple items
        const itemIDs = req.body["itemID[]"] || req.body.itemID;
        const _ids = req.body["_id[]"] || req.body._id;
        const billDates = req.body["billDate[]"] || req.body.billDate;
        const itemNames = req.body["itemName[]"] || req.body.itemName;
        const categories = req.body["category[]"] || req.body.category;
        const brands = req.body["brand[]"] || req.body.brand;
        const sizes = req.body["size[]"] || req.body.size;
        const prices = req.body["price[]"] || req.body.price;
        const transactionID = req.body.transactionID;

        // Update all items
        let updatePromises = [];
        for (let i = 0; i < itemIDs.length; i++) {
                updatePromises.push(
                        ordersCollection.updateOne(
                                { _id: new ObjectID(_ids[i]) },
                                {
                                        $set: {
                                                ItemID: itemIDs[i],
                                                ItemName: itemNames[i],
                                                Category: categories[i],
                                                Brand: brands[i],
                                                BillDate: billDates[i],
                                                Size: parseInt(sizes[i]),
                                                Price: parseFloat(prices[i]),
                                                Amount: parseFloat(prices[i]) * parseFloat(sizes[i])
                                        }
                                }
                        )
                );
        }

        // Update customer info
        const customer_id = req.body.customer_id;
        const customerPhone = req.body.customerPhone;
        const customerEmail = req.body.customerEmail;
        const customerName = req.body.customerName;

        Promise.all(updatePromises)
                .then(() => {
                        return customerCollection.updateOne(
                                { _id: new ObjectID(customer_id) },
                                {
                                        $set: {
                                                PhoneNumber: customerPhone,
                                                Email: customerEmail,
                                                CustomerName: customerName
                                        }
                                }
                        );
                })
                .then(() => {
                        res.redirect("/orders");
                })
                .catch((err) => {
                        console.error("Error updating order or customer:", err);
                        res.status(500).send("Internal Server Error");
                });
});
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
app.get('/backup', (req, res) => {
    res.render('backup.ejs', {
        user: getUserRole(req),
        filter_type: 'None',
        display_content: {},
        total_items: {}
    })
})

app.get('/export/csv', async (req, res) => {
    // Get filters from query params
    const { collection, dateField, startDate, endDate } = req.query;
    if (!collection) {
        return res.status(400).send('Collection is required');
    }
    let query = {};
    // Date filter if provided
    if (dateField && startDate && endDate) {
        // Try to parse date string fields (BillDate, StockDate)
        if (dateField === 'BillDate') {
            // BillDate is DD/MM/YYYY or YYYY-MM-DD
            query[dateField] = { $gte: startDate, $lte: endDate };
        } else if (dateField === 'StockDate') {
            // StockDate is YYYY-MM-DD
            query[dateField] = { $gte: startDate, $lte: endDate };
        } else {
            query[dateField] = { $gte: startDate, $lte: endDate };
        }
    }
    // Fetch docs from selected collection
    const docs = await db.collection(collection).find(query).toArray();
    if (docs.length === 0) {
        return res.status(404).send('No data found for selected filters');
    }
    // Collect all field names
    let allHeaders = new Set();
    docs.forEach(doc => {
        Object.keys(doc).forEach(key => allHeaders.add(key));
    });
    // Prepare header row: Collection + all unique field names
    const headers = ['Collection', ...Array.from(allHeaders)];
    let allRows = [headers];
    // Prepare data rows
    docs.forEach(doc => {
        let row = [collection];
        headers.slice(1).forEach(h => {
            let val = doc[h];
            if (typeof val === 'object' && val !== null) {
                val = JSON.stringify(val);
            }
            row.push(val !== undefined ? String(val).replace(/\n/g, ' ') : '');
        });
        allRows.push(row);
    });
    // Convert to CSV string
    function escapeCSV(val) {
        if (val == null) return '';
        val = String(val);
        if (val.includes(',') || val.includes('"')) {
            return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
    }
    const csvString = allRows.map(row => row.map(escapeCSV).join(',')).join('\n');
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=exported_data.csv');
    res.send(csvString);
});

app.post('/submitbill', checkAuthenticated, async (req, res) => {
    try {
        // Promisify fetchOrderItem if not already
        const fetchOrderItemAsync = (req) => {
            return new Promise((resolve, reject) => {
                fetchOrderItem(req, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        };
        const result = await fetchOrderItemAsync(req);
        var orderDetails = result.rows;
        var htmlOrderTable = "";
        var invoiceNumber = orderDetails[0].TransactionID;
        var customerName = orderDetails[0].CustomerName;
        var CustomerEmail = orderDetails[0].CustomerEmail;
        var total = 0.0;
        orderDetails.forEach((order) => {
            total = total + order.Amount;
            htmlOrderTable = htmlOrderTable + `<tr><td style="padding: 5px 10px 5px 0"width="80%"align="left"><p>₹${order.ItemName}</p></td><td style="padding: 5px 0"width="20%"align="left"><p>₹${order.Amount}</p></td></tr>`;
        });
        let transporter = nodemailer.createTransport({
            host: process.env.ehost,
            port: 587,
            secure: false,
            auth: {
                user: process.env.euser,
                pass: process.env.pass
            }
        });
        let info = await transporter.sendMail({
            from: 'keyurgajjar91@gmail.com',
            to: CustomerEmail,
            subject: `Thank for shoping at Phoner #Invoice: ${invoiceNumber}`,
            text: `Hi, ${customerName}`,
            html: `<!DOCTYPE html PUBLIC'-//W3C//DTD XHTML 1.0 Transitional//EN''http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'><html xmlns='http://www.w3.org/1999/xhtml'xmlns:o='urn:schemas-microsoft-com:office:office'><head><meta charset='UTF-8'><meta content='width=device-width, initial-scale=1'name='viewport'><meta name='x-apple-disable-message-reformatting'><meta http-equiv='X-UA-Compatible'content='IE=edge'><meta content='telephone=no'name='format-detection'><title></title><!--[if(mso 16)]><style type='text/css'>a{text-decoration:none;}</style><![endif]--><!--[if gte mso 9]><style>sup{font-size:100%!important;}</style><![endif]--><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--></head><body><div class='es-wrapper-color'><!--[if gte mso 9]><v:background xmlns:v='urn:schemas-microsoft-com:vml'fill='t'><v:fill type='tile'color='#eeeeee'></v:fill></v:background><![endif]--><table class='es-wrapper'width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-email-paddings'valign='top'><table cellpadding='0'cellspacing='0'class='es-content esd-header-popover'align='center'><tbody><tr><td class='esd-stripe'esd-custom-block-id='7954'align='center'><table class='es-content-body'style='background-color: transparent;'width='600'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-structure es-p15t es-p15b es-p10r es-p10l'align='left'><!--[if mso]><table width='580'cellpadding='0'cellspacing='0'><tr><td width='282'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='esd-container-frame'width='282'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='es-infoblock esd-block-text es-m-txt-c'align='left'><p style='font-family: arial, helvetica\ neue, helvetica, sans-serif;'><br></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='278'valign='top'><![endif]--><table class='es-right'cellspacing='0'cellpadding='0'align='right'><tbody><tr><td class='esd-container-frame'width='278'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td align='right'class='es-infoblock esd-block-text es-m-txt-c'><p></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr></tr><tr><td class='esd-stripe'esd-custom-block-id='7681'align='center'><table class='es-header-body'style='background-color: #044767;'width='600'cellspacing='0'cellpadding='0'bgcolor='#044767'align='center'><tbody><tr><td class='esd-structure es-p35t es-p35b es-p35r es-p35l'align='left'><!--[if mso]><table width='530'cellpadding='0'cellspacing='0'><tr><td width='340'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='es-m-p0r es-m-p20b esd-container-frame'width='340'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-m-txt-c'align='left'><img src="https://i.imgur.com/b1IoAnu.png"><h1 style='color: #ffffff; line-height: 100%;'>Phoner</h1></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='278'valign='top'><![endif]--><table class='es-right'cellspacing='0'cellpadding='0'align='right'><tbody><tr><td class='esd-container-frame'width='278'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td align='right'class='es-infoblock esd-block-text es-m-txt-c'><p></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr></tr><tr><td class='esd-stripe'esd-custom-block-id='7681'align='center'><table class='es-header-body'style='background-color: #044767;'width='600'cellspacing='0'cellpadding='0'bgcolor='#044767'align='center'><tbody><tr><td class='esd-structure es-p35t es-p35b es-p35r es-p35l'align='left'><!--[if mso]><table width='530'cellpadding='0'cellspacing='0'><tr><td width='340'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='es-m-p0r es-m-p20b esd-container-frame'width='340'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-m-txt-c'align='left'><img src="https://i.imgur.com/b1IoAnu.png"><h1 style='color: #ffffff; line-height: 100%;'>Phoner</h1></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='170'valign='top'><![endif]--><table cellspacing='0'cellpadding='0'align='right'><tbody><tr class='es-hidden'><td class='es-m-p20b esd-container-frame'esd-custom-block-id='7704'width='170'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-spacer es-p5b'align='center'style='font-size:0'><table width='100%'height='100%'cellspacing='0'cellpadding='0'border='0'><tbody><tr><td style='border-bottom: 1px solid #044767; background: rgba(0, 0, 0, 0) none repeat scroll 0% 0%; height: 1px; width: 100%; margin: 0px;'></td></tr></tbody></table></td></tr><tr><td><table cellspacing='0'cellpadding='0'align='right'><tbody><tr><td align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text'align='right'><p>The Cycle Hub</p></td></tr></tbody></table></td><td class='esd-block-image es-p10l'valign='top'align='left'style='font-size:0'></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></body></html>`,
        });
        const mailCollection = db.collection('mail');
        const newMail = {
            Total: total,
            From: 'keyurgajjar91@gmail.com',
            To: CustomerEmail,
            MessageId: info.messageId,
            Subject: `Thank for shoping at Phoner #Invoice: ${invoiceNumber}`,
            SentOn: new Date()
        };
        await mailCollection.insertOne(newMail);
        res.status(200).json({
            error: null,
            message: `Message sent: ${info.messageId} to mail: ${CustomerEmail}`
        });
    } catch (err) {
        console.error('Error in /sendmail:', err);
        res.status(500).json({
            error: 'Error Sending mail: ' + err.message
        });
    }
});
// Remove global filter_type usage. Instead, declare filter_type inside the route handler where req is available.
// Move filter_type logic inside the route handler where req is available
app.post('/stock_filter_query', checkAuthenticated, async (req, res) => {
    const stockCollection = db.collection('stock');
    const filter_type = req.body && req.body.filter_type ? req.body.filter_type : (req.query && req.query.filter_type ? req.query.filter_type : undefined);
    if (filter_type === 'category') {
        stockCollection.aggregate([
            {
                $addFields: {
                    total: {
                        $multiply: ["$Amount", "$Size"]
                    }
                }
            },
            {
                $group: {
                    _id: '$Category',
                    Count: { $sum: '$Size' },
                    Category: { $first: '$Category' },
                    Amount: { $sum: '$total' }
                }
            },
            {
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
});
// Removed stray closing parenthesis

app.post('/sales_filter_query', checkAuthenticated, async (req, res) => {

    const ordersCollection = db.collection('orders');

    const time_type = req.body['exampleRadios'];

    if (time_type == 'month') {
        // ...existing month logic...
        // (leave unchanged for now)
    } else if (time_type == 'year') {
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
                });
            } else {
                console.log(err);
            }
        });
    }
});
// ...existing code...


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
            brand: brand.sort()
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
        else {

        }

        res.redirect('/brands');

    });

});

app.post('/sendmail', checkAuthenticated, async (req, res) => {
    fetchOrderItem(req, async (err, result) => {
        var orderDetails = result.rows;
        var htmlOrderTable = "";
        var invoiceNumber = orderDetails[0].TransactionID;
        var customerName = orderDetails[0].CustomerName;
        var CustomerEmail = orderDetails[0].CustomerEmail;
        var total = 0.0;
        orderDetails.forEach((order) => {
            total = total + order.Amount;
            htmlOrderTable = htmlOrderTable + `<tr><td style="padding: 5px 10px 5px 0"width="80%"align="left"><p>₹${order.ItemName}</p></td><td style="padding: 5px 0"width="20%"align="left"><p>₹${order.Amount}</p></td></tr>`;
        })
        let transporter = nodemailer.createTransport({
            host: process.env.ehost,
            port: 587,
            secure: false,
            auth: {
                user: process.env.euser,
                pass: process.env.pass
            }
        });
        try {


            let info = await transporter.sendMail({
                from: 'keyurgajjar91@gmail.com',
                to: CustomerEmail,
                subject: `Thank for shoping at Phoner #Invoice: ${invoiceNumber}`,
                text: `Hi, ${customerName}`,
                html: `<!DOCTYPE html PUBLIC'-//W3C//DTD XHTML 1.0 Transitional//EN''http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'><html xmlns='http://www.w3.org/1999/xhtml'xmlns:o='urn:schemas-microsoft-com:office:office'><head><meta charset='UTF-8'><meta content='width=device-width, initial-scale=1'name='viewport'><meta name='x-apple-disable-message-reformatting'><meta http-equiv='X-UA-Compatible'content='IE=edge'><meta content='telephone=no'name='format-detection'><title></title><!--[if(mso 16)]><style type='text/css'>a{text-decoration:none;}</style><![endif]--><!--[if gte mso 9]><style>sup{font-size:100%!important;}</style><![endif]--><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--></head><body><div class='es-wrapper-color'><!--[if gte mso 9]><v:background xmlns:v='urn:schemas-microsoft-com:vml'fill='t'><v:fill type='tile'color='#eeeeee'></v:fill></v:background><![endif]--><table class='es-wrapper'width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-email-paddings'valign='top'><table cellpadding='0'cellspacing='0'class='es-content esd-header-popover'align='center'><tbody><tr><td class='esd-stripe'esd-custom-block-id='7954'align='center'><table class='es-content-body'style='background-color: transparent;'width='600'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-structure es-p15t es-p15b es-p10r es-p10l'align='left'><!--[if mso]><table width='580'cellpadding='0'cellspacing='0'><tr><td width='282'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='esd-container-frame'width='282'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='es-infoblock esd-block-text es-m-txt-c'align='left'><p style='font-family: arial, helvetica\ neue, helvetica, sans-serif;'><br></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='278'valign='top'><![endif]--><table class='es-right'cellspacing='0'cellpadding='0'align='right'><tbody><tr><td class='esd-container-frame'width='278'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td align='right'class='es-infoblock esd-block-text es-m-txt-c'><p></p></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr></tr><tr><td class='esd-stripe'esd-custom-block-id='7681'align='center'><table class='es-header-body'style='background-color: #044767;'width='600'cellspacing='0'cellpadding='0'bgcolor='#044767'align='center'><tbody><tr><td class='esd-structure es-p35t es-p35b es-p35r es-p35l'align='left'><!--[if mso]><table width='530'cellpadding='0'cellspacing='0'><tr><td width='340'valign='top'><![endif]--><table class='es-left'cellspacing='0'cellpadding='0'align='left'><tbody><tr><td class='es-m-p0r es-m-p20b esd-container-frame'width='340'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-m-txt-c'align='left'><img src="https://i.imgur.com/b1IoAnu.png"><h1 style='color: #ffffff; line-height: 100%;'>Phoner</h1></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td><td width='20'></td><td width='170'valign='top'><![endif]--><table cellspacing='0'cellpadding='0'align='right'><tbody><tr class='es-hidden'><td class='es-m-p20b esd-container-frame'esd-custom-block-id='7704'width='170'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-spacer es-p5b'align='center'style='font-size:0'><table width='100%'height='100%'cellspacing='0'cellpadding='0'border='0'><tbody><tr><td style='border-bottom: 1px solid #044767; background: rgba(0, 0, 0, 0) none repeat scroll 0% 0%; height: 1px; width: 100%; margin: 0px;'></td></tr></tbody></table></td></tr><tr><td><table cellspacing='0'cellpadding='0'align='right'><tbody><tr><td align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text'align='right'><p>The Cycle Hub</p></td></tr></tbody></table></td><td class='esd-block-image es-p10l'valign='top'align='left'style='font-size:0'></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]></td></tr></table><![endif]--></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-stripe'align='center'><table class='es-content-body'width='600'cellspacing='0'cellpadding='0'bgcolor='#ffffff'align='center'><tbody><tr><td class='esd-structure es-p40t es-p35b es-p35r es-p35l'esd-custom-block-id='7685'style='background-color: #f7f7f7;'bgcolor='#f7f7f7'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-image es-p20t es-p25b es-p35r es-p35l'align='center'style='font-size:0'></td></tr><tr><td class='esd-block-text es-p15b'align='center'><h2 style='color: #333333; font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;'>Thanks for your purchase</h2></td></tr><tr><td class='esd-block-text es-m-txt-l es-p20t'align='left'><h3 style='font-size: 18px;'>Hello ${customerName},</h3></td></tr><tr><td class='esd-block-text es-p15t es-p10b'align='left'><p style='font-size: 16px; color: #777777;'>Please find the invoice below for your purchase</p></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td class='esd-structure es-p40t es-p40b es-p35r es-p35l'esd-custom-block-id='7685'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p20t'align='center'><h3 style='color: #333333;'>INVOICE</h3></td></tr><tr><td class='esd-block-text es-p15t es-p10b'align='center'><p style='font-size: 16px; color: #777777;'>INVOICE NUMBER: ${invoiceNumber}</p></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table cellpadding='0'cellspacing='0'class='es-content'align='center'><tbody><tr><td class='esd-stripe'align='center'><table class='es-content-body'width='600'cellspacing='0'cellpadding='0'bgcolor='#ffffff'align='center'><tbody><tr><td class='esd-structure es-p20t es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p10t es-p10b es-p10r es-p10l'bgcolor='#eeeeee'align='left'><table style='width: 500px;'class='cke_show_border'cellspacing='1'cellpadding='1'border='0'align='left'><tbody><tr><td width='80%'><h4>Order Confirmation#</h4></td><td width='20%'><h4>${invoiceNumber}</h4></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td class='esd-structure es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p10t es-p10b es-p10r es-p10l'align='left'><table style='width: 500px;'class='cke_show_border'cellspacing='1'cellpadding='1'border='0'align='left'><tbody>${htmlOrderTable}</tbody></table></td></tr></tbody></table></td></tr><tr><td class='esd-structure es-p10t es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table style='border-top: 3px solid #eeeeee; border-bottom: 3px solid #eeeeee;'width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p15t es-p15b es-p10r es-p10l'align='left'><table style='width: 500px;'class='cke_show_border'cellspacing='1'cellpadding='1'border='0'align='left'><tbody><tr><td width='80%'><h4>TOTAL</h4></td><td width='20%'><h4>${total}</h4></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr></tr><tr><td class='esd-stripe'esd-custom-block-id='7797'align='center'><table class='es-content-body'style='background-color: #1b9ba3;'width='600'cellspacing='0'cellpadding='0'bgcolor='#1b9ba3'align='center'><tbody><tr><td class='esd-structure es-p35t es-p35b es-p35r es-p35l'align='left'><table cellpadding='0'cellspacing='0'width='100%'><tbody><tr><td width='530'align='left'class='esd-container-frame'><table cellpadding='0'cellspacing='0'width='100%'><tbody><tr><td align='center'class='esd-empty-container'style='display: none;'></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='es-footer'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-stripe'esd-custom-block-id='7684'align='center'><table class='es-footer-body'width='600'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-structure es-p35t es-p40b es-p35r es-p35l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='530'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-block-text es-p35b'align='center'><p><b>Keyur Gajjar</b></p></td></tr><tr><td esdev-links-color='#777777'align='left'class='esd-block-text es-m-txt-c es-p5b'><p style='color: #777777;'>Thanks your shooping and waiting for your next visit.</p></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table class='esd-footer-popover es-content'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-stripe'align='center'><table class='es-content-body'style='background-color: transparent;'width='600'cellspacing='0'cellpadding='0'align='center'><tbody><tr><td class='esd-structure es-p30t es-p30b es-p20r es-p20l'align='left'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td class='esd-container-frame'width='560'valign='top'align='center'><table width='100%'cellspacing='0'cellpadding='0'><tbody><tr><td align='center'class='esd-empty-container'style='display: none;'></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></body></html>`,
            });
            const mailCollection = db.collection('mail');

            const newMail = {
                Total: total,
                From: 'keyurgajjar91@gmail.com',
                To: CustomerEmail,
                MessageId: info.messageId,
                Subject: `Thank for shoping at Phoner #Invoice: ${invoiceNumber}`,
                SentOn: new Date()
            };

            mailCollection.insertOne(newMail, (err2, result) => {
                if (err2) {
                    console.error('Error Sending mail logging:', err2);
                    res.status(500).json({
                        error: 'Error Sending mail loggingr'
                    });
                }
                res.status(200).json({
                    error: null,
                    message: `Message sent: ${info.messageId} to mail: ${CustomerEmail}`
                });

            });
        } catch (err) {
            res.status(500).json({
                error: 'Error Sending mail' + err.message
            });
        }



    });
});
// // TEMP: Test mail route for debugging email delivery
// app.get('/testmail', async (req, res) => {
//     // Log SMTP config for debugging
//     console.log('SMTP config:', {
//         ehost: process.env.ehost,
//         euser: process.env.euser,
//         pass: process.env.pass
//     });
//     let transporter = require('nodemailer').createTransport({
//         host: process.env.ehost,
//         port: 587,
//         secure: false,
//         auth: {
//             user: process.env.euser,
//             pass: process.env.pass
//         }
//     });
//     try {
//         let info = await transporter.sendMail({
//             from: process.env.euser,
//             to: 'sanju.gajjar2@gmail.com',
//             subject: 'Test Email from InventoryMan2',
//             text: 'This is a test email sent at ' + new Date().toLocaleString(),
//             html: '<b>This is a test email sent at ' + new Date().toLocaleString() + '</b>'
//         });
//         res.json({ success: true, messageId: info.messageId, response: info.response });
//     } catch (err) {
//         console.error('Test mail error:', err);
//         res.status(500).json({
//             success: false,
//             error: err.message,
//             smtpConfig: {
//                 ehost: process.env.ehost,
//                 euser: process.env.euser,
//                 pass: process.env.pass
//             }
//         });
//     }
// });
app.post('/sendmailpdf', checkAuthenticated, async (req, res) => {
    //   fetchOrderItem(req, async (err, result) => {
    const filename = req.body.data.filename;
    const pdf = req.body.data.pdf;
    const invoiceNumber = req.body.data.invoiceNumber;
    const customerName = req.body.data.customerName;
    const customerEmail = req.body.data.customerEmail;
    const total = req.body.data.totalAmount;

    let transporter = nodemailer.createTransport({
        host: process.env.ehost,
        port: 587,
        secure: false,
        auth: {
            user: process.env.euser,
            pass: process.env.pass
        }
    });
    try {
        const pdfAttachment = {
            filename: filename,
            content: Buffer.from(pdf, 'base64'), // Convert Base64 string to Buffer
            encoding: 'base64'
        };
        let info = await transporter.sendMail({
            from: 'keyurgajjar91@gmail.com',
            to: customerEmail,
            subject: `Thanks for purchase at The Phoner #Invoice: ${invoiceNumber}`,
            text: `Hi, ${customerName}\n Please find the attachment for the invoice of your purchase`,
            html: req.body.html,
            attachments: [pdfAttachment],
        });
        const mailCollection = db.collection('mail');
        const newMail = {
            Total: total,
            From: 'keyurgajjar91@gmail.com',
            To: customerEmail,
            MessageId: info.messageId,
            Subject: `Thanks for purchase at The Phoner #Invoice: ${invoiceNumber}`,
            SentOn: new Date(),
            UserBy: getUserRole(req),
        };
        await mailCollection.insertOne(newMail);
        res.status(200).json({
            error: null,
            message: `Message sent: ${info.messageId} to mail: ${customerEmail}`
        });
    } catch (err) {
        res.status(500).json({
            error: 'Error Sending mail' + err.message
        });
    }
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

// Start server after database connection
connectToMongo().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});
