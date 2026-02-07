$(document).ready(function() {
    loadTruckInfo();
    loadMenuItems();
    loadOrders();
});

function loadTruckInfo() {
    $.ajax({
        url: '/api/v1/trucks/myTruck',
        method: 'GET',
        success: function(trucks) {
            if (trucks && trucks.length > 0) {
                displayTruckInfo(trucks);
            } else {
                showCreateTruckForm();
            }
        },
        error: function(xhr) {
            if (xhr.status === 404) {
                // No trucks found, show create form
                showCreateTruckForm();
            } else {
                console.error('Error loading truck info:', xhr);
            }
        }
    });
}

function showCreateTruckForm() {
    const container = $('#truckInfo');
    container.html(`
        <div class="col-md-12">
            <div style="max-width: 650px; margin: 0 auto;">
                <div style="background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <div style="text-align: center; margin-bottom: 35px;">
                        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #0093E9 0%, #80D0C7 100%); border-radius: 50%; 
                                    display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,147,233,0.4);">
                            <span style="font-size: 35px;">🚚</span>
                        </div>
                        <h2 style="margin: 0 0 10px 0; color: #1a1a2e; font-size: 26px; font-weight: 600;">Create Your First Truck</h2>
                        <p style="color: #6c757d; font-size: 14px; margin: 0;">Start your food business today</p>
                    </div>
                    
                    <form id="createTruckForm">
                        <div class="form-group">
                            <label style="color: #2c3e50; font-weight: 600; font-size: 13px; margin-bottom: 8px; display: block;">Truck Name</label>
                            <input type="text" class="form-control" id="truckName" required 
                                   placeholder="e.g., Mama's Tacos, Burger Paradise"
                                   style="border: 1px solid #dfe6e9; border-radius: 6px; padding: 12px; font-size: 14px;">
                        </div>
                        
                        <button type="submit" class="btn btn-lg btn-block" 
                                style="background: linear-gradient(135deg, #0093E9 0%, #80D0C7 100%); border: none; color: white; padding: 13px; 
                                       border-radius: 6px; font-size: 15px; font-weight: 600; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,147,233,0.4);">
                            Create My Truck
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `);
    
    $('#createTruckForm').on('submit', function(e) {
        e.preventDefault();
        createTruck();
    });
}

function showAddTruckModal() {
    const modalHtml = `
        <div class="modal fade" id="addTruckModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document" style="margin-top: 80px;">
                <div class="modal-content" style="border-radius: 8px; overflow: hidden; border: none;">
                    <div style="background: linear-gradient(135deg, #0093E9 0%, #80D0C7 100%); color: white; padding: 22px;">
                        <h4 style="margin: 0; font-size: 20px; font-weight: 600;">Add New Truck</h4>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 13px;">Expand your food business</p>
                    </div>
                    <div class="modal-body" style="padding: 25px;">
                        <form id="addTruckForm">
                            <div class="form-group">
                                <label style="color: #2c3e50; font-weight: 600; font-size: 13px; margin-bottom: 8px; display: block;">Truck Name</label>
                                <input type="text" class="form-control" id="newTruckName" required 
                                       placeholder="Enter truck name"
                                       style="border: 1px solid #dfe6e9; border-radius: 6px; padding: 12px; font-size: 14px;">
                            </div>
                            <div style="background: #e8f7f7; padding: 12px; border-radius: 5px; margin-top: 15px; border-left: 3px solid #0093E9;">
                                <p style="margin: 0; color: #1a1a2e; font-size: 12px;">
                                    <strong>Tip:</strong> Choose a unique name for easy identification
                                </p>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid #ecf0f1; padding: 15px 25px; background: #fafafa;">
                        <button type="button" class="btn" data-dismiss="modal" 
                                style="padding: 9px 18px; border-radius: 5px; border: 1px solid #dfe6e9; background: white; color: #7f8c8d; font-weight: 500; font-size: 13px;">
                            Cancel
                        </button>
                        <button type="button" class="btn" onclick="createTruckFromModal()" 
                                style="background: linear-gradient(135deg, #0093E9 0%, #80D0C7 100%); border: none; padding: 9px 22px; border-radius: 5px; 
                                       color: white; font-weight: 600; font-size: 13px; box-shadow: 0 3px 8px rgba(0,147,233,0.3);">
                            Create Truck
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#addTruckModal').remove();
    $('body').append(modalHtml);
    $('#addTruckModal').modal('show');
    
    $('#addTruckForm').on('submit', function(e) {
        e.preventDefault();
        const truckName = $('#newTruckName').val().trim();
        const truckLogo = $('#newTruckLogo').val().trim();
        
        if (!truckName) {
            alert('Please enter a truck name');
            return;
        }
        
        $.ajax({
            url: '/api/v1/trucks',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                truckname: truckName,
                trucklogo: truckLogo || null
            }),
            success: function() {
                $('#addTruckModal').modal('hide');
                showSuccessToast('🎉 Truck created successfully!');
                loadTruckInfo();
                loadMenuItems();
            },
            error: function(xhr) {
                alert('Error creating truck: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });
}

function createTruck() {
    const truckName = $('#truckName').val().trim();
    
    if (!truckName) {
        alert('Please enter a truck name');
        return;
    }
    
    $.ajax({
        url: '/api/v1/trucks',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            truckname: truckName
        }),
        success: function() {
            showSuccessToast('🎉 Truck created successfully!');
            loadTruckInfo();
            loadMenuItems();
        },
        error: function(xhr) {
            alert('Error creating truck: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function createTruckFromModal() {
    const truckName = $('#newTruckName').val().trim();
    
    if (!truckName) {
        alert('Please enter a truck name');
        return;
    }
    
    $.ajax({
        url: '/api/v1/trucks',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            truckname: truckName
        }),
        success: function() {
            $('#addTruckModal').modal('hide');
            showSuccessToast('🎉 Truck created successfully!');
            loadTruckInfo();
            loadMenuItems();
        },
        error: function(xhr) {
            alert('Error creating truck: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function showSuccessToast(message) {
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast-notification" style="
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); 
            color: white; padding: 20px 25px; border-radius: 12px; 
            box-shadow: 0 8px 24px rgba(17, 153, 142, 0.4);
            min-width: 300px; max-width: 500px; opacity: 0;
            transition: all 0.3s ease; transform: translateX(400px);">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 32px;">✓</span>
                <span style="font-size: 16px; font-weight: 500;">${message}</span>
            </div>
        </div>
    `;
    $('body').append(toastHtml);
    setTimeout(function() { 
        $('#' + toastId).css({opacity: 1, transform: 'translateX(0)'}); 
    }, 10);
    setTimeout(function() {
        $('#' + toastId).css({opacity: 0, transform: 'translateX(400px)'});
        setTimeout(function() { $('#' + toastId).remove(); }, 300);
    }, 3000);
}

function displayTruckInfo(trucks) {
    const container = $('#truckInfo');
    container.empty();
    
    // Header with truck count and add button
    const headerHtml = `
        <div class="col-md-12" style="margin-bottom: 25px;">
            <div style="background: white; padding: 20px 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0; color: #2c3e50; font-size: 24px; font-weight: 600;">My Food Trucks</h3>
                    <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">You have ${trucks.length} truck${trucks.length > 1 ? 's' : ''} • Manage and expand your business</p>
                </div>
                <button class="btn btn-primary" onclick="showAddTruckModal()" style="background: linear-gradient(135deg, #0093E9 0%, #80D0C7 100%); border: none; padding: 12px 25px; border-radius: 6px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,147,233,0.4);">
                    + Add New Truck
                </button>
            </div>
        </div>
    `;
    container.append(headerHtml);
    
    trucks.forEach(function(truck) {
        const isOpen = truck.orderStatus === 'available';
        const isApproved = truck.truckStatus === 'available';
        const createdDate = truck.createdAt ? new Date(truck.createdAt).toLocaleDateString() : 'N/A';
        
        // Admin deactivation notice
        const adminDeactivationNotice = !isApproved ? `
            <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px 15px; margin-bottom: 15px; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🚫</span>
                    <div>
                        <strong style="color: #721c24; font-size: 14px;">Truck Deactivated by Admin</strong>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #721c24;">Your truck has been deactivated by an administrator. Please contact the admin to request reactivation.</p>
                    </div>
                </div>
            </div>
        ` : '';
        
        const truckCard = `
            <div class="col-md-6" style="margin-bottom: 20px;">
                <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s;" 
                     onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                    
                    <div style="padding: 25px;">
                        ${adminDeactivationNotice}
                        <div style="display: flex; gap: 20px; align-items: flex-start;">
                            <!-- Left: Truck Icon and Info -->
                            <div style="flex: 1;">
                                <div style="font-size: 48px; margin-bottom: 12px;">🚚</div>
                                <h4 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #2c3e50;">${truck.truckName}</h4>
                                
                                <!-- Status Badges -->
                                <div style="margin-bottom: 10px;">
                                    <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; 
                                                background: ${isOpen ? '#d4edda' : '#dc3545'}; color: ${isOpen ? '#155724' : 'white'}; margin-right: 6px;">
                                        ${isOpen ? 'Open' : 'Closed'}
                                    </span>
                                    <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; 
                                                background: ${isApproved ? '#28a745' : '#dc3545'}; color: white;">
                                        ${isApproved ? 'Approved' : 'Not Approved'}
                                    </span>
                                </div>
                                
                                <p style="margin: 0; font-size: 13px; color: #7f8c8d;">Created: ${createdDate}</p>
                            </div>
                            
                            <!-- Right: Order Availability Control -->
                            <div style="flex: 1; text-align: right;">
                                <label style="font-size: 13px; color: #7f8c8d; font-weight: 500; display: block; margin-bottom: 8px;">Order Availability</label>
                                <select class="form-control" id="orderStatus_${truck.truckId}" 
                                        style="border: 1px solid #dfe6e9; border-radius: 6px; padding: 10px; font-size: 14px; color: #2c3e50; margin-bottom: 10px;">
                                    <option value="available" ${isOpen ? 'selected' : ''}>Open for Orders</option>
                                    <option value="unavailable" ${!isOpen ? 'selected' : ''}>Closed</option>
                                </select>
                                <button class="btn" onclick="updateTruckStatus(${truck.truckId})" 
                                        style="width: 100%; background: #ff6b35; border: none; padding: 10px; border-radius: 6px; 
                                               color: white; font-weight: 600; font-size: 13px; text-transform: uppercase;">
                                    ⬆ Update Status
                                </button>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ecf0f1; display: flex; gap: 10px;">
                            <button class="btn" onclick="editTruck(${truck.truckId}, '${truck.truckName.replace(/'/g, "\\'")}')" 
                                    style="flex: 1; background: #f0f2f5; border: none; padding: 10px; border-radius: 6px; 
                                           color: #2c3e50; font-weight: 500; font-size: 13px;">
                                ✏️ Edit
                            </button>
                            <button class="btn" onclick="deleteTruck(${truck.truckId}, '${truck.truckName.replace(/'/g, "\\'")}')" 
                                    style="flex: 1; background: #ffe5e5; border: none; padding: 10px; border-radius: 6px; 
                                           color: #dc3545; font-weight: 500; font-size: 13px;">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.append(truckCard);
    });
}

function updateTruckStatus(truckId) {
    const orderStatus = $('#orderStatus_' + truckId).val();
    
    $.ajax({
        url: '/api/v1/trucks/updateOrderStatus',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ truckId, orderStatus }),
        success: function() {
            const message = orderStatus === 'available' ? '✅ Truck is now open for orders!' : '🔒 Truck is now closed for orders!';
            showSuccessToast(message);
            loadTruckInfo();
        },
        error: function(xhr) {
            alert('Error updating status: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function editTruck(truckId, currentName) {
    const modalHtml = `
        <div class="modal fade" id="editTruckModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document" style="margin-top: 80px;">
                <div class="modal-content" style="border-radius: 8px; overflow: hidden; border: none;">
                    <div style="background: linear-gradient(135deg, #0093E9 0%, #80D0C7 100%); color: white; padding: 22px;">
                        <h4 style="margin: 0; font-size: 20px; font-weight: 600;">Edit Truck</h4>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 13px;">Update your truck information</p>
                    </div>
                    <div class="modal-body" style="padding: 25px;">
                        <form id="editTruckForm">
                            <div class="form-group">
                                <label style="color: #2c3e50; font-weight: 600; font-size: 13px; margin-bottom: 8px; display: block;">Truck Name</label>
                                <input type="text" class="form-control" id="editTruckName" required value="${currentName}"
                                       style="border: 1px solid #dfe6e9; border-radius: 6px; padding: 12px; font-size: 14px;">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid #ecf0f1; padding: 15px 25px; background: #fafafa;">
                        <button type="button" class="btn" data-dismiss="modal" 
                                style="padding: 9px 18px; border-radius: 5px; border: 1px solid #dfe6e9; background: white; color: #7f8c8d; font-weight: 500; font-size: 13px;">
                            Cancel
                        </button>
                        <button type="button" class="btn" onclick="saveEditTruck(${truckId})" 
                                style="background: linear-gradient(135deg, #0093E9 0%, #80D0C7 100%); border: none; padding: 9px 22px; border-radius: 5px; 
                                       color: white; font-weight: 600; font-size: 13px; box-shadow: 0 3px 8px rgba(0,147,233,0.3);">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(modalHtml);
    $('#editTruckModal').modal('show');
    $('#editTruckModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

function saveEditTruck(truckId) {
    const newName = $('#editTruckName').val().trim();
    
    if (!newName) {
        alert('Please enter a truck name');
        return;
    }
    
    $.ajax({
        url: '/api/v1/trucks/' + truckId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ truckname: newName }),
        success: function() {
            $('#editTruckModal').modal('hide');
            showSuccessToast('🎉 Truck updated successfully!');
            loadTruckInfo();
        },
        error: function(xhr) {
            alert('Error updating truck: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function deleteTruck(truckId, truckName) {
    if (!confirm(`Are you sure you want to delete "${truckName}"?\n\nThis will also delete all menu items associated with this truck.`)) {
        return;
    }
    
    $.ajax({
        url: '/api/v1/trucks/' + truckId,
        method: 'DELETE',
        success: function() {
            showSuccessToast('🗑️ Truck deleted successfully!');
            loadTruckInfo();
            loadMenuItems();
        },
        error: function(xhr) {
            alert('Error deleting truck: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function loadMenuItems() {
    $.ajax({
        url: '/api/v1/menuItem/view',
        method: 'GET',
        success: function(items) {
            $('#totalMenuItems').text(items.length);
        },
        error: function(xhr) {
            console.error('Error loading menu items:', xhr);
        }
    });
}

function loadOrders() {
    $.ajax({
        url: '/api/v1/order/truckOrders',
        method: 'GET',
        success: function(orders) {
            console.log('Loaded orders:', orders); // Debug log
            const pending = orders.filter(o => o.orderStatus === 'pending').length;
            const completed = orders.filter(o => o.orderStatus === 'completed').length;
            
            $('#pendingOrders').text(pending);
            $('#completedOrders').text(completed);
            
            displayRecentOrders(orders.slice(0, 5));
        },
        error: function(xhr) {
            console.error('Error loading orders:', xhr);
            console.error('Response:', xhr.responseJSON);
        }
    });
}

function displayRecentOrders(orders) {
    const container = $('#recentOrders');
    
    if (orders.length === 0) {
        container.html('<p>No recent orders</p>');
        return;
    }
    
    let html = '<table class="table table-striped"><thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead><tbody>';
    
    orders.forEach(function(order) {
        const date = new Date(order.createdAt).toLocaleDateString();
        const truckName = order.truckName ? ` (${order.truckName})` : '';
        html += `
            <tr>
                <td>#${order.orderId}${truckName}</td>
                <td>${order.customerName}</td>
                <td><span class="badge">${order.orderStatus}</span></td>
                <td>${parseFloat(order.totalPrice).toFixed(2)} EGP</td>
                <td>${date}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.html(html);
}
