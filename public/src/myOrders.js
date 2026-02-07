$(document).ready(function() {
    loadOrders();
});

function loadOrders() {
    $.ajax({
        url: '/api/v1/order/myOrders',
        method: 'GET',
        success: function(orders) {
            if (orders.length === 0) {
                $('#emptyState').show();
                $('#ordersContainer').hide();
                return;
            }
            displayOrders(orders);
        },
        error: function(xhr) {
            console.error('Error loading orders:', xhr);
            $('#emptyState').show();
        }
    });
}

function displayOrders(orders) {
    $('#emptyState').hide();
    $('#ordersContainer').show().empty();
    
    orders.forEach(function(order) {
        const statusClass = getStatusClass(order.orderStatus);
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const canCancel = canCancelOrder(order);
        
        const cancelButton = canCancel ? 
            `<button class="btn btn-sm btn-danger" onclick="cancelOrder(${order.orderId})">Cancel</button>` : '';
        
        const orderCard = `
            <div class="order-card" id="order-${order.orderId}">
                <div class="row">
                    <div class="col-md-2">
                        <strong>Order #${order.orderId}</strong>
                    </div>
                    <div class="col-md-2">
                        <span>${order.truckName || 'Truck ID: ' + order.truckId}</span>
                    </div>
                    <div class="col-md-2">
                        <span class="badge ${statusClass}">${order.orderStatus}</span>
                    </div>
                    <div class="col-md-2">
                        <strong>${parseFloat(order.totalPrice || 0).toFixed(2)} EGP</strong>
                    </div>
                    <div class="col-md-2">
                        <small>${orderDate}</small>
                    </div>
                    <div class="col-md-2 text-right">
                        <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.orderId})" style="margin-right: 5px;">Details</button>
                        ${cancelButton}
                    </div>
                </div>
            </div>
        `;
        $('#ordersContainer').append(orderCard);
    });
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'preparing': 'status-preparing',
        'ready': 'status-ready',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusMap[status] || '';
}

function canCancelOrder(order) {
    // Can't cancel if already cancelled, completed, or ready
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed' || order.orderStatus === 'ready') {
        return false;
    }
    
    // Check time constraint (10 minutes)
    const orderTime = new Date(order.createdAt);
    const currentTime = new Date();
    const timeDifference = (currentTime - orderTime) / 1000 / 60; // in minutes
    
    // Allow cancellation within 10 minutes for pending orders, or always for pending status
    if (order.orderStatus === 'pending') {
        return true;
    }
    
    if (order.orderStatus === 'preparing' && timeDifference <= 10) {
        return true;
    }
    
    return false;
}

function cancelOrder(orderId) {
    console.log('Attempting to cancel order:', orderId);
    
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }
    
    $.ajax({
        url: '/api/v1/order/cancel/' + orderId,
        method: 'POST',
        success: function(response) {
            console.log('Cancel success:', response);
            showToast('success', response.message || 'Order cancelled successfully');
            // Reload orders to reflect the change
            loadOrders();
        },
        error: function(xhr) {
            console.error('Cancel error:', xhr);
            console.error('Status:', xhr.status);
            console.error('Response:', xhr.responseJSON);
            const errorMsg = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Failed to cancel order';
            showToast('error', errorMsg);
        }
    });
}

function viewOrderDetails(orderId) {
    $.ajax({
        url: '/api/v1/order/details/' + orderId,
        method: 'GET',
        success: function(order) {
            displayOrderDetails(order);
            $('#orderDetailsModal').modal('show');
        },
        error: function(xhr) {
            alert('Error loading order details: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function displayOrderDetails(order) {
    let itemsHtml = '';
    
    if (order.items && order.items.length > 0) {
        itemsHtml = '<table class="table table-bordered"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>';
        
        order.items.forEach(function(item) {
            const price = parseFloat(item.price || 0);
            const subtotal = item.quantity * price;
            itemsHtml += `
                <tr>
                    <td>${item.itemName}</td>
                    <td>${item.quantity}</td>
                    <td>${price.toFixed(2)} EGP</td>
                    <td>${subtotal.toFixed(2)} EGP</td>
                </tr>
            `;
        });
        
        itemsHtml += '</tbody></table>';
    }
    
    const detailsHtml = `
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Truck:</strong> ${order.truckName || 'N/A'}</p>
        <p><strong>Status:</strong> <span class="badge ${getStatusClass(order.orderStatus)}">${order.orderStatus}</span></p>
        <p><strong>Total Amount:</strong> ${parseFloat(order.totalPrice || 0).toFixed(2)} EGP</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        ${order.scheduledPickupTime ? '<p><strong>Scheduled Pickup:</strong> ' + new Date(order.scheduledPickupTime).toLocaleString() + '</p>' : ''}
        ${order.estimatedEarliestPickup ? '<p><strong>Earliest Pickup:</strong> ' + new Date(order.estimatedEarliestPickup).toLocaleString() + '</p>' : ''}
        <hr>
        <h4>Order Items:</h4>
        ${itemsHtml}
    `;
    
    $('#orderDetailsContent').html(detailsHtml);
}

function showToast(type, message) {
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast-notification alert alert-${type === 'success' ? 'success' : 'danger'}">
            <button type="button" class="close" onclick="$('#${toastId}').remove()">&times;</button>
            <strong>${type === 'success' ? 'Success!' : 'Error!'}</strong> 
            <span>${message}</span>
        </div>
    `;
    $('body').append(toastHtml);
    setTimeout(function() { $('#' + toastId).addClass('show'); }, 10);
    setTimeout(function() {
        $('#' + toastId).removeClass('show');
        setTimeout(function() { $('#' + toastId).remove(); }, 500);
    }, 4000);
}
