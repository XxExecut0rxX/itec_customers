// const m_quantity = document.getElementById('m_quantity');
// const p_quantity = document.getElementsByTagName('quantity');
// const product_id = document.getElementById('product_id');

// m_quantity.addEventListener('input', () => {
//     const url = '/marketplace/cart_shopping/update_quantity';
//     const data = { inputValue: inputField.value };

//     fetch(url, {
//         method: 'POST',
//         body: JSON.stringify(data),
//         headers: { 'Content-Type': 'application/json' }
//     });
// });

$(document).ready(function () {
    // $('#').on('input', function () {
    //     const url = '/your/post/endpoint';
    //     const data = { inputValue: $(this).val() }; // 'this' refers to the input field

    //     $.post(url, data); // Use $.post() to send the POST request
    // });
    // console.log($(this));
    $("button[name='action']").on("click", function () {
        // alert($(this).val());
        const input_quantity = $(`input#i${$(this).attr('id')}[name='quantity']`);
        // const total = $(`h5#total_${$(this).attr('id')}`);
        // const price = $(`input#price_${$(this).attr('id')}`);
        
        // if ($(this).val() == "increment") {
        //     input_quantity.val(parseInt(input_quantity.val()) + 1);
        // } else if ($(this).val() == "decrement") {
        //     input_quantity.val(parseInt(input_quantity.val()) - 1);
        // }

        if (parseInt(input_quantity.val()) >= 50) {
            input_quantity.val(50);
        }
        else if (parseInt(input_quantity.val()) <= 1) {
            console.log(input_quantity.val());
            console.log(typeof(input_quantity.val()));
            input_quantity.val(1);
        }


        // total.text(parseFloat((parseFloat(price.val()) * parseInt(input_quantity.val())).toFixed(2)) + " Bs");

        $.ajax({
            url: '/marketplace/cart_shopping/update_quantity', // Update this with your server route
            method: 'POST',
            data: { action: $(this).val(), product_id: $(this).attr('id') },
            success: function (response) {
                // Update the page content (e.g., outputContainer) with the new value
                // $('#subtotal_cash').text('' + response.updatedValue + ' Bs');
                if(response.reloadPage) {
                    location.reload();
                }
            },
            error: function (error) {
                console.error('Error updating value:', error);
            }
        });
    });

    $("input").bind("change paste keyup", function () {
        // alert($(this).val());

        const input_quantity = $(this);
        const product_id = input_quantity.attr('id').match(/\d+/)[0];
        // input_quantity.attr('id', input_quantity.attr('id').match(/\d+/)[0]);
        console.log(product_id);
        const total = $(`h5#total_${product_id}`);
        const price = $(`input#price_${product_id}`);

        if (parseInt(input_quantity.val()) > 50) {
            input_quantity.val(50);
        } 
        else if (input_quantity.val() < 1) {
            input_quantity.val("");
        }

        $.ajax({
            url: '/marketplace/cart_shopping/update_quantity', // Update this with your server route
            method: 'POST',
            data: { action: "custom", product_id, custom: $(this).val() },
            success: function (response) {
                // Update the page content (e.g., outputContainer) with the new value
                // $('#subtotal_cash').text('' + response.updatedValue + ' Bs');
                if (response.reloadPage) {
                    location.reload();
                } else {
                    console.log("not reloaded")
                }
            },
            error: function (error) {
                console.error('Error updating value:', error);
            }
        });

        // console.log(parseInt(input_quantity.val()));
        // console.log(console.log(parseInt(input_quantity.val())));
        // total.text(parseFloat((parseFloat(price.val()) * parseInt(input_quantity.val())).toFixed(2)) + " Bs");
    });
});