const { db } = require("../../database/database");

exports.products = async (req, res) => {
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    // console.log(message);


    await db.query("SELECT * FROM producto", async(error, result) => {
        if (error)
            console.log(error);
        
        let products = result;

        for(var i = 0; i < products.length; i++){

            product_category_ids = await db.query("SELECT cat_id FROM clasificacion WHERE prod_id = ?", [products[i].id]);
            
            let name_categories = [];
            // console.log(product_category_ids);
            // console.log(cat_ids);

            for(var j = 0; j < product_category_ids.length; j++) {
                if(product_category_ids[j]) {
                    let get_cat_name = await db.query("SELECT name FROM categoria WHERE id = ?", [product_category_ids[j].cat_id]);
                    // console.log(get_cat_name[0].name);
                    name_categories.push(get_cat_name[0].name);
                    // console.log("categories push: ", categories);
                }

            }
            products[i].categories = name_categories;
            // console.log(products[i]);
            // console.log("next id", categories);
        }

        // console.log(products);
        if (products) {
            // console.log(result);
            return res.render('./admin/products/products.hbs', {
                message: message,
                alertType: alertType, 
                products: products,
            });
        }
        else
            console.log("nop");

    });

}

exports.add_product = async (req, res) => {

    const { image, product_name, price, stock, categories } = req.body;
    
    console.log(req.body);
    
    if (!product_name || !price || !stock) {
        req.flash('message', "No puede dejar espacios vacios");
        req.flash('alertType', "alert-danger");
        return res.redirect(req.originalUrl);
    };
    // console.log(categories);
    if (categories == null){
        req.flash('message', "Debe seleccionar al menos una categoria");
        req.flash('alertType', "alert-warning");
        return res.redirect(req.originalUrl);
    }

    await db.query("SELECT name FROM producto WHERE name = ?", [product_name], async (error, result) => {
        if (error)
        console.log(error);
        
        if (result.length > 0){
            req.flash('message', "El producto ya existe");
            req.flash('alertType', "alert-warning");
            return res.redirect(req.originalUrl);
        }

        // console.log(typeof(hashedPassword));
        // console.log(hashedPassword.length);

        await db.query('INSERT INTO producto SET ?', { name: product_name, price: price, stock: stock }, async (error, result) => {
            if (error)
                console.log(error);

            else {
                await db.query("SELECT id FROM producto WHERE name = ?" , [product_name], async (error, result) => {
                    if (error)
                        console.log(error);

                    let p_id = result;
                    // console.log("last id: ", p_ids);
                    product_id = p_id[0].id;
                    console.log("prod id: ", product_id);
                    
                    let cat_type = typeof (categories);
                    
                    if(cat_type.includes('obj')) {
                        categories.forEach(async category_id => {
                        // console.log(category_id);
                        await db.query('INSERT INTO clasificacion SET ?', { cat_id: category_id, prod_id: product_id });
                        });
                    }
                    else {
                        await db.query('INSERT INTO clasificacion SET ?', { cat_id: categories, prod_id: product_id });
                        
                    }
                    req.flash('message', "Producto registrado exitosamente.");
                    req.flash('alertType', "alert-success");
                    return res.redirect('/admin/products');
                });

                // XCONSOEL TYPEOF CATEGORIES

            }

        });
    });

    // res.send("ok");
}

exports.edit_product = async (req, res) => {
    const { id } = req.params;
    const { image, product_name, price, stock, categories } = req.body;

    console.log(req.body);

    if (!product_name || !price || !stock) {
        req.flash('message', "No puede dejar espacios vacios");
        req.flash('alertType', "alert-danger");
        return res.redirect(req.originalUrl);
    };
    // console.log(categories);
    if (categories == null) {
        req.flash('message', "Debe seleccionar al menos una categoria");
        req.flash('alertType', "alert-warning");
        return res.redirect(req.originalUrl);
    }

    await db.query("SELECT name FROM producto WHERE name = ?", [product_name], async (error, result) => {
        if (error)
            console.log(error);

        // console.log(typeof(hashedPassword));
        // console.log(hashedPassword.length);

        await db.query('UPDATE producto SET ? WHERE id = ' + id, { name: product_name, price: price, stock: stock }, async (error, result) => {
            if (error)
                console.log(error);

            else {;
                product_id = id;
                console.log("prod id: ", product_id);

                let cat_type = typeof (categories);

                if (cat_type.includes('obj')) {
                    await db.query('DELETE FROM clasificacion WHERE prod_id = ?', [id]);
                    categories.forEach(async category_id => {
                        // console.log(category_id);
                        await db.query('INSERT INTO clasificacion SET ?', { cat_id: category_id, prod_id: product_id });
                    });
                }
                else {
                    await db.query('DELETE FROM clasificacion WHERE prod_id = ?', [id]);
                    await db.query('INSERT INTO clasificacion SET ?', { cat_id: categories, prod_id: product_id });
                }
                req.flash('message', "Se actulizó el producto exitosamente.");
                req.flash('alertType', "alert-success");
                return res.redirect(req.originalUrl);

                // XCONSOEL TYPEOF CATEGORIES

            }

        });
    });

    // res.send("ok");
}


// categories section

exports.categories = async (req, res) => {
    const message = req.flash('message');
    const alertType = req.flash('alertType');

    // console.log(message);

    await db.query("SELECT * FROM categoria", async (error, result) => {
        if (error)
            console.log(error);

        categorias = result;
        if (result) {
            // console.log(result);
            return res.render('./admin/products/categories.hbs', {
                categories: categorias,
                message: message,
                alertType: alertType,
            });
        }
        else
            console.log("nop");

    });

}