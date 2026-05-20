import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './providers/query-provider';
import { DashboardLayout } from './layouts/dashboard-layout';

// Pages & Layouts
import { DashboardPage } from './pages/dashboard';
import { LoginPage } from './pages/login';

// Implemented Features
import { TimetableView } from './features/timetable';
import { VenueBookingView } from './features/venue';
import { ExamScheduleView } from './features/exam';
import { HrDashboard, LecturerManagement } from './features/hr';
import { FinanceDashboard, FeeManagement } from './features/finance';
import { AtRiskStudentDashboard } from './features/at-risk-student';
import { AppealPreAssessmentDashboard } from './features/appeal-pre-assessment';

// Tabbed wrapper for Student Profile & At-Risk analysis
function StudentsPage() {
  const [activeTab, setActiveTab] = useState<'at-risk' | 'list'>('at-risk');
  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'at-risk'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('at-risk')}
        >
          At-Risk Detection
        </button>
        <button
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('list')}
        >
          Student Profiles
        </button>
      </div>
      {activeTab === 'at-risk' ? (
        <AtRiskStudentDashboard />
      ) : (
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          Student Profiles & Academic Study Plan Manager — Coming Soon
        </div>
      )}
    </div>
  );
}

// Tabbed wrapper for HR Dashboard & Lecturer Management
function HrPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'management'>('dashboard');
  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          HR Dashboard
        </button>
        <button
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'management'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('management')}
        >
          Lecturer Management
        </button>
      </div>
      {activeTab === 'dashboard' ? <HrDashboard /> : <LecturerManagement />}
    </div>
  );
}

// Tabbed wrapper for Finance Dashboard & Fee Management
function FinancePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fees'>('dashboard');
  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          Finance Dashboard
        </button>
        <button
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'fees'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('fees')}
        >
          Fee Management
        </button>
      </div>
      {activeTab === 'dashboard' ? <FinanceDashboard /> : <FeeManagement />}
    </div>
  );
}

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
            <Route path="programmes" element={<div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">MQA-Approved Course Sequences & MQA Syllabus Repository — Coming Soon</div>} />

            {/* M02: Student Profile */}
            <Route path="students" element={<StudentsPage />} />

            {/* M03: Courses */}
            <Route path="courses" element={<div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">Course Prerequisite Engine & Equivalency Register — Coming Soon</div>} />

            {/* M04: Timetable */}
            <Route path="timetable" element={<TimetableView />} />

            {/* M05: Venues */}
            <Route path="venues" element={<VenueBookingView />} />

            {/* M06: Exams */}
            <Route path="exams" element={<ExamScheduleView />} />

            {/* M07: Enrolment */}
            <Route path="enrolment" element={<div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">Semester Registration & Subject Drop/Add Gate — Coming Soon</div>} />

            {/* M08: HR */}
            <Route path="hr" element={<HrPage />} />

            {/* M09: Finance */}
            <Route path="finance" element={<FinancePage />} />

            {/* M10: Notifications & Appeals */}
            <Route path="notifications" element={<div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">Notifications Center & System Alerts — Coming Soon</div>} />
            <Route path="appeals" element={<AppealPreAssessmentDashboard />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
