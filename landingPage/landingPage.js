document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app1').addEventListener('click', () => {
        window.location.href = 'http://localhost:3001';
    });

    document.getElementById('app2').addEventListener('click', () => {
        window.location.href = 'http://localhost:3002';
    });

    document.getElementById('app3').addEventListener('click', () => {
        window.location.href = 'http://localhost:3003';
    });
});
