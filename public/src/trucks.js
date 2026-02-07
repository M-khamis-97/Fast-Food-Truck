$(document).ready(function() {
    loadTrucks();
});

function loadTrucks() {
    $.ajax({
        url: '/api/v1/trucks/view',
        method: 'GET',
        success: function(trucks) {
            if (trucks.length === 0) {
                $('#emptyState').show();
                return;
            }
            
            let html = '';
            trucks.forEach(function(truck) {
                html += `
                    <div class="col-md-4">
                        <div class="truck-card">
                            <div class="truck-icon">🚚</div>
                            <h4>${truck.truckName}</h4>
                            <p><strong>Status:</strong> <span class="badge" style="background-color: #28a745;">${truck.orderStatus}</span></p>
                            <a href="/truckMenu/${truck.truckId}" class="btn btn-primary btn-block">View Menu</a>
                        </div>
                    </div>
                `;
            });
            
            $('#trucksContainer').html(html);
        },
        error: function(xhr) {
            alert('Error loading trucks: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
        }
    });
}
