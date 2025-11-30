// attendance_app.js
// Run with: node attendance_app.js
// Requires: npm install express

const express = require("express");
const app = express();

app.use(express.json());

// ---------------------- FAKE DATABASE ---------------------- //

const employees = [
  { id: "EMP001", name: "Alice Johnson", email: "alice.j@corp.com", role: "employee" },
  { id: "EMP002", name: "Bob Smith", email: "bob.s@corp.com", role: "employee" },
  { id: "EMP003", name: "Charlie Davis", email: "charlie.d@corp.com", role: "employee" }
];

const users = [
  { email: "alice.j@corp.com", password: "password", employeeId: "EMP001", role: "employee" },
  { email: "manager.d@corp.com", password: "manager", role: "manager", name: "Manager Doe" }
];

// Demo attendance data
const attendance = [
  // Alice
  { employeeId: "EMP001", date: "2025-11-18", checkIn: "09:00", checkOut: "17:00", hours: 8.0, status: "Present" },
  { employeeId: "EMP001", date: "2025-11-19", checkIn: "08:50", checkOut: "17:10", hours: 8.3, status: "Present" },
  { employeeId: "EMP001", date: "2025-11-20", checkIn: "09:35", checkOut: "17:35", hours: 8.0, status: "Late" },
  { employeeId: "EMP001", date: "2025-11-21", checkIn: null,    checkOut: null,    hours: 0.0, status: "Absent" },
  { employeeId: "EMP001", date: "2025-11-22", checkIn: "13:00", checkOut: "17:00", hours: 4.0, status: "Half day" },

  // Bob
  { employeeId: "EMP002", date: "2025-11-18", checkIn: "09:05", checkOut: "17:00", hours: 7.9, status: "Present" },
  { employeeId: "EMP002", date: "2025-11-19", checkIn: "09:10", checkOut: "17:05", hours: 7.9, status: "Present" },

  // Charlie
  { employeeId: "EMP003", date: "2025-11-18", checkIn: "09:00", checkOut: "17:00", hours: 8.0, status: "Present" }
];

const today = "2025-11-30";
const todayAbsent = ["EMP001", "EMP002", "EMP003"]; // demo: all absent

function sum(arr) {
  return arr.reduce(function (a, b) { return a + b; }, 0);
}

// ---------------------- API ENDPOINTS ---------------------- //

// Login
app.post("/api/login", function (req, res) {
  const body = req.body || {};
  const email = body.email;
  const password = body.password;
  const mode = body.mode;

  const user = users.find(function (u) {
    return u.email === email && u.password === password && u.role === mode;
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.role === "employee") {
    const emp = employees.find(function (e) { return e.id === user.employeeId; });
    return res.json({
      role: "employee",
      name: emp.name,
      employeeId: emp.id,
      email: emp.email
    });
  }

  // manager
  return res.json({
    role: "manager",
    name: user.name,
    email: user.email
  });
});

// Employee dashboard
app.get("/api/employee/:id/dashboard", function (req, res) {
  const id = req.params.id;
  const records = attendance.filter(function (a) { return a.employeeId === id; });

  const presentCount = records.filter(function (r) { return r.status === "Present"; }).length;
  const lateCount = records.filter(function (r) { return r.status === "Late"; }).length;
  const totalHours = sum(records.map(function (r) { return r.hours; }));

  const todayRecord = records.find(function (r) { return r.date === today; });
  const todayStatus = todayRecord ? todayRecord.status : "Not Checked In";

  res.json({
    today: today,
    todayStatus: todayStatus,
    totalHours: totalHours,
    lateCount: lateCount,
    presentCount: presentCount,
    presentDays: presentCount,
    daysOff: 1
  });
});

// Employee attendance history
app.get("/api/employee/:id/attendance", function (req, res) {
  const id = req.params.id;
  const records = attendance
    .filter(function (a) { return a.employeeId === id; })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });

  res.json(records);
});

// Manager dashboard
app.get("/api/manager/dashboard", function (req, res) {
  const totalEmployees = employees.length;
  const presentToday = totalEmployees - todayAbsent.length;
  const absentToday = todayAbsent.length;
  const lateToday = 0;

  const perEmployee = employees.map(function (emp) {
    const recs = attendance.filter(function (a) { return a.employeeId === emp.id; });
    return {
      id: emp.id,
      name: emp.name,
      present: recs.filter(function (r) { return r.status === "Present"; }).length,
      halfDay: recs.filter(function (r) { return r.status === "Half day"; }).length,
      late: recs.filter(function (r) { return r.status === "Late"; }).length,
      absent: recs.filter(function (r) { return r.status === "Absent"; }).length
    };
  });

  const absentEmployees = employees
    .filter(function (e) { return todayAbsent.includes(e.id); })
    .map(function (e) { return { id: e.id, name: e.name }; });

  res.json({
    today: today,
    totalEmployees: totalEmployees,
    presentToday: presentToday,
    absentToday: absentToday,
    lateToday: lateToday,
    performance: perEmployee,
    absentEmployees: absentEmployees
  });
});

// Manager reports
app.get("/api/manager/reports", function (req, res) {
  const start = req.query.start;
  const end = req.query.end;
  const employeeId = req.query.employeeId;

  let records = attendance.slice();

  if (employeeId && employeeId !== "all") {
    records = records.filter(function (r) { return r.employeeId === employeeId; });
  }
  if (start) {
    records = records.filter(function (r) { return r.date >= start; });
  }
  if (end) {
    records = records.filter(function (r) { return r.date <= end; });
  }

  res.json(records);
});

// ---------------------- FRONTEND PAGE ---------------------- //

app.get("/", function (_req, res) {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Employee Attendance System</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f4f5fb; }
    .app { min-height: 100vh; }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: #ffffff;
      border-bottom: 1px solid #e4e4e4;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .topbar .left { font-weight: 600; color: #555; }
    .topbar nav { display: flex; gap: 8px; }
    .tab {
      border: none;
      background: transparent;
      padding: 8px 16px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .tab.active {
      background: #4f46e5;
      color: white;
    }
    .topbar .right { display: flex; gap: 12px; align-items: center; }
    .logout {
      border: none;
      padding: 6px 14px;
      border-radius: 999px;
      background: #ef4444;
      color: white;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .page { padding: 20px; max-width: 1100px; margin: 0 auto; }
    h2 { margin-top: 0; }

    .cards-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .card {
      background: #ffffff;
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
    }
    .card-title { font-size: 0.85rem; color: #6b7280; }

    .number { font-size: 1.7rem; font-weight: 600; margin-top: 6px; }

    .big-status {
      margin-top: 12px;
      padding: 26px 0;
      border-radius: 999px;
      text-align: center;
      font-weight: 600;
    }
    .big-status.red { background: #fee2e2; color: #b91c1c; }

    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 999px;
    }
    .dot.green { background: #22c55e; }
    .dot.orange { background: #f97316; }

    .table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .table th, .table td {
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 10px;
      text-align: left;
    }
    .table th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 0.8rem;
      color: #6b7280;
    }

    .pill {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
    }
    .pill.present { background: #dcfce7; color: #15803d; }
    .pill.late { background: #ffedd5; color: #c2410c; }
    .pill.halfday { background: #e0f2fe; color: #0369a1; }
    .pill.absent { background: #fee2e2; color: #b91c1c; }

    .absent-list { list-style: none; padding: 0; margin: 0; }
    .absent-list li {
      padding: 10px 12px;
      margin-bottom: 6px;
      border-radius: 10px;
      background: #fee2e2;
      display: flex;
      justify-content: space-between;
    }
    .absent-list .id {
      font-size: 0.8rem;
      color: #9f1239;
    }

    .login-layout {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f4f5fb;
    }
    .login-card {
      width: 360px;
      background: #ffffff;
      padding: 24px 26px;
      border-radius: 18px;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.16);
    }
    .login-card h1 {
      font-size: 1.4rem;
      margin: 0 0 18px;
      text-align: center;
    }
    .mode-toggle {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .mode-toggle button {
      flex: 1;
      border-radius: 999px;
      border: none;
      padding: 8px 0;
      background: #e5e7eb;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .mode-toggle .active {
      background: #4f46e5;
      color: white;
    }
    .login-card label {
      display: block;
      margin-top: 10px;
      font-size: 0.8rem;
      color: #4b5563;
    }
    .login-card input {
      width: 100%;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid #d1d5db;
      margin-top: 4px;
    }
    .primary {
      margin-top: 16px;
      padding: 10px 0;
      width: 100%;
      border: none;
      border-radius: 999px;
      background: #4f46e5;
      color: white;
      cursor: pointer;
      font-weight: 500;
    }
    .primary.full { width: 100%; }
    .hint {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 12px;
    }
    .error {
      margin-top: 8px;
      font-size: 0.78rem;
      color: #b91c1c;
    }

    .toolbar { margin-bottom: 10px; }
    .toolbar select,
    .filters select,
    .filters input[type="date"] {
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 10px 0 16px;
    }
    .filters label {
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
    }
    .mt { margin-top: 18px; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
    var state = {
      user: null, // {role, name, employeeId?}
      view: "login",
      empDashboard: null,
      empAttendance: [],
      mgrDashboard: null,
      mgrReports: []
    };

    function setState(patch) {
      for (var k in patch) { state[k] = patch[k]; }
      render();
    }

    function api(path, options) {
      options = options || {};
      return fetch(path, options).then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      });
    }

    function render() {
      var root = document.getElementById("root");

      if (!state.user) {
        root.innerHTML = renderLogin();
        attachLoginHandlers();
        return;
      }

      // with user
      var topbar = renderTopbar();
      var page = "";

      if (state.user.role === "employee") {
        if (state.view === "empDashboard") {
          page = renderEmployeeDashboard();
        } else {
          page = renderEmployeeAttendance();
        }
      } else {
        if (state.view === "mgrDashboard") {
          page = renderManagerDashboard();
        } else {
          page = renderManagerReports();
        }
      }

      root.innerHTML = '<div class="app">' + topbar + page + "</div>";
      attachTopbarHandlers();
      attachPageHandlers();
    }

    // ------------- LOGIN VIEW ------------- //
    function renderLogin() {
      return (
        '<div class="login-layout">' +
          '<div class="login-card">' +
            '<h1>Employee Attendance System</h1>' +
            '<div class="mode-toggle">' +
              '<button id="btn-emp-mode" class="active">Login as Employee</button>' +
              '<button id="btn-mgr-mode">Login as Manager</button>' +
            '</div>' +
            '<form id="login-form">' +
              '<label>Email address</label>' +
              '<input id="login-email" value="alice.j@corp.com" />' +
              '<label>Password</label>' +
              '<input id="login-password" type="password" value="password" />' +
              '<div id="login-error" class="error" style="display:none;"></div>' +
              '<button type="submit" class="primary">Sign in</button>' +
            '</form>' +
            '<p class="hint">' +
              'Hint: Use <b>alice.j@corp.com / password</b> for Employee, or ' +
              '<b>manager.d@corp.com / manager</b> for Manager.' +
            '</p>' +
          '</div>' +
        '</div>'
      );
    }

    function attachLoginHandlers() {
      var mode = "employee";
      var btnEmp = document.getElementById("btn-emp-mode");
      var btnMgr = document.getElementById("btn-mgr-mode");
      var emailInput = document.getElementById("login-email");
      var passInput = document.getElementById("login-password");
      var errorBox = document.getElementById("login-error");

      btnEmp.onclick = function () {
        mode = "employee";
        btnEmp.classList.add("active");
        btnMgr.classList.remove("active");
        emailInput.value = "alice.j@corp.com";
        passInput.value = "password";
      };

      btnMgr.onclick = function () {
        mode = "manager";
        btnMgr.classList.add("active");
        btnEmp.classList.remove("active");
        emailInput.value = "manager.d@corp.com";
        passInput.value = "manager";
      };

      document.getElementById("login-form").onsubmit = function (e) {
        e.preventDefault();
        errorBox.style.display = "none";
        api("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailInput.value,
            password: passInput.value,
            mode: mode
          })
        }).then(function (user) {
          setState({ user: user, view: user.role === "employee" ? "empDashboard" : "mgrDashboard" });
          if (user.role === "employee") {
            loadEmployeeData(user.employeeId);
          } else {
            loadManagerData();
          }
        }).catch(function () {
          errorBox.textContent = "Invalid credentials";
          errorBox.style.display = "block";
        });
      };
    }

    // ------------- TOPBAR ------------- //
    function renderTopbar() {
      var title = state.user.role === "employee" ? "Attendance | Employee" : "Attendance | Manager";
      var tabs = "";
      if (state.user.role === "employee") {
        tabs += '<button class="tab ' + (state.view === "empDashboard" ? "active" : "") + '" data-view="empDashboard">Dashboard</button>';
        tabs += '<button class="tab ' + (state.view === "empAttendance" ? "active" : "") + '" data-view="empAttendance">My Attendance</button>';
      } else {
        tabs += '<button class="tab ' + (state.view === "mgrDashboard" ? "active" : "") + '" data-view="mgrDashboard">Dashboard</button>';
        tabs += '<button class="tab ' + (state.view === "mgrReports" ? "active" : "") + '" data-view="mgrReports">Reports</button>';
      }

      var nameLabel = state.user.role === "employee" ? state.user.name : "Manager Doe";

      return (
        '<header class="topbar">' +
          '<div class="left">' + title + '</div>' +
          '<nav>' + tabs + '</nav>' +
          '<div class="right">' +
            '<span>Welcome, ' + nameLabel + '</span>' +
            '<button class="logout" id="btn-logout">Logout</button>' +
          '</div>' +
        '</header>'
      );
    }

    function attachTopbarHandlers() {
      var tabs = document.querySelectorAll(".tab");
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].onclick = function () {
          var v = this.getAttribute("data-view");
          setState({ view: v });
          if (state.user.role === "employee") {
            if (v === "empDashboard") loadEmployeeDashboard(state.user.employeeId);
            if (v === "empAttendance") loadEmployeeAttendance(state.user.employeeId);
          } else {
            if (v === "mgrDashboard") loadManagerDashboard();
            if (v === "mgrReports") loadManagerReports();
          }
        };
      }
      var logoutBtn = document.getElementById("btn-logout");
      logoutBtn.onclick = function () {
        setState({
          user: null,
          view: "login",
          empDashboard: null,
          empAttendance: [],
          mgrDashboard: null,
          mgrReports: []
        });
      };
    }

    // ------------- EMPLOYEE DASHBOARD ------------- //
    function renderEmployeeDashboard() {
      var d = state.empDashboard;
      if (!d) {
        return '<div class="page">Loading...</div>';
      }
      return (
        '<div class="page">' +
          '<h2>Employee Dashboard</h2>' +
          '<div class="cards-row">' +
            '<div class="card">' +
              '<span class="card-title">Quick Action</span>' +
              '<button class="primary full">Check In</button>' +
            '</div>' +
            '<div class="card">' +
              '<span class="card-title">Today\\'s Status (' + d.today + ')</span>' +
              '<div class="big-status red">' + d.todayStatus + '</div>' +
            '</div>' +
            '<div class="card">' +
              '<span class="card-title">Total Hours This Month</span>' +
              '<div class="number">' + d.totalHours.toFixed(1) + '</div>' +
              '<small>Target: ~160 hours</small>' +
            '</div>' +
            '<div class="card">' +
              '<span class="card-title">Late Arrivals This Month</span>' +
              '<div class="number">' + d.lateCount + '</div>' +
              '<small>Present Days: ' + d.presentDays + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<h3>Monthly Attendance Breakdown</h3>' +
            '<table class="table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Status</th>' +
                  '<th>Count</th>' +
                  '<th>Indicator</th>' +
                  '<th>Days Off</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td>Present</td>' +
                  '<td>' + d.presentCount + '</td>' +
                  '<td><span class="dot green"></span></td>' +
                  '<td>' + d.daysOff + '</td>' +
                '</tr>' +
                '<tr>' +
                  '<td>Late</td>' +
                  '<td>' + d.lateCount + '</td>' +
                  '<td><span class="dot orange"></span></td>' +
                  '<td>--</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>'
      );
    }

    function loadEmployeeDashboard(id) {
      api("/api/employee/" + id + "/dashboard").then(function (data) {
        setState({ empDashboard: data });
      });
    }

    function loadEmployeeAttendance(id) {
      api("/api/employee/" + id + "/attendance").then(function (rows) {
        setState({ empAttendance: rows });
      });
    }

    function loadEmployeeData(id) {
      loadEmployeeDashboard(id);
      loadEmployeeAttendance(id);
    }

    function renderEmployeeAttendance() {
      var rows = state.empAttendance || [];
      var htmlRows = rows.map(function (r) {
        var cls = r.status.replace(" ", "").toLowerCase(); // present, late, halfday, absent
        return (
          '<tr>' +
            '<td>' + r.date + '</td>' +
            '<td>' + (r.checkIn || "--") + '</td>' +
            '<td>' + (r.checkOut || "--") + '</td>' +
            '<td>' + r.hours.toFixed(1) + '</td>' +
            '<td><span class="pill ' + cls + '">' + r.status + '</span></td>' +
          '</tr>'
        );
      }).join("");

      return (
        '<div class="page">' +
          '<h2>My Attendance History (Table View)</h2>' +
          '<div class="card">' +
            '<div class="toolbar">' +
              '<select><option>Filter by Month (Current)</option></select>' +
            '</div>' +
            '<table class="table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + htmlRows + '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>'
      );
    }

    // ------------- MANAGER DASHBOARD ------------- //
    function renderManagerDashboard() {
      var d = state.mgrDashboard;
      if (!d) return '<div class="page">Loading...</div>';

      var perfRows = d.performance.map(function (emp) {
        return (
          '<tr>' +
            '<td>' + emp.name + '</td>' +
            '<td>' + emp.present + '</td>' +
            '<td>' + emp.halfDay + '</td>' +
            '<td>' + emp.late + '</td>' +
            '<td>' + emp.absent + '</td>' +
          '</tr>'
        );
      }).join("");

      var absentList = d.absentEmployees.map(function (a) {
        return '<li><span>' + a.name + '</span><span class="id">ID: ' + a.id + '</span></li>';
      }).join("");

      return (
        '<div class="page">' +
          '<h2>Manager Dashboard</h2>' +
          '<div class="cards-row">' +
            renderInfoCard("Total Employees", d.totalEmployees) +
            renderInfoCard("Present Today", d.presentToday) +
            renderInfoCard("Absent Today", d.absentToday) +
            renderInfoCard("Late Arrivals Today", d.lateToday) +
          '</div>' +
          '<div class="card">' +
            '<h3>Employee Monthly Performance (Total Records)</h3>' +
            '<table class="table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Employee</th><th>Present</th><th>Half Day</th><th>Late</th><th>Absent</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + perfRows + '</tbody>' +
            '</table>' +
          '</div>' +
          '<div class="card">' +
            '<h3>Absent Employees Today (' + d.today + ')</h3>' +
            '<ul class="absent-list">' + absentList + '</ul>' +
          '</div>' +
        '</div>'
      );
    }

    function renderInfoCard(title, value) {
      return (
        '<div class="card">' +
          '<span class="card-title">' + title + '</span>' +
          '<div class="number">' + value + '</div>' +
        '</div>'
      );
    }

    function loadManagerDashboard() {
      api("/api/manager/dashboard").then(function (data) {
        setState({ mgrDashboard: data });
      });
    }

    function loadManagerReports() {
      // default values stored in DOM; here we simply reload using them
      var startInput = document.getElementById("rep-start");
      var endInput = document.getElementById("rep-end");
      var empSelect = document.getElementById("rep-emp");
      var start = startInput ? startInput.value : "2025-11-01";
      var end = endInput ? endInput.value : "2025-11-30";
      var emp = empSelect ? empSelect.value : "all";

      api("/api/manager/reports?start=" + encodeURIComponent(start) +
          "&end=" + encodeURIComponent(end) +
          "&employeeId=" + encodeURIComponent(emp))
      .then(function (rows) {
        setState({ mgrReports: rows });
      });
    }

    function loadManagerData() {
      loadManagerDashboard();
      // reports loaded when page rendered
    }

    function renderManagerReports() {
      var rows = state.mgrReports || [];
      var htmlRows = rows.map(function (r, idx) {
        return (
          '<tr>' +
            '<td>' + r.employeeId + '</td>' +
            '<td>' + r.date + '</td>' +
            '<td>' + (r.checkIn || "--") + '</td>' +
            '<td>' + (r.checkOut || "--") + '</td>' +
            '<td>' + r.hours.toFixed(1) + '</td>' +
            '<td>' + r.status + '</td>' +
          '</tr>'
        );
      }).join("");

      return (
        '<div class="page">' +
          '<h2>Attendance Reports (CSV Export)</h2>' +
          '<div class="card">' +
            '<p>This page simulates the Report Generation and CSV Export functionality. In production, the server would generate a CSV file.</p>' +
            '<div class="filters">' +
              '<label>Date Range Start' +
                '<input id="rep-start" type="date" value="2025-11-01" />' +
              '</label>' +
              '<label>Date Range End' +
                '<input id="rep-end" type="date" value="2025-11-30" />' +
              '</label>' +
              '<label>Employee' +
                '<select id="rep-emp">' +
                  '<option value="all">All Employees</option>' +
                  '<option value="EMP001">EMP001 - Alice Johnson</option>' +
                  '<option value="EMP002">EMP002 - Bob Smith</option>' +
                  '<option value="EMP003">EMP003 - Charlie Davis</option>' +
                '</select>' +
              '</label>' +
            '</div>' +
            '<button class="primary" id="btn-generate">Generate & Export to CSV (Simulated)</button>' +
            '<table class="table mt">' +
              '<thead>' +
                '<tr>' +
                  '<th>Employee ID</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + htmlRows + '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>'
      );
    }

    function attachPageHandlers() {
      if (!state.user) return;

      if (state.user.role === "manager" && state.view === "mgrReports") {
        var btn = document.getElementById("btn-generate");
        if (btn) {
          btn.onclick = function () {
            loadManagerReports();
          };
        }
      }
    }

    // Initial render
    render();
  </script>
</body>
</html>`);
});

// ---------------------- START SERVER ---------------------- //

const PORT = 3000;
app.listen(PORT, function () {
  console.log("Attendance app running at http://localhost:" + PORT);
});