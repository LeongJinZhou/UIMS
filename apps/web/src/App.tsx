import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './providers/query-provider';
import { DashboardLayout } from './layouts/dashboard-layout';

// Pages
import { DashboardPage } from './pages/dashboard';
import { LoginPage } from './pages/login';

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard (protected) */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />

            {/* M01: Programme & MQA */}
            <Route path="programmes" element={<div>Programmes — Coming Soon</div>} />

            {/* M02: Student Profile */}
            <Route path="students" element={<div>Students — Coming Soon</div>} />

            {/* M03: Courses */}
            <Route path="courses" element={<div>Courses — Coming Soon</div>} />

            {/* M04: Timetable */}
            <Route path="timetable" element={<div>Timetable — Coming Soon</div>} />

            {/* M05: Venues */}
            <Route path="venues" element={<div>Venues — Coming Soon</div>} />

            {/* M06: Exams */}
            <Route path="exams" element={<div>Exams & Results — Coming Soon</div>} />

            {/* M07: Enrolment */}
            <Route path="enrolment" element={<div>Enrolment — Coming Soon</div>} />

            {/* M08: HR */}
            <Route path="hr" element={<div>HR & Lecturers — Coming Soon</div>} />

            {/* M09: Finance */}
            <Route path="finance" element={<div>Finance — Coming Soon</div>} />

            {/* M10: Notifications & Appeals */}
            <Route path="notifications" element={<div>Notifications — Coming Soon</div>} />
            <Route path="appeals" element={<div>Appeals — Coming Soon</div>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
