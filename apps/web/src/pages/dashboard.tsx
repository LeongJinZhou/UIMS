import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

const stats = [
  { name: 'Total Students', value: '4,821', icon: Users, trend: '+12%', color: 'blue' },
  { name: 'Active Programmes', value: '52', icon: GraduationCap, trend: '+3', color: 'indigo' },
  { name: 'Courses Offered', value: '384', icon: BookOpen, trend: 'This Sem', color: 'purple' },
  { name: 'Timetable Slots', value: '1,247', icon: Calendar, trend: '0 Clashes', color: 'green' },
];

const recentActivity = [
  { action: 'Exam results released', module: 'Semester 1 2026', status: 'completed', icon: CheckCircle },
  { action: 'Retake plans generated', module: '23 students affected', status: 'pending', icon: Clock },
  { action: 'At-risk students flagged', module: '7 students', status: 'warning', icon: AlertTriangle },
  { action: 'Timetable draft ready', module: 'Semester 2 2026', status: 'pending', icon: Clock },
];

export function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          University Integrated Management System — Overview
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-50 dark:bg-${stat.color}-950`}
              >
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {recentActivity.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 px-5 py-4">
              <item.icon
                className={`w-5 h-5 ${
                  item.status === 'completed'
                    ? 'text-green-500'
                    : item.status === 'warning'
                      ? 'text-amber-500'
                      : 'text-blue-500'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.action}
                </p>
                <p className="text-xs text-gray-500">{item.module}</p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  item.status === 'completed'
                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : item.status === 'warning'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Module quick access */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Modules
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            'M01 Programme & MQA',
            'M02 Student Profile',
            'M03 Course Engine',
            'M04 Timetable',
            'M05 Venues',
            'M06 Exam & Results',
            'M07 Enrolment',
            'M08 HR',
            'M09 Finance',
            'M10 Notifications',
          ].map((mod) => (
            <div
              key={mod}
              className="px-3 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
            >
              {mod}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
