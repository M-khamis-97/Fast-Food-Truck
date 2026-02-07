$(document).ready(function() {
    loadMenuItems();
});

function loadMenuItems() {
    $.ajax({
        url: '/api/v1/menuItem/view',
        method: 'GET',
        success: function(items) {
            if (items.length === 0) {
                $('#emptyState').show();
                $('#menuItemsContainer').hide();
                return;
            }
            displayMenuItems(items);
        },
        error: function(xhr) {
            console.error('Error loading menu items:', xhr);
            $('#emptyState').show();
        }
    });
}

function displayMenuItems(items) {
    $('#emptyState').hide();
    $('#menuItemsContainer').show();
    
    let html = `
        <table class="table table-custom table-striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    items.forEach(function(item) {
        const statusBadge = item.status === 'available' ? 'badge-success' : 'badge-default';
        html += `
            <tr>
                <td>${item.itemId}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.description || 'N/A'}</td>
                <td>${parseFloat(item.price).toFixed(2)} EGP</td>
                <td><span class="badge ${statusBadge}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewItem(${item.itemId})">View</button>
                    <button class="btn btn-sm btn-warning" onclick="editItem(${item.itemId})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.itemId})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    $('#menuItemsContainer').html(html);
}

function viewItem(itemId) {
    $.ajax({
        url: '/api/v1/menuItem/view/' + itemId,
        method: 'GET',
        success: function(item) {
            const statusBadge = item.status === 'available' ? 
                '<span class="badge badge-success">Available</span>' : 
                '<span class="badge badge-default">Unavailable</span>';
            
            const content = `
                <div class="row">
                    <div class="col-md-12">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div style="font-size: 80px; margin-bottom: 10px;">🍽️</div>
                            <h3 style="margin: 0; color: #FF6B35;">${item.name}</h3>
                        </div>
                    </div>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <div class="col-md-6">
                        <p><strong>Category:</strong></p>
                        <p style="font-size: 16px; color: #666;">
                            <span class="badge" style="background-color: #007bff; font-size: 14px;">${item.category}</span>
                        </p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Status:</strong></p>
                        <p style="font-size: 16px;">${statusBadge}</p>
                    </div>
                </div>
                <div class="row" style="margin-top: 15px;">
                    <div class="col-md-12">
                        <p><strong>Description:</strong></p>
                        <p style="font-size: 16px; color: #666; line-height: 1.6;">
                            ${item.description || 'No description available'}
                        </p>
                    </div>
                </div>
                <div class="row" style="margin-top: 15px;">
                    <div class="col-md-12">
                        <p><strong>Price:</strong></p>
                        <h2 style="color: #28a745; margin: 0;">${parseFloat(item.price).toFixed(2)} EGP</h2>
                    </div>
                </div>
            `;
            
            $('#viewModalContent').html(content);
            $('#viewModal').modal('show');
        },
        error: function(xhr) {
            const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : 'Unknown error';
            showToast('error', 'Failed to load item: ' + error);
        }
    });
}

function editItem(itemId) {
    $.ajax({
        url: '/api/v1/menuItem/view/' + itemId,
        method: 'GET',
        success: function(item) {
            $('#editItemId').val(item.itemId);
            $('#editItemName').val(item.name);
            $('#editItemCategory').val(item.category);
            $('#editItemDescription').val(item.description);
            $('#editItemPrice').val(item.price);
            $('#editItemStatus').val(item.status);
            $('#editModal').modal('show');
        },
        error: function(xhr) {
            const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : 'Unknown error';
            showToast('error', 'Failed to load item: ' + error);
        }
    });
}

function saveEdit() {
    const itemId = $('#editItemId').val();
    const data = {
        name: $('#editItemName').val(),
        category: $('#editItemCategory').val(),
        description: $('#editItemDescription').val(),
        price: parseFloat($('#editItemPrice').val())
    };
    
    $.ajax({
        url: '/api/v1/menuItem/edit/' + itemId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function() {
            $('#editModal').modal('hide');
            showToast('success', 'Menu item updated successfully!');
            loadMenuItems();
        },
        error: function(xhr) {
            const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : 'Unknown error';
            showToast('error', 'Failed to update item: ' + error);
        }
    });
}

function deleteItem(itemId) {
    $('#confirmModalContent').text('Are you sure you want to delete this menu item? This action cannot be undone.');
    $('#confirmButton').off('click').on('click', function() {
        $('#confirmModal').modal('hide');
        $.ajax({
            url: '/api/v1/menuItem/delete/' + itemId,
            method: 'DELETE',
            success: function() {
                showToast('success', 'Menu item deleted successfully!');
                loadMenuItems();
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : 'Unknown error';
                showToast('error', 'Failed to delete item: ' + error);
            }
        });
    });
    $('#confirmModal').modal('show');
}
