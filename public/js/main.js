// Main JavaScript file for InventoryMan2

console.log('InventoryMan2 loaded successfully');

// Global error handler for 403 Forbidden errors (expired/invalid JWT)
(function() {
    // Store original fetch
    const originalFetch = window.fetch;
    
    // Override fetch to handle 403 errors globally
    window.fetch = function(...args) {
        return originalFetch.apply(this, args)
            .then(response => {
                // Check if response is 403 Forbidden
                if (response.status === 403) {
                    handleAuthenticationError();
                }
                return response;
            })
            .catch(error => {
                throw error;
            });
    };
    
    // Function to handle authentication errors
    function handleAuthenticationError() {
        console.warn('Authentication error detected - logging out user');
        
        // Clear all local storage
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (e) {
            console.error('Error clearing storage:', e);
        }
        
        // Delete JWT cookie by setting it to empty
        try {
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        } catch (e) {
            console.error('Error clearing cookie:', e);
        }
        
        // Show alert to user
        if (window.showAlert) {
            window.showAlert('Your session has expired. Please login again.', 'warning');
        } else {
            alert('Your session has expired. Please login again.');
        }
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    }
    
    // Also handle page navigation errors
    window.addEventListener('error', function(event) {
        if (event.message && event.message.includes('Forbidden')) {
            handleAuthenticationError();
        }
    });
})();