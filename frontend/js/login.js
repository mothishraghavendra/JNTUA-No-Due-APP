const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.email.value;
    const password = form.password.value;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    errorMsg.textContent = '';

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store user data and redirect based on role
            if (data.role === 'admin') {
                localStorage.setItem('admin', JSON.stringify(data.user));
                window.location.href = '/admin_dashboard.html';
            } else if (data.role === 'officer') {
                localStorage.setItem('officer', JSON.stringify(data.user));
                window.location.href = '/officer_dashboard.html';
            } else if (data.role === 'student') {
                localStorage.setItem('student', JSON.stringify(data.user));
                window.location.href = '/student_dashboard.html';
            }
        } else {
            errorMsg.textContent = data.error || 'Login failed';
        }
    } catch (err) {
        console.error(err);
        errorMsg.textContent = 'An error occurred. Please try again.';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
});