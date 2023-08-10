const express = require('express');
const authController = require('../controllers/auth.js');
const { db } = require('../database/database.js');

const router = express.Router();

// authentication jwt
const { requireAuth, checkUser, alreadyLogged } = require('../middleware/customers_middleware.js');
// const { products } = require('./admin_tables/product_tables.js');
const marketplace = require('./marketplace/marketplace_pages.js');

// GET ROUTES

router.get('/', (req, res) => {

    // console.log(loggedIn);
    res.render('index.hbs');
});

router.get('/login', alreadyLogged, (req, res) => {
    res.render('./session/login.hbs')
});

router.get('/register', alreadyLogged, (req, res) => {
    res.render('./session/register.hbs')
});

router.get('/profile', requireAuth, (req, res) => {
    res.render('./session/profile_customers.hbs');
});

///marketplace section

router.get('/marketplace', requireAuth, marketplace.marketplace);

router.get('/marketplace/product/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    // console.log('id : ', id)
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    let product = await db.query("SELECT * FROM producto WHERE id = ?", [id]);
    let categories = await db.query("SELECT * FROM categoria");

    //stock functionality for one product

    if (product[0].stock <= 5 && product[0].stock > 0) {
        product[0].little_stock = true;
        // console.log("little product", products[i].little_stock);
    }

    // console.log(product);
    // console.log(categories);
    res.render('./marketplace/product.hbs', {
        categories: categories,
        product: product[0],
        message: message,
        alertType: alertType,
    });
});


router.get('/marketplace/cart_shopping', requireAuth, async (req, res) => {
    const client_id = res.locals.user.id;
    console.log('id : ', client_id)
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    let cart_products = await db.query("SELECT * FROM cart_shopping WHERE client_id = ?", [client_id]);
    // console.log(cart_products);
    let product;
    let products = [];
    let total_cash = 0;
    let n_products = 0;

    for( var i = 0; i < cart_products.length; i++){
        product = await db.query("SELECT * FROM producto WHERE id = ?", [cart_products[i].producto_id]);
        products.push(product[0]);
        products[i].quantity = cart_products[i].cantidad;
        total_cash += product[0].price * cart_products[i].cantidad;
        n_products++;
    }

    let pedido = false;
    const client_orders = await db.query("SELECT * FROM pedido WHERE client_id = ?", [client_id]);
    console.log(client_orders[client_orders.length - 1].status);
    if (!(client_orders[client_orders.length - 1].status == 'canceled') && !(client_orders[client_orders.length - 1].status == 'completed'))
        pedido = true;
    else { pedido = false }
    // console.log(products);
    // console.log(cart_products);
    // console.log(categories);
    res.render('./marketplace/cart_shopping.hbs', {
        order: pedido,
        total_cash: total_cash,
        n_products: n_products,
        products: products,
        message: message,
        alertType: alertType,
    });
});

router.post('/marketplace/search', requireAuth, marketplace.searchInMarketplace);

router.get('/marketplace/cart_shopping/checkout', requireAuth, marketplace.checkout);


// POST ROUTES

router.post('/register', alreadyLogged, authController.register);

router.post('/login', alreadyLogged, authController.login);

router.post('/profile', checkUser, authController.profile);

router.get('/logout', authController.logout);

    // marketplace posts

router.post('/marketplace/cart_shopping/add_product/:id', checkUser, marketplace.add_to_shopping_cart);

router.get('/marketplace/product/cart_shopping/remove_product/:id', requireAuth, marketplace.delete_cart_product);

router.post('/marketplace/cart_shopping/make_order', checkUser, marketplace.make_order);

router.post('/marketplace/cart_shopping/cancel_order', checkUser, marketplace.cancel_order);

router.post('/marketplace/cart_shopping/checkout', checkUser, async (req, res) => {
    const cart_products = req.body;
    const client_id = res.locals.user.id;
    // console.log("post cid: ", client_id);

    for (var i = 0; i < cart_products.product_id.length; i++) {
        await db.query(`UPDATE cart_shopping SET cantidad = ${cart_products.quantity[i]} WHERE client_id = ${client_id} AND producto_id = ${cart_products.product_id[i]}`);
    }

    return res.redirect('/marketplace/cart_shopping/checkout');
});

module.exports = router;