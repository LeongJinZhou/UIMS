import React from 'react';
import { Card, Table, Badge, Tag, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface ExamSlot {
  id: string;
  courseOffering: {
    course: {
      code: string;
      name: string;
      courseType: string;
    };
  };
  venue: {
    rooms: Array<{
      code: string;
      name: string;
      capacity: number;
    }>;
  };
  invigilator: {
    user: {
      name: string;
    };
  };
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  durationMinutes: number;
  expectedAttendance: number;
}

const ExamScheduleView: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['examSchedule'],
    queryFn: async () => {
      const response = await api.get('/exam/schedule');
      return response.data;
    },
  });

  if (isLoading) return <Spin tip="Loading exam schedule..." />;
  if (error) return <div>Error loading exam schedule</div>;

  // Sort by date and time
  const sortedSlots = (data || []).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <Card title="Examination Schedule" bordered={false}>
      <Table
        columns={[
          {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
          },
          {
            title: 'Time',
            dataIndex: 'timeSlot',
            key: 'timeSlot',
          },
          {
            title: 'Course',
            dataIndex: 'course',
            key: 'course',
          },
          {
            title: 'Venue',
            dataIndex: 'venue',
            key: 'venue',
          },
          {
            title: 'Invigilator',
            dataIndex: 'invigilator',
            key: 'invigilator',
          },
          {
            title: 'Expected Attendance',
            dataIndex: 'expectedAttendance',
            key: 'expectedAttendance',
          },
          {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
          },
        ]}
        dataSource={sortedSlots.map(slot => ({
          ...slot,
          date: new Date(slot.date).toLocaleDateString(),
          timeSlot: `${slot.startTime} - ${slot.endTime}`,
          course: `${slot.courseOffering.course.code} - ${slot.courseOffering.course.name}`,
          venue: slot.venue.rooms.map(r => `${r.code} (${r.name})`).join(', '),
          invigilator: slot.invigilator.user?.name || 'TBA',
          duration: `${slot.durationMinutes} min`,
        }))}
        pagination={false}
      />
    </Card>
  );
};

export default ExamScheduleView;