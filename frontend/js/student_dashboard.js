document.addEventListener('DOMContentLoaded', () => {
    // Check if student is logged in
    const studentData = localStorage.getItem('student');
    if (!studentData) {
        window.location.href = '/login.html';
        return;
    }

    const student = JSON.parse(studentData);

    // Display student info
    document.getElementById('studentName').textContent = student.name || 'N/A';
    document.getElementById('studentAdmission').textContent = student.admission_number || 'N/A';

    // Elements
    const nodueForm = document.getElementById('nodueForm');
    const nodueFormSection = document.getElementById('nodueFormSection');
    const statusSection = document.getElementById('statusSection');
    const statusContent = document.getElementById('statusContent');
    const selectAll = document.getElementById('selectAll');
    const departmentItems = document.querySelectorAll('.department-item');
    const departmentCheckboxes = document.querySelectorAll('input[name="departments"]');
    const raiseBtn = document.getElementById('raiseBtn');

    // Visual feedback for checkbox selection
    departmentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const item = checkbox.closest('.department-item');
            if (checkbox.checked) {
                item.classList.add('checked');
            } else {
                item.classList.remove('checked');
            }
            updateSelectAllState();
        });
    });

    // Click on department item to toggle checkbox
    departmentItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    });

    // Select all functionality
    selectAll.addEventListener('change', () => {
        departmentCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
            const item = checkbox.closest('.department-item');
            if (selectAll.checked) {
                item.classList.add('checked');
            } else {
                item.classList.remove('checked');
            }
        });
    });

    function updateSelectAllState() {
        const allChecked = Array.from(departmentCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(departmentCheckboxes).some(cb => cb.checked);
        selectAll.checked = allChecked;
        selectAll.indeterminate = someChecked && !allChecked;
    }

    // Load application status
    async function loadApplicationStatus() {
        try {
            const res = await fetch(`/student/application-status?studentId=${student.id}`);
            const data = await res.json();

            if (data.hasApplication) {
                // Hide form, show status
                nodueFormSection.style.display = 'none';
                statusSection.style.display = 'block';

                const app = data.application;
                
                // Sort approvals: rejected first, then pending, then approved
                const sortedApprovals = data.approvals.sort((a, b) => {
                    const order = { 'rejected': 0, 'pending': 1, 'approved': 2 };
                    return order[a.status] - order[b.status];
                });

                let statusHTML = `
                    <div class="application-info">
                        <p><strong>Application ID:</strong> #${app.id}</p>
                        <p><strong>Applied On:</strong> ${new Date(app.applied_at).toLocaleString()}</p>
                        <p><strong>Overall Status:</strong> 
                            <span class="status-badge status-${app.status}">${app.status.toUpperCase()}</span>
                        </p>
                        <p><strong>Progress:</strong> <i class="fas fa-check-circle" style="color: #43a047"></i> ${app.approved_count} Approved, <i class="fas fa-clock" style="color: #ffc107"></i> ${app.pending_count} Pending, <i class="fas fa-times-circle" style="color: #e53935"></i> ${app.rejected_count} Rejected</p>
                        ${app.status === 'completed' ? `
                            <div style="margin-top: 15px;">
                                <button onclick="downloadCertificate()" class="btn btn-success" style="padding: 12px 24px; font-size: 14px;">
                                    <i class="fas fa-download"></i> Download No Due Certificate
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div style="padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; font-weight: 600; color: #444;">
                        Department-wise Status
                    </div>
                    <div class="status-grid">
                `;

                sortedApprovals.forEach(approval => {
                    statusHTML += `
                        <div class="status-item ${approval.status} ${approval.status === 'rejected' ? 'rejected-item' : ''}">
                            <div class="item-header">
                                <span style="font-weight: 500;">${approval.department_name}</span>
                                <span class="status-badge status-${approval.status}">${approval.status.toUpperCase()}</span>
                            </div>
                            ${approval.status === 'rejected' && approval.remarks ? 
                                `<div class="rejection-reason"><strong>Reason:</strong> ${approval.remarks}</div>` : ''}
                        </div>
                    `;
                });

                statusHTML += '</div>';
                statusContent.innerHTML = statusHTML;
            } else {
                // Show form, hide status
                nodueFormSection.style.display = 'block';
                statusSection.style.display = 'none';
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Initial load
    loadApplicationStatus();

    // Handle form submission
    nodueForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedDepts = Array.from(departmentCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (selectedDepts.length === 0) {
            alert('Please select at least one department');
            return;
        }

        if (!confirm(`You are about to raise a No Due request for ${selectedDepts.length} department(s). Continue?`)) {
            return;
        }

        raiseBtn.disabled = true;
        raiseBtn.textContent = 'Submitting...';

        try {
            const res = await fetch('/student/raise-nodue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: student.id,
                    departments: selectedDepts
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert('No Due request raised successfully!');
                loadApplicationStatus();
            } else {
                alert(data.error || 'Failed to raise request');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred. Please try again.');
        } finally {
            raiseBtn.disabled = false;
            raiseBtn.textContent = 'Raise No Due Request';
        }
    });

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('student');
        window.location.href = '/login.html';
    });
});

// Download certificate function (global scope for onclick)
function downloadCertificate() {
    const student = JSON.parse(localStorage.getItem('student') || '{}');
    if (!student.id) {
        alert('Please login again');
        window.location.href = '/login.html';
        return;
    }
    
    // Open PDF in new tab/download
    window.open(`/student/download-certificate?studentId=${student.id}`, '_blank');
}
