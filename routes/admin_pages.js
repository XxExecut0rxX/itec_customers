const express = require('express');
const adminAuthController = require('../controllers/admin_auth.js');
const user_tables = require('../routes/admin_tables/user_tables');
const product_tables = require('../routes/admin_tables/product_tables.js');

const router = express.Router();

// admin middlewares

const { requireAuth, alreadyLogged } = require('../middleware/admins_middleware.js');

// upload images

const multer = require('multer');
const { memoryStorage } = require('multer');

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, './');
//     },
//     filename: (req, file, cb) => {
//         const f_extension = file.originalname.split('.').pop();
//         cb(null, 'uploaded-' + Date.now + f_extension);
//     }
// });

const storage = memoryStorage();

const upload_image = multer({ storage: storage });

// time ago formatting 
const timeAgo = require('timeago.js/dist/timeago.full.min');

// AUTHENTICATION REQUESTS

router.get('/login', alreadyLogged, (req, res) => {
    const message = req.flash('message');
    const alertType = req.flash('alertType');
    res.render('./admin/session/a_login', {
        message: message,
        alertType: alertType
    });
});

// SIDE BAR GET REQUESTS

router.get('/home', requireAuth, async (req, res) => {
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    const new_orders = await db.query('SELECT id FROM pedido WHERE status = "new"');
    const ready_to_pay_orders = await db.query('SELECT id FROM pedido WHERE status = "ready-to-pay"');
    const out_of_stock = await db.query('SELECT id FROM producto WHERE stock = 0');

    const order_stats = {
        new: new_orders.length, 
        ready_to_pay: ready_to_pay_orders.length,
        out_of_stock: out_of_stock.length,
    };

    console.log(order_stats);

    // order table

    const orders = await db.query("SELECT * FROM pedido ORDER BY id DESC");


    if (!(orders.length > 0)) {
        return res.render('./admin/products/orders.hbs', {
            message: message,
            alertType: alertType,
            orders: orders,
        });

    }
    // console.log("orders", orders);

    // let filters = {};

    // filters.all = orders.length;
    // filters.new = 0;
    // filters.ready_to_pay = 0;
    // filters.completed = 0;
    // filters.canceled = 0;

    let list_client_ids = [];
    for (var i = 0; i < orders.length; i++) {
        list_client_ids.push(orders[i].client_id);

        // check filter numbers 
        // switch (orders[i].status) {
        //     case 'new':
        //         filters.new++;
        //         break;
        //     case 'completed':
        //         filters.completed++;
        //         break;
        //     case 'ready-to-pay':
        //         filters.ready_to_pay++;
        //         break;
        //     case 'canceled':
        //         filters.canceled++;
        //         break;
        //     default:
        //         filters.all = orders.length;
        //         break;
        // }
    }
    // console.log(filters);

    const clients_data = await db.query('SELECT * FROM client WHERE id IN(?)', [list_client_ids]);

    for (var i = 0; i < orders.length; i++) {

        for (var j = 0; j < clients_data.length; j++) {
            if (orders[i].client_id == clients_data[j].id) {
                orders[i].client_name = clients_data[j].first_name;

                orders[i].fecha_de_pedido = timeAgo.format(orders[i].fecha_de_pedido, "es");

                switch (orders[i].status) {
                    case 'new':
                        orders[i].new = true;
                        break;
                    case 'completed':
                        orders[i].completed = true;
                        break;
                    case 'ready-to-pay':
                        orders[i].ready_to_pay = true;
                        break;
                    case 'canceled':
                        orders[i].canceled = true;
                        break;
                    default:
                        orders[i].new = true;
                        break;
                }
                // console.log("match")
            }
        }
    }

    console.log(orders);

    res.render('./admin/a_home', {
        message: message,
        alertType: alertType,
        stats: order_stats,
        orders: orders,
    });
});

    // client pages

router.get('/clients', requireAuth, user_tables.clients);

router.get('/edit_client/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    let client = await db.query('SELECT * FROM client WHERE id = ?', [id]);
    res.render('./admin/clientsNcustomers/edit_client.hbs', {
        client: client[0],
        message: message,
        alertType: alertType
    });
});

    // sales person pages

router.get('/salesperson', requireAuth, user_tables.admins);

router.get('/add_employee', requireAuth, (req, res) => {
    res.render('./admin/clientsNcustomers/add_employee.hbs');
});

router.get('/edit_employee/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    let employee = await db.query('SELECT * FROM administradores WHERE id = ?', [id]);
    res.render('./admin/clientsNcustomers/edit_employee.hbs' ,{
        employee: employee[0],
        message: message,
        alertType: alertType
    });
});

    // products page

router.get('/products', requireAuth, product_tables.products);

router.get('/products/:filter', requireAuth, product_tables.filter_products);

router.get('/add_product', requireAuth, async (req, res) => {
    const message = req.flash('message');
    const alertType = req.flash('alertType');
    const p_categories = await db.query('SELECT * FROM categoria');
    // console.log(p_categories);

    res.render('./admin/products/add_product.hbs', {
        product_categories: p_categories,
        message: message,
        alertType: alertType
    });
});

router.get('/edit_product/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const message = req.flash('message');
    const alertType = req.flash('alertType');
    const p_categories = await db.query('SELECT * FROM categoria');
    const product = await db.query('SELECT * FROM producto WHERE id = ?', [id]);
    const prod_cat_ids = await db.query('SELECT cat_id FROM clasificacion WHERE prod_id = ?', [id]);

    // console.log(p_categories[3].id);
    for(var i = 0; i < prod_cat_ids.length; i++) {
        // console.log("next : ", i)
        for(var j = 0; j < p_categories.length; j++){
            if(p_categories[j].id == prod_cat_ids[i].cat_id) {
                p_categories[j].checked = true;
                // console.log(p_categories[i].id, "ch");
            }
        }
    }
    // console.log(p_categories);
    // console.log(p_categories);

    res.render('./admin/products/edit_product.hbs', {
        product: product[0],
        product_categories: p_categories,

        message: message,
        alertType: alertType
    });
});

    // categories pages

router.get('/categories', requireAuth, product_tables.categories);

router.get('/add_category', requireAuth, (req, res) => {
    const message = req.flash('message');
    const alertType = req.flash('alertType');
    // console.log(p_categories);

    res.render('./admin/products/add_category', {
        message: message,
        alertType: alertType
    });
});

router.get('/edit_category/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const message = req.flash('message');
    const alertType = req.flash('alertType');
    const category = await db.query('SELECT * FROM categoria WHERE id = ?', [id]);
    // console.log(category[0]);

    res.render('./admin/products/edit_category', {
        category: category[0],
        message: message,
        alertType: alertType
    });
});

// orders pages

router.get('/orders', requireAuth, product_tables.orders);

router.get('/orders/details/:id', requireAuth, product_tables.order_details);

router.get('/orders/filter/:data', requireAuth, product_tables.filter_orders)

// POST REQUESTS

router.post('/login', alreadyLogged, adminAuthController.login);

router.get('/logout', requireAuth, adminAuthController.logout)

router.post('/add_employee', requireAuth, adminAuthController.add_employee);

router.get('/delete_employee/:id', requireAuth, adminAuthController.delete_employee);

router.post('/edit_employee/:id', requireAuth, adminAuthController.edit_employee);

// router.post('/add_employee', adminAuthController.add_employee);

router.get('/delete_client/:id', requireAuth, adminAuthController.delete_client);

router.post('/edit_client/:id', requireAuth, adminAuthController.edit_client);

    // products pages

router.post('/add_product', requireAuth, upload_image.single('image'), product_tables.add_product);

router.post('/edit_product/:id', requireAuth, upload_image.single('image'), product_tables.edit_product);

router.get('/delete_product/:id', requireAuth, product_tables.delete_product);

router.post('/add_category', requireAuth, product_tables.add_category);

router.post('/edit_category/:id', requireAuth, product_tables.edit_category);

router.get('/delete_category/:id', requireAuth, product_tables.delete_category);

    // orders

router.post('/orders/details/:id/status', requireAuth, product_tables.order_status);

module.exports = router;