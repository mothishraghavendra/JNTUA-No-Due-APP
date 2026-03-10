document.addEventListener('DOMContentLoaded', () => {
    // Check if officer is logged in
    const officerData = localStorage.getItem('officer');
    if (!officerData) {
        window.location.href = '/login.html';
        return;
    }

    const officer = JSON.parse(officerData);

    // Display officer info
    document.getElementById('officerName').textContent = officer.name || 'N/A';
    document.getElementById('departmentName').textContent = officer.department_name || 'N/A';
    document.getElementById('officerEmail').textContent = officer.email || 'N/A';

    // Elements
    const requestsList = document.getElementById('requestsList');
    const filterBtns = document.querySelectorAll('.filter-tabs button');

    let allApprovals = [];
    let currentFilter = 'all';

    // Filter button handlers
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.id.replace('filter', '').replace('Btn', '').toLowerCase();
            renderRequests();
        });
    });

    // Load stats
    async function loadStats() {
        try {
            const res = await fetch(`/officer/stats?departmentId=${officer.department_id}`);
            const stats = await res.json();

            document.getElementById('pendingCount').textContent = stats.pending || 0;
            document.getElementById('approvedCount').textContent = stats.approved || 0;
            document.getElementById('rejectedCount').textContent = stats.rejected || 0;
            document.getElementById('totalCount').textContent = stats.total || 0;
        } catch (err) {
            console.error(err);
        }
    }

    // Load approvals
    async function loadApprovals() {
        try {
            const res = await fetch(`/officer/pending-approvals?departmentId=${officer.department_id}`);
            const data = await res.json();
            allApprovals = data.approvals || [];
            renderRequests();
        } catch (err) {
            console.error(err);
            requestsList.innerHTML = '<div class="no-requests">Failed to load requests</div>';
        }
    }

    // Render requests based on filter
    function renderRequests() {
        let filtered = allApprovals;

        if (currentFilter !== 'all') {
            filtered = allApprovals.filter(a => a.status === currentFilter);
        }

        if (filtered.length === 0) {
            requestsList.innerHTML = '<div class="no-requests">No requests found</div>';
            return;
        }

        requestsList.innerHTML = filtered.map(approval => `
            <div class="request-card ${approval.status}" data-id="${approval.approval_id}">
                <div class="request-header">
                    <div class="student-info">
                        <h3>${approval.student_name}</h3>
                        <p>${approval.student_email}</p>
                    </div>
                    <span class="request-status status-${approval.status}">${approval.status.toUpperCase()}</span>
                </div>
                <div class="request-details">
                    <span><strong>Branch:</strong> ${approval.student_branch || 'N/A'}</span>
                    <span><strong>Admission No:</strong> ${approval.admission_number || 'N/A'}</span>
                    <span><strong>Applied:</strong> ${new Date(approval.applied_at).toLocaleDateString()}</span>
                    ${approval.approved_at ? `<span><strong>Processed:</strong> ${new Date(approval.approved_at).toLocaleDateString()}</span>` : ''}
                </div>
                ${approval.status === 'pending' ? `
                    <div class="remarks-section">
                        <input type="text" class="remarks-input" placeholder="Add remarks (required for rejection)" id="remarks-${approval.approval_id}">
                    </div>
                    <div class="request-actions">
                        <button class="btn-approve" onclick="approveRequest(${approval.approval_id})">Approve</button>
                        <button class="btn-reject" onclick="rejectRequest(${approval.approval_id})">Reject</button>
                    </div>
                ` : ''}
                ${approval.status === 'rejected' ? `
                    <div class="remarks-section">
                        <input type="text" class="remarks-input" placeholder="Enter new remarks to approve" id="update-remarks-${approval.approval_id}">
                    </div>
                    <div class="request-actions">
                        <button class="btn-update" onclick="updateRejected(${approval.approval_id})">Update to Approved</button>
                    </div>
                ` : ''}
                ${approval.remarks ? `<div class="remarks-display"><strong>Remarks:</strong> ${approval.remarks}</div>` : ''}
            </div>
        `).join('');
    }

    // Approve request
    window.approveRequest = async (approvalId) => {
        const remarks = document.getElementById(`remarks-${approvalId}`).value;

        if (!confirm('Are you sure you want to approve this request?')) return;

        try {
            const res = await fetch('/officer/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approvalId,
                    officerId: officer.id,
                    remarks
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert('Request approved successfully!');
                loadApprovals();
                loadStats();
            } else {
                alert(data.error || 'Failed to approve request');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    // Reject request
    window.rejectRequest = async (approvalId) => {
        const remarks = document.getElementById(`remarks-${approvalId}`).value;

        if (!remarks.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        if (!confirm('Are you sure you want to reject this request?')) return;

        try {
            const res = await fetch('/officer/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approvalId,
                    officerId: officer.id,
                    remarks
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert('Request rejected');
                loadApprovals();
                loadStats();
            } else {
                alert(data.error || 'Failed to reject request');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    // Update rejected request to approved
    window.updateRejected = async (approvalId) => {
        const remarks = document.getElementById(`update-remarks-${approvalId}`).value;

        if (!remarks.trim()) {
            alert('Please provide a reason for updating to approved');
            return;
        }

        if (!confirm('Are you sure you want to update this rejected request to approved?')) return;

        try {
            const res = await fetch('/officer/update-rejected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approvalId,
                    officerId: officer.id,
                    remarks
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert('Request updated to approved!');
                loadApprovals();
                loadStats();
            } else {
                alert(data.error || 'Failed to update request');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    // Initial load
    loadStats();
    loadApprovals();

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('officer');
        window.location.href = '/login.html';
    });
});
