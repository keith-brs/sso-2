document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('landing-page-button').addEventListener('click', () => {
        window.location.href = 'http://localhost:5005';
    });
    fetch('/user-info')
        .then(response => response.json())
        .then(data => {
            if (data.username && data.authLevel !== undefined) {
                document.getElementById('username').textContent = data.username;
                if (data.authLevel >= 2) {
                    document.getElementById('login-notice').classList.add('hidden');
                    document.getElementById('authenticated').classList.remove('hidden');
                } else {
                    document.getElementById('not-authorized').classList.remove('hidden');
                }
            }
        })
        .catch(error => console.error('Error:', error));
});
