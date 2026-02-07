$(document).ready(function() {
    loadCart();
});

function loadCart() {
    $.ajax({
        url: '/api/v1/cart/view',
        method: 'GET',
        success: function(items) {
            if (items.length === 0) {
                $('#emptyCart').show();
                $('#cartContainer').hide();
                $('#cartSummary').hide();
                return;
            }
            displayCartItems(items);
            setMinPickupTime();
        },
        error: function(xhr) {
            console.error('Error loading cart:', xhr);
            $('#emptyCart').show();
        }
    });
}

function setMinPickupTime() {
    // Set minimum pickup time to 30 minutes from now
    const now = new Date();
    const minTime = new Date(now.getTime() + 31 * 60000); // 31 minutes from now to be safe
    $('#pickupTime').attr('min', minTime.toISOString().slice(0, 16));
    
    // Set default value to 1 hour from now
    const defaultTime = new Date(now.getTime() + 60 * 60000); // 60 minutes from now
    $('#pickupTime').val(defaultTime.toISOString().slice(0, 16));
}

function displayCartItems(items) {
    $('#emptyCart').hide();
    $('#cartContainer').show().empty();
    $('#cartSummary').show();
    
    let total = 0;
    
    items.forEach(function(item) {
        const itemPrice = parseFloat(item.price || 0);
        const subtotal = item.quantity * itemPrice;
        total += subtotal;
        
        const cartItem = `
            <div class="cart-item" id="cart-item-${item.cartId}">
                <div class="row">
                    <div class="col-md-6">
                        <h4>${item.itemName}</h4>
                        <p>Price: ${itemPrice.toFixed(2)} EGP</p>
                    </div>
                    <div class="col-md-3">
                        <div class="input-group">
                            <span class="input-group-btn">
                                <button class="btn btn-default" onclick="updateQuantity(${item.cartId}, ${item.quantity - 1})">-</button>
                            </span>
                            <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                            <span class="input-group-btn">
                                <button class="btn btn-default" onclick="updateQuantity(${item.cartId}, ${item.quantity + 1})">+</button>
                            </span>
                        </div>
                    </div>
                    <div class="col-md-2 text-right">
                        <h4>${subtotal.toFixed(2)} EGP</h4>
                    </div>
                    <div class="col-md-1 text-right">
                        <button class="btn btn-danger" onclick="removeItem(${item.cartId})">✕</button>
                    </div>
                </div>
            </div>
        `;
        $('#cartContainer').append(cartItem);
    });
    
    $('#cartTotal').text(total.toFixed(2));
}

function updateQuantity(cartId, newQuantity) {
    if (newQuantity < 1) return;
    
    $.ajax({
        url: '/api/v1/cart/edit/' + cartId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ quantity: newQuantity }),
        success: function() {
            loadCart();
        },
        error: function(xhr) {
            const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : 'Unknown error';
            showToast('error', 'Failed to update quantity: ' + error);
        }
    });
}

function removeItem(cartId) {
    showConfirm('Remove this item from cart?', function() {
        $.ajax({
            url: '/api/v1/cart/delete/' + cartId,
            method: 'DELETE',
            success: function() {
                showToast('success', 'Item removed from cart');
                loadCart();
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : 'Unknown error';
                showToast('error', 'Failed to remove item: ' + error);
            }
        });
    });
}

function placeOrder() {
    const pickupTime = $('#pickupTime').val();
    
    if (!pickupTime) {
        showToast('error', 'Please select a pickup time');
        return;
    }
    
    // Validate pickup time is at least 30 minutes from now
    const selectedTime = new Date(pickupTime);
    const now = new Date();
    const minTime = new Date(now.getTime() + 29 * 60000); // 29 minutes to give some buffer
    
    if (selectedTime < minTime) {
        showToast('error', 'Pickup time must be at least 30 minutes from now');
        return;
    }
    
    showConfirm('Place this order for pickup at ' + selectedTime.toLocaleString() + '?', function() {
        // Disable button to prevent double submission
        const $btn = $('#placeOrderBtn');
        $btn.prop('disabled', true).html('<span>Processing...</span>');
        
        $.ajax({
            url: '/api/v1/order/new',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                scheduledPickupTime: selectedTime.toISOString()
            }),
            success: function(response) {
                showToast('success', 'Order placed successfully!');
                setTimeout(function() {
                    window.location.href = '/myOrders';
                }, 1000);
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : 'Unknown error';
                showToast('error', error);
                // Re-enable button on error
                $btn.prop('disabled', false).html('<span>Place Order</span> <span class="btn-arrow">→</span>');
            }
        });
    });
}
