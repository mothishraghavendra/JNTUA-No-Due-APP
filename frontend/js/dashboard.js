document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadBtn');
    const addUsersBtn = document.getElementById('addUsersBtn');
    const excelFile = document.getElementById('excelFile');
    const studentsTableBody = document.querySelector('#studentsTable tbody');
    const studentsSection = document.getElementById('studentsSection');

    let uploadedStudents = []; // Store uploaded students data

    // ========== Load Dashboard Stats ==========
    async function loadStats() {
        try {
            const res = await fetch('/admin/stats');
            const data = await res.json();

            if (res.ok) {
                document.getElementById('totalStudents').textContent = data.totalStudents || 0;
                document.getElementById('pendingApprovals').textContent = data.pendingApprovals || 0;
                document.getElementById('completedApplications').textContent = data.completedApplications || 0;
                document.getElementById('totalDepartments').textContent = data.totalDepartments || 0;
            }
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    }

    // Handle file upload
    uploadBtn.addEventListener('click', async () => {
        const file = excelFile.files[0];
        
        if (!file) {
            alert('Please select an Excel file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/admin/upload-students', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                uploadedStudents = data.students;
                console.log('Uploaded students data:', uploadedStudents); // Debug log
                displayStudents(data.students);
                addUsersBtn.style.display = 'inline-block';
                studentsSection.style.display = 'block';
            } else {
                alert(data.error || 'Failed to upload file');
            }
        } catch (err) {
            console.error(err);
            alert('Error uploading file');
        }
    });

    // Handle add users
    addUsersBtn.addEventListener('click', async () => {
        if (uploadedStudents.length === 0) {
            alert('No students to add. Please upload a file first.');
            return;
        }

        if (!confirm(`Are you sure you want to add ${uploadedStudents.length} users? Activation emails will be sent.`)) {
            return;
        }

        addUsersBtn.disabled = true;
        addUsersBtn.textContent = 'Adding Users...';

        try {
            const res = await fetch('/admin/add-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ students: uploadedStudents })
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                // Reset state
                uploadedStudents = [];
                studentsTableBody.innerHTML = '';
                studentsSection.style.display = 'none';
                addUsersBtn.style.display = 'none';
                excelFile.value = '';
            } else {
                alert(data.error || 'Failed to add users');
            }
        } catch (err) {
            console.error(err);
            alert('Error adding users');
        } finally {
            addUsersBtn.disabled = false;
            addUsersBtn.textContent = 'Add Users';
        }
    });

    // Display students in table
    function displayStudents(students) {
        studentsTableBody.innerHTML = '';

        if (!students || students.length === 0) {
            studentsTableBody.innerHTML = '<tr><td colspan="100%">No data found</td></tr>';
            return;
        }

        // Get column headers from first row keys
        const headers = Object.keys(students[0]);
        
        // Update table header
        const thead = document.querySelector('#studentsTable thead');
        thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';

        // Add rows
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = headers.map(h => `<td>${student[h] || ''}</td>`).join('');
            studentsTableBody.appendChild(row);
        });

        // Update total students count
        document.getElementById('totalStudents').textContent = students.length;
    }

    // ========== Department Management ==========
    const deptGrid = document.getElementById('deptGrid');
    const selectDepartment = document.getElementById('selectDepartment');
    const initDeptBtn = document.getElementById('initDeptBtn');
    const addOfficerForm = document.getElementById('addOfficerForm');

    // Initialize default departments (if button exists)
    if (initDeptBtn) {
        initDeptBtn.addEventListener('click', async () => {
            if (!confirm('This will create the 14 default departments. Continue?')) return;

            try {
                const res = await fetch('/admin/init-departments', { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    loadDepartments();
                } else {
                    alert(data.error || 'Failed to initialize');
                }
            } catch (err) {
                console.error(err);
                alert('Error initializing departments');
            }
        });
    }

    // Load departments
    async function loadDepartments() {
        try {
            const res = await fetch('/admin/departments');
            const data = await res.json();

            if (data.departments) {
                // Render department cards
                deptGrid.innerHTML = data.departments.map(dept => `
                    <div class="dept-card">
                        <h4>${dept.name}</h4>
                        <p class="${dept.officer_id ? 'has-officer' : 'no-officer'}">
                            ${dept.officer_id 
                                ? `Officer: ${dept.officer_name} (${dept.officer_email})` 
                                : 'No officer assigned'}
                        </p>
                    </div>
                `).join('');

                // Populate select dropdown (only departments without officers)
                selectDepartment.innerHTML = '<option value="">Choose a department...</option>';
                data.departments
                    .filter(d => !d.officer_id)
                    .forEach(dept => {
                        selectDepartment.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
                    });
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Add officer form
    addOfficerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('officerName').value;
        const email = document.getElementById('officerEmail').value;
        const password = document.getElementById('officerPassword').value;
        const departmentId = selectDepartment.value;

        if (!departmentId) {
            alert('Please select a department');
            return;
        }

        try {
            const res = await fetch('/admin/create-officer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, departmentId })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert('Officer created successfully!');
                addOfficerForm.reset();
                loadDepartments();
            } else {
                alert(data.error || 'Failed to create officer');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating officer');
        }
    });

    // Initial load
    loadStats();
    loadDepartments();

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // Nav tab handlers
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabText = this.textContent.trim();
            
            // Remove active from all, add to clicked
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Handle navigation
            if (tabText === 'Students') {
                // Scroll to students section
                document.getElementById('studentsSection').scrollIntoView({ behavior: 'smooth' });
            } else if (tabText === 'Departments') {
                // Scroll to department management section
                document.querySelector('.cards-section').scrollIntoView({ behavior: 'smooth' });
            } else if (tabText === 'Applications') {
                // Scroll to stats
                document.querySelector('.stats-row').scrollIntoView({ behavior: 'smooth' });
            } else if (tabText === 'Home') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
});