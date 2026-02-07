let allOrders = [];
let currentFilter = 'all';

$(document).ready(function() {
    loadOrders();
    
    $('.filter-btn').on('click', function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        
        currentFilter = $(this).data('filter');
        filterOrders();
    });
});

function loadOrders() {
    $.ajax({
        url: '/api/v1/order/truckOrders',
        method: 'GET',
        success: function(orders) {
            allOrders = orders;
            filterOrders();
        },
        error: function(xhr) {
            console.error('Error loading orders:', xhr);
            $('#emptyState').show();
        }
    });
}

function filterOrders() {
    let filteredOrders = allOrders;
    
    if (currentFilter !== 'all') {
        filteredOrders = allOrders.filter(o => o.orderStatus === currentFilter);
    }
    
    if (filteredOrders.length === 0) {
        $('#emptyState').show();
        $('#ordersContainer').hide();
        return;
    }
    
    displayOrders(filteredOrders);
}

function displayOrders(orders) {
    $('#emptyState').hide();
    $('#ordersContainer').show().empty();
    
    let html = `
        <table class="table table-custom table-striped">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Pickup Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    orders.forEach(function(order) {
        const statusClass = getStatusClass(order.orderStatus);
        const orderDate = new Date(order.createdAt).toLocaleString();
        const pickupTime = order.scheduledPickupTime ? new Date(order.scheduledPickupTime).toLocaleString() : 'Not set';
        
        // Hide update button for cancelled and completed orders
        const canUpdate = order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed';
        const updateButton = canUpdate ? 
            `<button class="btn btn-sm btn-warning" onclick="showUpdateStatus(${order.orderId}, '${order.orderStatus}')">Update</button>` : '';
        
        // Add notification for cancelled orders
        const cancelledNote = order.orderStatus === 'cancelled' ? 
            `<br><small class="text-danger"><strong>⚠️ Order cancelled</strong></small>` : '';
        
        html += `
            <tr ${order.orderStatus === 'cancelled' ? 'style="background-color: #ffe6e6;"' : ''}>
                <td><strong>#${order.orderId}</strong></td>
                <td>${order.customerName}${cancelledNote}</td>
                <td>${order.customerEmail}</td>
                <td><span class="badge ${statusClass}">${order.orderStatus}</span></td>
                <td>${parseFloat(order.totalPrice).toFixed(2)} EGP</td>
                <td><small>${pickupTime}</small></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.orderId})">Details</button>
                    ${updateButton}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    $('#ordersContainer').html(html);
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

function viewOrderDetails(orderId) {
    $.ajax({
        url: '/api/v1/order/truckOwner/' + orderId,
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
        itemsHtml = '<table class="table table-bordered"><thead><tr><th>Item</th><th>Quantity</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>';
        
        order.items.forEach(function(item) {
            const subtotal = item.quantity * parseFloat(item.priceAtOrder);
            itemsHtml += `
                <tr>
                    <td>${item.itemName}</td>
                    <td>${item.quantity}</td>
                    <td>${parseFloat(item.priceAtOrder).toFixed(2)} EGP</td>
                    <td>${subtotal.toFixed(2)} EGP</td>
                </tr>
            `;
        });
        
        itemsHtml += '</tbody></table>';
    }
    
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6">
                <h4>Order Information</h4>
                <p><strong>Order ID:</strong> #${order.orderId}</p>
                <p><strong>Status:</strong> <span class="badge ${getStatusClass(order.orderStatus)}">${order.orderStatus}</span></p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                <p><strong>Total Amount:</strong> ${parseFloat(order.totalPrice).toFixed(2)} EGP</p>
                ${order.estimatedEarliestPickup ? '<p><strong>Pickup Time:</strong> ' + new Date(order.estimatedEarliestPickup).toLocaleString() + '</p>' : ''}
            </div>
            <div class="col-md-6">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> ${order.customerName}</p>
                <p><strong>Email:</strong> ${order.customerEmail}</p>
            </div>
        </div>
        <hr>
        <h4>Order Items</h4>
        ${itemsHtml}
    `;
    
    $('#orderDetailsContent').html(detailsHtml);
}

function showUpdateStatus(orderId, currentStatus) {
    const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    let options = '';
    
    statuses.forEach(function(status) {
        const selected = status === currentStatus ? 'selected' : '';
        const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
        options += `<option value="${status}" ${selected}>${displayStatus}</option>`;
    });
    
    const html = `
        <div class="form-group">
            <label>Order Status:</label>
            <select class="form-control" id="newStatus">${options}</select>
        </div>
        <div class="form-group">
            <label>Estimated Pickup Time (Optional):</label>
            <input type="datetime-local" class="form-control" id="pickupTime">
        </div>
    `;
    
    $('#updateStatusContent').html(html);
    $('#updateStatusModal').data('orderId', orderId);
    $('#updateStatusModal').modal('show');
}

function confirmStatusUpdate() {
    const orderId = $('#updateStatusModal').data('orderId');
    const newStatus = $('#newStatus').val();
    const pickupTime = $('#pickupTime').val();
    
    if (!newStatus) {
        alert('Please select a status');
        return;
    }
    
    updateOrderStatus(orderId, newStatus, pickupTime);
}

function updateOrderStatus(orderId, newStatus, pickupTime) {
    const data = {
        orderStatus: newStatus
    };
    
    if (pickupTime) {
        data.estimatedEarliestPickup = pickupTime;
    }
    
    $.ajax({
        url: '/api/v1/order/updateStatus/' + orderId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function() {
            $('#updateStatusModal').modal('hide');
            showToast('success', 'Order status updated successfully!');
            loadOrders();
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Unknown error';
            showToast('error', 'Error updating status: ' + errorMsg);
        }
    });
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
