import React from 'react';
import { Card, Table, Badge, Tag, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface TimetableSlot {
  id: string;
  courseOffering: {
    course: {
      code: string;
      name: string;
      courseType: string;
    };
    lecturer: {
      user: {
        name: string;
      };
    };
  };
  section: {
    sectionCode: string;
  };
  venue: {
    rooms: Array<{
      code: string;
      name: string;
    }>;
  };
  dayOfWeek: number; // 0=Mon, 1=Tue, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TimetableView: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      const response = await api.get('/timetable/slots');
      return response.data;
    },
  });

  if (isLoading) return <Spin tip="Loading timetable..." />;
  if (error) return <div>Error loading timetable</div>;

  // Group slots by day of week
  const slotsByDay: Record<number, TimetableSlot[]> = {};
  (data || []).forEach(slot => {
    if (!slotsByDay[slot.dayOfWeek]) {
      slotsByDay[slot.dayOfWeek] = [];
    }
    slotsByDay[slot.dayOfWeek].push(slot);
  });

  // Sort slots by start time within each day
  Object.values(slotsByDay).forEach(daySlots => {
    daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <Card title="Timetable" bordered={false}>
      <Table
        columns={[
          {
            title: 'Time',
            dataIndex: 'timeSlot',
            key: 'timeSlot',
            width: 150,
          },
          {
            title: 'Monday',
            dataIndex: 'monday',
            key: 'monday',
          },
          {
            title: 'Tuesday',
            dataIndex: 'tuesday',
            key: 'tuesday',
          },
          {
            title: 'Wednesday',
            dataIndex: 'wednesday',
            key: 'wednesday',
          },
          {
            title: 'Thursday',
            dataIndex: 'thursday',
            key: 'thursday',
          },
          {
            title: 'Friday',
            dataIndex: 'friday',
            key: 'friday',
          },
        ]}
        dataSource={generateTimeSlots()}
        pagination={false}
      />
    </Card>
  );
};

// Generate standard time slots (8:00-18:00 in 1-hour blocks)
function generateTimeSlots() {
  const slots = [];
  for (let hour = 8; hour < 18; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    slots.push({
      timeSlot: `${startTime} - ${endTime}`,
      monday: getSlotForDayAndTime(slotsByDay, 0, startTime, endTime),
      tuesday: getSlotForDayAndTime(slotsByDay, 1, startTime, endTime),
      wednesday: getSlotForDayAndTime(slotsByDay, 2, startTime, endTime),
      thursday: getSlotForDayAndTime(slotsByDay, 3, startTime, endTime),
      friday: getSlotForDayAndTime(slotsByDay, 4, startTime, endTime),
    });
  }
  return slots;
}

function getSlotForDayAndTime(
  slotsByDay: Record<number, TimetableSlot[]>,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): React.ReactNode | null {
  const daySlots = slotsByDay[dayOfWeek] || [];

  // Find slot that matches this time period
  const matchingSlot = daySlots.find(slot =>
    slot.startTime === startTime && slot.endTime === endTime
  );

  if (!matchingSlot) return null;

  return (
    <div style={{ padding: '8px' }}>
      <div style={{ fontWeight: 'bold' }}>
        {matchingSlot.courseOffering.course.code}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {matchingSlot.courseOffering.course.name}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Section {matchingSlot.section.sectionCode}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {matchingSlot.courseOffering.lecturer.user?.name || 'TBA'}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Room: {matchingSlot.venue.rooms[0]?.code || 'TBA'}
      </div>
      <Badge status={getCourseTypeStatus(matchingSlot.courseOffering.course.courseType)}>
        {matchingSlot.courseOffering.course.courseType}
      </Badge>
    </div>
  );
}

function getCourseTypeStatus(courseType: string): 'processing' | 'default' | 'success' | 'error' | 'warning' {
  switch (courseType) {
    case 'LAB':
    case 'PRACTICAL':
    case 'CLINICAL':
      return 'processing';
    case 'THEORY':
      return 'default';
    case 'INDUSTRIAL_TRAINING':
      return 'success';
    default:
      return 'default';
  }
};

export default TimetableView;