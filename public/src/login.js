$(document).ready(function() {
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        
        const email = $('#email').val().trim();
        const password = $('#password').val().trim();
        
        // Validation
        if (!email || !password) {
            showError('Email and password are required');
            return;
        }
        
        // AJAX login request
        $.ajax({
            url: '/api/v1/user/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password }),
            success: function(response) {
                // Redirect based on user role
                if (response.user.role === 'admin') {
                    window.location.href = '/adminDashboard';
                } else if (response.user.role === 'truckowner') {
                    window.location.href = '/ownerDashboard';
                } else {
                    window.location.href = '/dashboard';
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.error : 'Login failed';
                showError(error);
            }
        });
    });
    
    function showError(message) {
        $('#errorMessage').text(message).show();
        setTimeout(function() {
            $('#errorMessage').fadeOut();
        }, 5000);
    }
});
