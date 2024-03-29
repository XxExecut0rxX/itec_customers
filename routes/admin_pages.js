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

// date and time module for data from the timestamps db
const date = require('date-and-time');
const { db } = require('../database/database.js');

// from json to csv request download file, from the db

var data_exporter = require('json2csv').Parser;

// FUNCTIONS

// pagination funcion

async function pagination(db_query, req, res) {

    const db_result = await db.query(`${db_query}`);

    if (db_result.length <= 0) {
        return { status: "no results" };
    }

    const resultsPerPage = 15;
    const numberOfResults = db_result.length;
    const numberOfPages = Math.ceil(numberOfResults / resultsPerPage);

    let page = req.query.page ? Number(req.query.page) : 1;
    console.log("query page: ", req.query.page);
    if (Number.isNaN(page))
        page = 1;

    // console.log("current_page: ", page, "N of pages: " + numberOfPages, numberOfResults,numberOfResults / resultsPerPage);
    console.log(req.originalUrl);
    if (page > numberOfPages) {
        // redirect inserting query number
        console.log("page: ", page, " page more than the minimunPages");
        return { status: "return if over pages", numberOfPages };
    } else if (page < 1) {
        console.log("page: ", page, " page less than the minimunPages");
        return { status: "return if lower pages", numberOfPages };
    }
    else {
        { status: "" }
        console.log("None of the page security conditions matched");
    }
    // setting up result start and end limits according to the page number

    const startLimit = (page - 1) * resultsPerPage;

    const get_page_result = await db.query(`${db_query} LIMIT ${startLimit}, ${resultsPerPage}`);

    // bar iteration for pagination numbers and buttons foward and backward

    let iterator = (page - 5) < 1 ? 1 : page - 5;
    let endingLink = (iterator + 9) <= numberOfPages ? (iterator + 0) : page + (numberOfPages - page);


    let result = {
        result: get_page_result,
        page,
        numberOfPages,
        iterator,
        endingLink
    };

    return result;
}

function pagination_bar(pagination_data) {
    let result = pagination_data;

    if (result.page > 1) {
        result.previous = result.page - 1;
    } else {
        result.previous = false;
    }

    if (result.page < result.numberOfPages) {
        result.next = result.page + 1;
    } else {
        result.next = false;
    }

    result.display_nums = [];
    result.currentPageActive = [];
    for (let i = 0; i < result.endingLink; i++) {
        if (i + 1 == result.page)
            result.currentPageActive.push(true);
        else
            result.currentPageActive.push(false);

        result.display_nums.push(i + 1);
    }


    return result;
}

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
    const out_of_stock = await db.query('SELECT id FROM producto WHERE stock = 0 AND isDeleted = false');
    
    const order_stats = {
        new: new_orders.length, 
        ready_to_pay: ready_to_pay_orders.length,
        out_of_stock: out_of_stock.length,
    };
    // date filter
    const { filter_date } = req.query;
    const { date_start, date_end } = req.query;
    console.log(filter_date);
    
    // console.log(order_stats);

    let orders;
    // order table
    if(filter_date == "this week") {
        // get orders from the last week
        orders = await db.query("select * from pedido where fecha_de_pedido > now() -  interval 7 day ORDER BY id DESC");    
    }else if(filter_date == "this month") {
        orders = await db.query("select * from pedido where MONTH(fecha_de_pedido) = MONTH(now()) and YEAR(fecha_de_pedido) = YEAR(now()) ORDER BY id DESC");    

    }else if(date_start) {
        console.log(date_start, date_end);
        orders = await db.query("select * from pedido where fecha_de_pedido >= ? AND fecha_de_pedido <= ? ORDER BY id DESC", [date_start, date_end]);    
    }else {
        orders = await db.query("select * from pedido where fecha_de_pedido > now() -  interval 7 day ORDER BY id DESC");    
    }

    // const orders = await db.query("SELECT * FROM pedido ORDER BY id DESC");
    // console.log(orders);
    if (!(orders.length > 0)) {
        return res.render('./admin/a_home', {
            message: message,
            alertType: alertType,
            stats: order_stats,
            orders: orders,
        });

    }

    let list_client_ids = [];
    for (var i = 0; i < orders.length; i++) {
        list_client_ids.push(orders[i].client_id);
    }
    // console.log(filters);

    const clients_data = await db.query('SELECT * FROM client WHERE id IN(?)', [list_client_ids]);

    for (var i = 0; i < orders.length; i++) {

        for (var j = 0; j < clients_data.length; j++) {
            if (orders[i].client_id == clients_data[j].id) {
                orders[i].client_name = clients_data[j].email;

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

    // console.log(orders);

    res.render('./admin/a_home', {
        message: message,
        alertType: alertType,
        stats: order_stats,
        orders: orders,
    });
});

    // client pages

router.get('/clients', requireAuth, user_tables.clients);

router.get('/clients/search', requireAuth, user_tables.search4Clients);

router.get('/edit_client/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    const client = await db.query('SELECT * FROM client WHERE id = ?', [id]);

    await db.query("SELECT * FROM pedido ORDER BY id DESC", async (error, result) => {
        if (error)
            console.log(error);

        // pagination

        // console.log("deffff");
        const pagination_format = await pagination(`SELECT * FROM pedido WHERE client_id = ${client[0].id} ORDER BY id DESC`, req, res);
        const link_page = "/admin/client/edit_client/" + client[0].id;

        // if try to ingress to a different page range
        if (pagination_format.status == "return if over pages") {
            return res.redirect(link_page + '?page=' + encodeURIComponent(pagination_format.numberOfPages));
        }
        else if (pagination_format.status == "return if lower pages") {
            return res.redirect(link_page + '?page=' + encodeURIComponent(1))
        }
        else if (pagination_format.status == "no results") {
            const orders = pagination_format.result;
            return res.render('./admin/clientsNcustomers/edit_client.hbs', {
                message: message,
                alertType: alertType,
                client: client[0],
                orders: orders,
            });
        }

        const pagination_data = {
            page: pagination_format.page,
            numberOfPages: pagination_format.numberOfPages,
            iterator: pagination_format.iterator,
            endingLink: pagination_format.endingLink
        }
        // console.log(pagination_format);

        // pagination bar
        const pag_bar = pagination_bar(pagination_data);
        pag_bar.link = link_page;
        console.log(pag_bar);

        // end pagination

        const orders = pagination_format.result;

        console.log("orders", orders);


        for (var i = 0; i < orders.length; i++) {
            if (orders[i].client_id == client[0].id) {
                orders[i].client_name = client[0].first_name;

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

        console.log(orders);
        return res.render('./admin/clientsNcustomers/edit_client.hbs', {
            message: message,
            alertType: alertType,
            client: client[0],
            orders: orders,
            pagination_bar: pag_bar,
        });

    });

    // res.render('./admin/clientsNcustomers/edit_client.hbs', {
    //     client: client[0],
    //     message: message,
    //     alertType: alertType
    // });
});

    // sales person pages

router.get('/salesperson', requireAuth, user_tables.admins);

router.get('/salesperson/search', requireAuth, user_tables.search4Salesperson);

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

router.get('/products/search', requireAuth, product_tables.searchProducts);

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

router.get('/categories/search', requireAuth, product_tables.searchCategories);

router.get('/add_category', requireAuth, (req, res) => {
    const message = req.flash('message');
    const alertType = req.flash('alertType');
    // console.log(p_categories);

    res.render('./admin/products/add_category', {
        message: message,
        alertType: alertType
    });
});

router.get('/edit_category/:id', requireAuth, product_tables.edit_category_get_req);

// orders pages

router.get('/orders', requireAuth, product_tables.orders);

router.get('/orders/search', requireAuth, product_tables.searchOrder);

router.get('/orders/details/:id', requireAuth, product_tables.order_details);

router.get('/orders/filter/:data', requireAuth, product_tables.filter_orders);

// reports

router.get('/reports', requireAuth, async (req, res) => {
    // const { id } = req.params;
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    const reports = await db.query('SELECT * FROM reportes');
    // console.log("formatted date : ", date.format(reports[0].date_created, 'YYYY/MM/DD HH:mm:ss'))
    for(let i = 0; i < reports.length; i++){
        reports[i].date_created = date.format(reports[i].date_created, 'YYYY-MM-DD');
    }

    // let client = await db.query('SELECT * FROM client WHERE id = ?', [id]);
    res.render('./admin/products/reports.hbs', {
        message: message,
        alertType: alertType,
        reports: reports,
    });
});

// report details

router.get('/reports/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    const report_details = {};

    const report_db = await db.query(`SELECT * FROM detalles_de_reportes WHERE report_id = ${id}`);
    
    // format datetype timestamps from db
    for(let i = 0; i < report_db.length;i++){
        report_db[i].date_triggered = date.format(report_db[i].date_triggered, 'YYYY-MM-DD');
    }
    
    report_details.data = report_db;
    const reports = await db.query(`SELECT name FROM reportes WHERE id = ${id}`);
    report_details.name = reports[0].name;


    console.log(report_details);
    // let client = await db.query('SELECT * FROM client WHERE id = ?', [id]);
    res.render('./admin/products/report_details.hbs', {
        message: message,
        alertType: alertType,
        report_details,
    });
});

router.get('/report/export-to-csv', requireAuth, async (req, res, next) => {
    const {name} = req.query;
    // console.log(name);

    const query_from_name = (await db.query(`SELECT id,db FROM reportes WHERE name = '${name}'`))[0];
    const query_id = query_from_name.id;
    const query_db = query_from_name.db;
    // THERES THE NEXT PART OF THE VIDEO LEFT FROM MINUTE 10:30
    // console.log(query_id);
    db.query(`SELECT * FROM detalles_de_reportes WHERE report_id = ${query_id}`, (error, result) => {
        if(error)
            console.log(error);

        const result_date_format = result;
        for (let i = 0; i < result.length; i++) {
            result_date_format[i].date_triggered = date.format(result[i].date_triggered, 'YYYY-MM-DD');
        }

        console.log("result",result_date_format);
        var mysql_data = JSON.parse(JSON.stringify(result_date_format));

        // convert json data to CSV

        var file_header = ['ID',query_db,'Fecha','Mensaje'];

        var json_data = new data_exporter({file_header});

        var csv_data = json_data.parse(mysql_data);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=Reporte\ de\ ${name}.csv`);
        return res.end(csv_data);
    });

});

router.get('/report/delete_report/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    // console.log(id);
    await db.query(`UPDATE reportes SET isActive = 0 WHERE id = ${id}`, (error, result) => {
        if(error)
            console.log(error);

        req.flash('message', 'El reporte se eliminó exitosamente');
        req.flash('alertType', 'alert-success');
        return res.redirect('/admin/reports');
    });
});

router.post('/report/add_report', requireAuth, async (req, res) => {
    const {id} = req.body;
    // console.log(id);

    if(id == 'null') {
        return res.redirect('/admin/reports');
    }

    // DELETE PREVIOUS REPORTS IF NECESSARY TO WIPE ALL PREVIOUS DATA FROM DB;
    // const delete_previous_reports = await db.query(`DELETE FROM detalles_de_reportes WHERE report_id = ${id}`);
    await db.query(`UPDATE reportes SET isActive = 1 WHERE id = ${id}`, (error, result) => {
        if (error)
            console.log(error);

        req.flash('message', 'El reporte se añadió exitosamente');
        req.flash('alertType', 'alert-success');
        return res.redirect('/admin/reports');
    });
    // res.status(200).send("dfsd", ar);
});

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