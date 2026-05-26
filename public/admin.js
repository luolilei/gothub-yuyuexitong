const authForm = document.querySelector('#authForm');
const tokenInput = document.querySelector('#tokenInput');
const rowsEl = document.querySelector('#appointmentRows');
const messageEl = document.querySelector('#message');
const refreshBtn = document.querySelector('#refreshBtn');
const totalCount = document.querySelector('#totalCount');
const pendingCount = document.querySelector('#pendingCount');
const todayCount = document.querySelector('#todayCount');

const statusText = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

let adminToken = localStorage.getItem('adminToken') || '';
tokenInput.value = adminToken;

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('error', isError);
}

function formatDateTime(row) {
  return `${row.booking_date} ${row.booking_time}`;
}

function renderStats(rows) {
  const today = new Date().toISOString().slice(0, 10);
  totalCount.textContent = rows.length;
  pendingCount.textContent = rows.filter(row => row.status === 'pending').length;
  todayCount.textContent = rows.filter(row => row.booking_date === today).length;
}

function renderRows(rows) {
  rowsEl.innerHTML = '';
  if (!rows.length) {
    rowsEl.innerHTML = '<tr><td class="empty" colspan="7">暂无预约数据</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.user_name}</td>
      <td>${row.user_phone}</td>
      <td>${row.service}</td>
      <td>${formatDateTime(row)}</td>
      <td>${row.address}</td>
      <td>${row.note || '-'}</td>
      <td>
        <select class="status" data-id="${row.id}">
          ${Object.entries(statusText).map(([value, label]) => (
            `<option value="${value}" ${row.status === value ? 'selected' : ''}>${label}</option>`
          )).join('')}
        </select>
      </td>
    `;
    fragment.appendChild(tr);
  });
  rowsEl.appendChild(fragment);
}

async function loadAppointments() {
  if (!adminToken) {
    setMessage('请输入管理员口令后查看数据。');
    return;
  }

  const res = await fetch('/api/admin/appointments', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const data = await res.json();
  if (!res.ok) {
    setMessage(data.message || '加载失败', true);
    return;
  }
  renderStats(data.appointments);
  renderRows(data.appointments);
  setMessage(`已加载 ${data.appointments.length} 条预约。`);
}

authForm.addEventListener('submit', event => {
  event.preventDefault();
  adminToken = tokenInput.value.trim();
  localStorage.setItem('adminToken', adminToken);
  loadAppointments();
});

refreshBtn.addEventListener('click', loadAppointments);

rowsEl.addEventListener('change', async event => {
  const select = event.target.closest('select[data-id]');
  if (!select) return;

  const res = await fetch('/api/admin/appointments/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      id: Number(select.dataset.id),
      status: select.value
    })
  });
  const data = await res.json();
  if (!res.ok) {
    setMessage(data.message || '状态更新失败', true);
    return;
  }
  setMessage('状态已更新。');
  loadAppointments();
});

if (adminToken) {
  loadAppointments();
}
