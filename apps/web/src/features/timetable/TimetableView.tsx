import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

function getCourseTypeBadgeVariant(courseType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (courseType) {
    case 'LAB':
    case 'PRACTICAL':
    case 'CLINICAL':
      return 'destructive';
    case 'THEORY':
      return 'default';
    case 'INDUSTRIAL_TRAINING':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getSlotForDayAndTime(
  slotsByDay: Record<number, TimetableSlot[]>,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): TimetableSlot | null {
  const daySlots = slotsByDay[dayOfWeek] || [];
  return daySlots.find(slot =>
    slot.startTime === startTime && slot.endTime === endTime
  ) || null;
}

function SlotCell({ slot }: { slot: TimetableSlot | null }) {
  if (!slot) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="space-y-0.5 p-1">
      <div className="font-semibold text-sm">{slot.courseOffering.course.code}</div>
      <div className="text-xs text-muted-foreground">{slot.courseOffering.course.name}</div>
      <div className="text-xs text-muted-foreground">Sec {slot.section.sectionCode}</div>
      <div className="text-xs text-muted-foreground">
        {slot.courseOffering.lecturer.user?.name || 'TBA'}
      </div>
      <div className="text-xs text-muted-foreground">
        Room: {slot.venue.rooms[0]?.code || 'TBA'}
      </div>
      <Badge variant={getCourseTypeBadgeVariant(slot.courseOffering.course.courseType)} className="text-[10px] px-1 py-0">
        {slot.courseOffering.course.courseType}
      </Badge>
    </div>
  );
}

const TimetableView: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      const response = await api.get('/timetable/slots');
      return response.data;
    },
  });

  if (isLoading) return <div className="p-6">Loading timetable...</div>;
  if (error) return <div className="p-6 text-destructive">Error loading timetable</div>;

  // Group slots by day of week
  const slotsByDay: Record<number, TimetableSlot[]> = {};
  (data || []).forEach((slot: TimetableSlot) => {
    if (!slotsByDay[slot.dayOfWeek]) {
      slotsByDay[slot.dayOfWeek] = [];
    }
    slotsByDay[slot.dayOfWeek].push(slot);
  });

  // Sort slots by start time within each day
  Object.values(slotsByDay).forEach(daySlots => {
    daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Generate time slots 8:00–18:00
  const timeSlots = [];
  for (let hour = 8; hour < 18; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    timeSlots.push({ startTime, endTime });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timetable</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Time</TableHead>
              {DAYS_OF_WEEK.map(day => (
                <TableHead key={day}>{day}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeSlots.map(({ startTime, endTime }) => (
              <TableRow key={startTime}>
                <TableCell className="font-mono text-sm">{startTime} - {endTime}</TableCell>
                {[0, 1, 2, 3, 4].map(dayIdx => (
                  <TableCell key={dayIdx} className="p-1 align-top min-w-[140px]">
                    <SlotCell slot={getSlotForDayAndTime(slotsByDay, dayIdx, startTime, endTime)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TimetableView;