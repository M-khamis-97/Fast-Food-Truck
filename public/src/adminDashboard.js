$(document).ready(function() {
    loadStats();
    loadCustomers();
    loadOwners();
    loadTrucks();
    loadPending();
    
    // Reload data when switching tabs
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        if ($(e.target).attr('href') === '#customers') {
            loadCustomers();
        } else if ($(e.target).attr('href') === '#owners') {
            loadOwners();
        } else if ($(e.target).attr('href') === '#trucks') {
            loadTrucks();
        } else if ($(e.target).attr('href') === '#pending') {
            loadPending();
        }
    });
});

function loadStats() {
    $.ajax({
        url: '/api/v1/admin/stats',
        method: 'GET',
        success: function(stats) {
            $('#totalUsers').text(stats.totalUsers);
            $('#totalCustomers').text(stats.totalCustomers);
            $('#totalOwners').text(stats.totalOwners);
            $('#totalTrucks').text(stats.totalTrucks);
            $('#totalOrders').text(stats.totalOrders);
            $('#pendingApprovals').text(stats.pendingApprovals);
            $('#pendingBadge').text(stats.pendingApprovals);
            
            // Highlight pending panel if there are pending approvals
            if (stats.pendingApprovals > 0) {
                $('#pendingPanel').addClass('pulse-animation');
            } else {
                $('#pendingPanel').removeClass('pulse-animation');
            }
        },
        error: function(xhr) {
            console.error('Error loading stats:', xhr);
        }
    });
}

function loadCustomers() {
    $.ajax({
        url: '/api/v1/admin/users',
        method: 'GET',
        success: function(users) {
            const customers = users.filter(u => u.role === 'customer');
            if (customers.length === 0) {
                $('#emptyCustomers').show();
                $('#customersContainer').hide();
                return;
            }
            displayCustomers(customers);
        },
        error: function(xhr) {
            console.error('Error loading customers:', xhr);
            showToast('error', 'Error loading customers: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function loadOwners() {
    $.ajax({
        url: '/api/v1/admin/users',
        method: 'GET',
        success: function(users) {
            const owners = users.filter(u => u.role === 'truckowner');
            if (owners.length === 0) {
                $('#emptyOwners').show();
                $('#ownersContainer').hide();
                return;
            }
            displayOwners(owners);
        },
        error: function(xhr) {
            console.error('Error loading owners:', xhr);
            showToast('error', 'Error loading owners: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function displayCustomers(customers) {
    $('#emptyCustomers').hide();
    $('#customersContainer').show().empty();
    
    let html = `
        <table class="table table-custom table-striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Birthdate</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    customers.forEach(function(user) {
        const statusBadge = user.status === 'active' 
            ? '<span class="badge badge-success">Active</span>' 
            : '<span class="badge badge-danger">Inactive</span>';
        const joinDate = new Date(user.createdat).toLocaleDateString();
        const birthDate = user.birthdate ? new Date(user.birthdate).toLocaleDateString() : 'N/A';
        
        html += `
            <tr>
                <td>${user.userid}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${statusBadge}</td>
                <td>${birthDate}</td>
                <td>${joinDate}</td>
                <td>
                    ${user.status === 'active' 
                        ? '<button class="btn btn-sm btn-warning" onclick="toggleUserStatus(' + user.userid + ', \'inactive\')">Deactivate</button>'
                        : '<button class="btn btn-sm btn-success" onclick="toggleUserStatus(' + user.userid + ', \'active\')">Activate</button>'
                    }
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.userid}, '${user.name}')">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    $('#customersContainer').html(html);
}

function displayOwners(owners) {
    $('#emptyOwners').hide();
    $('#ownersContainer').show().empty();
    
    let html = `
        <table class="table table-custom table-striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Birthdate</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    owners.forEach(function(user) {
        const statusBadge = user.status === 'active' 
            ? '<span class="badge badge-success">Active</span>' 
            : '<span class="badge badge-danger">Inactive</span>';
        const joinDate = new Date(user.createdat).toLocaleDateString();
        const birthDate = user.birthdate ? new Date(user.birthdate).toLocaleDateString() : 'N/A';
        
        html += `
            <tr>
                <td>${user.userid}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${statusBadge}</td>
                <td>${birthDate}</td>
                <td>${joinDate}</td>
                <td>
                    ${user.status === 'active' 
                        ? '<button class="btn btn-sm btn-warning" onclick="toggleUserStatus(' + user.userid + ', \'inactive\')">Deactivate</button>'
                        : '<button class="btn btn-sm btn-success" onclick="toggleUserStatus(' + user.userid + ', \'active\')">Activate</button>'
                    }
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.userid}, '${user.name}')">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    $('#ownersContainer').html(html);
}

function loadTrucks() {
    $.ajax({
        url: '/api/v1/admin/trucks',
        method: 'GET',
        success: function(trucks) {
            if (trucks.length === 0) {
                $('#emptyTrucks').show();
                $('#trucksContainer').hide();
                return;
            }
            displayTrucks(trucks);
        },
        error: function(xhr) {
            console.error('Error loading trucks:', xhr);
            showToast('error', 'Error loading trucks: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function displayTrucks(trucks) {
    $('#emptyTrucks').hide();
    $('#trucksContainer').show().empty();
    
    let html = `
        <table class="table table-custom table-striped">
            <thead>
                <tr>
                    <th>Truck ID</th>
                    <th>Truck Name</th>
                    <th>Owner ID</th>
                    <th>Owner</th>
                    <th>Owner Email</th>
                    <th>Owner Status</th>
                    <th>Truck Status</th>
                    <th>Order Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    trucks.forEach(function(truck) {
        const truckStatusBadge = truck.truckstatus === 'available' 
            ? '<span class="badge badge-success">Available</span>' 
            : '<span class="badge badge-danger">Inactive</span>';
        const orderStatusBadge = truck.orderstatus === 'available' 
            ? '<span class="badge badge-success">Available</span>' 
            : '<span class="badge badge-danger">Inactive</span>';
        const ownerStatusBadge = truck.ownerstatus === 'active' 
            ? '<span class="badge badge-success">Active</span>' 
            : '<span class="badge badge-danger">Inactive</span>';
        const createdDate = new Date(truck.createdat).toLocaleDateString();
        
        html += `
            <tr>
                <td>${truck.truckid}</td>
                <td>${truck.truckname}</td>
                <td>${truck.ownerid}</td>
                <td>${truck.ownername}</td>
                <td>${truck.owneremail}</td>
                <td>${ownerStatusBadge}</td>
                <td>${truckStatusBadge}</td>
                <td>${orderStatusBadge}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick='viewTruckMenu(${truck.truckid}, "${truck.truckname.replace(/"/g, '&quot;')}")'>View Menu</button>
                    ${truck.truckstatus === 'available' 
                        ? '<button class="btn btn-sm btn-warning" onclick="toggleTruckStatus(' + truck.truckid + ', \'inactive\')">Deactivate</button>'
                        : '<button class="btn btn-sm btn-success" onclick="toggleTruckStatus(' + truck.truckid + ', \'available\')">Activate</button>'
                    }
                    <button class="btn btn-sm btn-danger" onclick="deleteTruck(${truck.truckid}, '${truck.truckname}')">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    $('#trucksContainer').html(html);
}

function toggleUserStatus(userid, newStatus) {
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    showConfirm('Are you sure you want to ' + action + ' this user?', function() {
    
        $.ajax({
            url: '/api/v1/admin/users/' + userid + '/status',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ status: newStatus }),
            success: function() {
                showToast('success', '✓ User ' + action + 'd successfully!');
                loadStats();
                loadCustomers();
                loadOwners();
                loadTrucks(); // Reload trucks in case owner trucks were affected
            },
            error: function(xhr) {
                showToast('error', 'Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });
}

function deleteUser(userid, username) {
    showConfirm('Are you sure you want to delete user <strong>"' + username + '"</strong>?<br><br>⚠️ This action cannot be undone and will also delete their trucks if they are an owner.', function() {
    
        $.ajax({
            url: '/api/v1/admin/users/' + userid,
            method: 'DELETE',
            success: function() {
                showToast('success', '✓ User deleted successfully!');
                loadStats();
                loadCustomers();
                loadOwners();
                loadTrucks(); // Reload trucks in case owner trucks were deleted
            },
            error: function(xhr) {
                showToast('error', 'Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });
}

function toggleTruckStatus(truckid, newStatus) {
    const action = newStatus === 'available' ? 'activate' : 'deactivate';
    
    showConfirm('Are you sure you want to ' + action + ' this truck?', function() {
    
        $.ajax({
            url: '/api/v1/admin/trucks/' + truckid + '/status',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ truckstatus: newStatus }),
            success: function() {
                showToast('success', '✓ Truck ' + action + 'd successfully!');
                loadStats();
                loadTrucks();
            },
            error: function(xhr) {
                showToast('error', 'Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });
}

function deleteTruck(truckid, truckname) {
    showConfirm('Are you sure you want to delete truck <strong>"' + truckname + '"</strong>?<br><br>⚠️ This action cannot be undone.', function() {
    
        $.ajax({
            url: '/api/v1/admin/trucks/' + truckid,
            method: 'DELETE',
            success: function() {
                showToast('success', '✓ Truck deleted successfully!');
                loadStats();
                loadTrucks();
            },
            error: function(xhr) {
                showToast('error', 'Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });
}

// ============================================
// PENDING APPROVALS FUNCTIONS
// ============================================

function loadPending() {
    $.ajax({
        url: '/api/v1/admin/pending',
        method: 'GET',
        success: function(response) {
            const pending = response.pendingUsers;
            if (pending.length === 0) {
                $('#emptyPending').show();
                $('#pendingContainer').hide();
                return;
            }
            displayPending(pending);
        },
        error: function(xhr) {
            console.error('Error loading pending approvals:', xhr);
            showToast('error', 'Error loading pending approvals: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function displayPending(pending) {
    $('#emptyPending').hide();
    $('#pendingContainer').show();
    
    let html = '<table class="table table-striped table-hover"><thead><tr>';
    html += '<th>User ID</th><th>Name</th><th>Email</th><th>Truck Name</th><th>Birthdate</th><th>Registered At</th><th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    pending.forEach(function(user) {
        const registeredAt = new Date(user.createdat).toLocaleString();
        const birthdate = new Date(user.birthdate).toLocaleDateString();
        const truckName = user.truckname || '<span style="color: #999;">No truck</span>';
        
        html += '<tr>';
        html += '<td>' + user.userid + '</td>';
        html += '<td><strong>' + user.name + '</strong></td>';
        html += '<td>' + user.email + '</td>';
        html += '<td><span style="color: #ff6b35; font-weight: 600;">🚚 ' + truckName + '</span></td>';
        html += '<td>' + birthdate + '</td>';
        html += '<td>' + registeredAt + '</td>';
        html += '<td>';
        html += '<button class="btn btn-success btn-sm" onclick="approveUser(' + user.userid + ', \'' + user.name + '\')">✓ Approve</button> ';
        html += '<button class="btn btn-danger btn-sm" onclick="rejectUser(' + user.userid + ', \'' + user.name + '\')">✕ Reject</button>';
        html += '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    $('#pendingContainer').html(html);
}

function approveUser(userid, username) {
    showConfirm('Are you sure you want to approve <strong>"' + username + '"</strong> as a truck owner?<br><br>They will be able to login and manage their trucks.', function() {
    
        $.ajax({
            url: '/api/v1/admin/pending/' + userid + '/approve',
            method: 'PUT',
            success: function() {
                showToast('success', '✓ Truck owner "' + username + '" approved successfully!');
                loadStats();
                loadPending();
                loadCustomers();
                loadOwners();
            },
            error: function(xhr) {
                showToast('error', 'Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });
}

function rejectUser(userid, username) {
    showConfirm('Are you sure you want to reject <strong>"' + username + '"</strong>?<br><br>⚠️ This will permanently delete their registration.', function() {
    
        $.ajax({
            url: '/api/v1/admin/pending/' + userid + '/reject',
            method: 'PUT',
            success: function() {
                showToast('warning', 'Truck owner registration "' + username + '" rejected and removed.');
                loadStats();
                loadPending();
            },
            error: function(xhr) {
                showToast('error', 'Error: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });
}

function viewTruckMenu(truckId, truckName) {
    $.ajax({
        url: '/api/v1/admin/trucks/' + truckId + '/menu',
        method: 'GET',
        success: function(menuItems) {
            showMenuModal(truckName, menuItems);
        },
        error: function(xhr) {
            showToast('error', 'Error loading menu: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}

function showMenuModal(truckName, menuItems) {
    let menuHtml = '';
    
    if (menuItems.length === 0) {
        menuHtml = '<div class="alert alert-info">No menu items found for this truck.</div>';
    } else {
        menuHtml = `
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        menuItems.forEach(function(item) {
            const statusBadge = item.status === 'available' 
                ? '<span class="label label-success">Available</span>'
                : '<span class="label label-danger">Unavailable</span>';
            
            menuHtml += `
                <tr>
                    <td><strong>#${item.itemid}</strong></td>
                    <td>${item.name}</td>
                    <td><span class="label label-primary">${item.category}</span></td>
                    <td><strong>${parseFloat(item.price).toFixed(2)} EGP</strong></td>
                    <td>${statusBadge}</td>
                    <td>${item.description || 'No description'}</td>
                </tr>
            `;
        });
        
        menuHtml += '</tbody></table>';
    }
    
    const modalHtml = `
        <div class="modal fade" id="menuModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                        <h4 class="modal-title">📋 Menu Items - ${truckName}</h4>
                    </div>
                    <div class="modal-body">
                        ${menuHtml}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#menuModal').remove();
    $('body').append(modalHtml);
    $('#menuModal').modal('show');
}

// Make functions globally accessible
window.viewTruckMenu = viewTruckMenu;
window.showMenuModal = showMenuModal;
