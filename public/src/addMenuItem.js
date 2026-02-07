$(document).ready(function() {
    loadTrucks();
    
    $('#addMenuItemForm').on('submit', function(e) {
        e.preventDefault();
        addMenuItem();
    });
});

function loadTrucks() {
    $.ajax({
        url: '/api/v1/trucks/myTruck',
        method: 'GET',
        success: function(trucks) {
            const select = $('#truckId');
            select.empty().append('<option value="">Select Truck</option>');
            
            trucks.forEach(function(truck) {
                select.append(`<option value="${truck.truckId}">${truck.truckName}</option>`);
            });
        },
        error: function(xhr) {
            if (xhr.status === 404) {
                showError('You need to create a truck first before adding menu items. Please go to Owner Dashboard to create your truck.');
            } else {
                showError('Error loading trucks: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        }
    });
}

function addMenuItem() {
    const data = {
        name: $('#itemName').val().trim(),
        category: $('#itemCategory').val(),
        description: $('#itemDescription').val().trim(),
        price: parseFloat($('#itemPrice').val()),
        truckid: parseInt($('#truckId').val())
    };
    
    // Validation
    if (!data.name || !data.category || !data.price || !data.truckid) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (data.price <= 0) {
        showError('Price must be greater than 0');
        return;
    }
    
    $.ajax({
        url: '/api/v1/menuItem/new',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            showToast('success', 'Menu item created successfully!');
            setTimeout(function() {
                window.location.href = '/menuItems';
            }, 1500);
        },
        error: function(xhr) {
            const error = xhr.responseJSON ? xhr.responseJSON.error : 'Failed to create menu item';
            showToast('error', error);
        }
    });
}

function showError(message) {
    $('#errorMessage').text(message).show();
    $('#successMessage').hide();
    window.scrollTo(0, 0);
    setTimeout(function() {
        $('#errorMessage').fadeOut();
    }, 5000);
}

function showSuccess(message) {
    $('#successMessage').text(message).show();
    $('#errorMessage').hide();
    window.scrollTo(0, 0);
}
