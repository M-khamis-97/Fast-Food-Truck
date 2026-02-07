$(document).ready(function() {
    // Show/hide truck name field based on role selection
    $('#role').on('change', function() {
        if ($(this).val() === 'truckowner') {
            $('#truckNameGroup').show();
            $('#truckName').attr('required', true);
        } else {
            $('#truckNameGroup').hide();
            $('#truckName').attr('required', false);
        }
    });
    
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        
        const name = $('#name').val().trim();
        const email = $('#email').val().trim();
        const password = $('#password').val().trim();
        const birthdate = $('#birthdate').val();
        const role = $('#role').val();
        const truckName = $('#truckName').val().trim();
        
        // Validation
        if (!name || !email || !password || !birthdate) {
            showError('All fields are required');
            return;
        }
        
        // Validate truck name for truck owners
        if (role === 'truckowner' && !truckName) {
            showError('Truck name is required for truck owner registration');
            return;
        }
        
        // Prepare data
        const data = { name, email, password, birthdate, role };
        if (role === 'truckowner') {
            data.truckName = truckName;
        }
        
        // AJAX registration request
        $.ajax({
            url: '/api/v1/user',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                if (response.requiresApproval) {
                    showSuccess(response.message);
                    setTimeout(function() {
                        window.location.href = '/';
                    }, 5000);
                } else {
                    showSuccess('Registration successful! Redirecting to login...');
                    setTimeout(function() {
                        window.location.href = '/';
                    }, 2000);
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.error : 'Registration failed';
                showError(error);
            }
        });
    });
    
    function showError(message) {
        $('#errorMessage').text(message).show();
        $('#successMessage').hide();
        setTimeout(function() {
            $('#errorMessage').fadeOut();
        }, 5000);
    }
    
    function showSuccess(message) {
        $('#successMessage').text(message).show();
        $('#errorMessage').hide();
    }
});
