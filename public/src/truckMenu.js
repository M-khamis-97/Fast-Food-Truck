$(document).ready(function() {
    // Ensure toast containers exist
    if ($('#toast-container').length === 0) {
        $('body').append('<div id="toast-container" style="position: fixed; top: 80px; right: 20px; z-index: 9999;"></div>');
    }
    if ($('#modal-container').length === 0) {
        $('body').append('<div id="modal-container"></div>');
    }
    
    loadMenu();
    loadCategories();
    
    $('.category-filter').on('click', function() {
        const category = $(this).data('category');
        if (category === 'all') {
            loadMenu();
        } else {
            loadMenuByCategory(category);
        }
        $('.category-filter').removeClass('btn-primary').addClass('btn-default');
        $(this).removeClass('btn-default').addClass('btn-primary');
    });
});

function loadMenu() {
    $.ajax({
        url: '/api/v1/menuItem/truck/' + truckId,
        method: 'GET',
        success: function(items) {
            console.log('Menu items loaded:', items);
            if (items.length === 0) {
                $('#emptyState').show();
                $('#menuContainer').hide();
                return;
            }
            displayMenuItems(items);
        },
        error: function(xhr) {
            console.error('Error loading menu:', xhr);
            $('#emptyState').show();
        }
    });
}

function loadCategories() {
    $.ajax({
        url: '/api/v1/menuItem/truck/' + truckId,
        method: 'GET',
        success: function(items) {
            const categories = [...new Set(items.map(item => item.category))];
            categories.forEach(function(category) {
                const btn = `<button class="btn btn-block btn-default category-filter" data-category="${category}">${category}</button>`;
                $('#categoryFilters').append(btn);
            });
            
            // Re-attach click handlers
            $('.category-filter').on('click', function() {
                const category = $(this).data('category');
                if (category === 'all') {
                    loadMenu();
                } else {
                    loadMenuByCategory(category);
                }
                $('.category-filter').removeClass('btn-primary').addClass('btn-default');
                $(this).removeClass('btn-default').addClass('btn-primary');
            });
        }
    });
}

function loadMenuByCategory(category) {
    $.ajax({
        url: '/api/v1/menuItem/truck/' + truckId + '/category/' + category,
        method: 'GET',
        success: function(items) {
            displayMenuItems(items);
        },
        error: function(xhr) {
            console.error('Error loading category:', xhr);
        }
    });
}

function displayMenuItems(items) {
    $('#emptyState').hide();
    $('#menuContainer').show().empty();
    
    items.forEach(function(item) {
        console.log('Displaying item:', item);
        const price = parseFloat(item.price);
        const itemCard = `
            <div class="menu-item-card">
                <div class="row">
                    <div class="col-md-8">
                        <h4>${item.name}</h4>
                        <p>${item.description || 'No description'}</p>
                        <span class="badge">${item.category}</span>
                        <span class="menu-item-price">${price.toFixed(2)} EGP</span>
                    </div>
                    <div class="col-md-4 text-right">
                        <div class="form-group">
                            <label>Quantity:</label>
                            <input type="number" class="form-control" id="qty-${item.itemId}" value="1" min="1" max="99">
                        </div>
                        <button class="btn btn-primary btn-block add-to-cart-btn" 
                                data-item-id="${item.itemId}" 
                                data-price="${price}">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
        $('#menuContainer').append(itemCard);
    });
    
    // Attach click handlers
    $('.add-to-cart-btn').off('click').on('click', function() {
        const itemId = parseInt($(this).data('item-id'));
        const price = parseFloat($(this).data('price'));
        console.log('Button clicked - itemId:', itemId, 'price:', price);
        console.log('Button data attributes:', $(this).data());
        addToCart(itemId, price);
    });
}

function addToCart(itemId, price) {
    const quantity = parseInt($('#qty-' + itemId).val());
    const itemPrice = parseFloat(price);
    
    if (!quantity || quantity < 1) {
        if (typeof showToast === 'function') {
            showToast('error', 'Please enter a valid quantity');
        } else {
            alert('Please enter a valid quantity');
        }
        return;
    }
    
    if (!itemPrice || itemPrice <= 0) {
        if (typeof showToast === 'function') {
            showToast('error', 'Invalid price');
        } else {
            alert('Invalid price');
        }
        return;
    }
    
    // Disable button to prevent double clicks
    const $btn = $(`.add-to-cart-btn[data-item-id="${itemId}"]`);
    $btn.prop('disabled', true).html('Adding...');
    
    $.ajax({
        url: '/api/v1/cart/new',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ 
            itemId: parseInt(itemId), 
            quantity: quantity, 
            price: itemPrice 
        }),
        success: function(response) {
            if (typeof showToast === 'function') {
                showToast('success', 'Item added to cart successfully!');
            } else {
                alert('Item added to cart successfully!');
            }
            // Reset quantity to 1 and re-enable button
            $('#qty-' + itemId).val(1);
            $btn.prop('disabled', false).html('Add to Cart');
        },
        error: function(xhr) {
            const error = xhr.responseJSON ? (xhr.responseJSON.error || xhr.responseJSON.message) : xhr.responseText || 'Failed to add item';
            if (typeof showToast === 'function') {
                showToast('error', error);
            } else {
                alert(error);
            }
            // Re-enable button on error
            $btn.prop('disabled', false).html('Add to Cart');
        }
    });
}

function showSuccess(message) {
    $('#successMessage').text(message).fadeIn();
    setTimeout(function() {
        $('#successMessage').fadeOut();
    }, 3000);
}
