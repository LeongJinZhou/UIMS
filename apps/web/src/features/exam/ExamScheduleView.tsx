import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
  date: string;
  startTime: string;
  endTime: string;
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

  if (isLoading) return <div className="p-6">Loading exam schedule...</div>;
  if (error) return <div className="p-6 text-destructive">Error loading exam schedule</div>;

  // Sort by date and time
  const sortedSlots = (data || []).sort((a: ExamSlot, b: ExamSlot) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Examination Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Invigilator</TableHead>
              <TableHead className="text-right">Attendance</TableHead>
              <TableHead className="text-right">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSlots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No exam schedule available
                </TableCell>
              </TableRow>
            ) : (
              sortedSlots.map((slot: ExamSlot) => (
                <TableRow key={slot.id}>
                  <TableCell>{new Date(slot.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-sm">{slot.startTime} - {slot.endTime}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{slot.courseOffering.course.code}</div>
                    <div className="text-sm text-muted-foreground">{slot.courseOffering.course.name}</div>
                  </TableCell>
                  <TableCell>
                    {slot.venue.rooms.map((r: { code: string; name: string }) => `${r.code} (${r.name})`).join(', ')}
                  </TableCell>
                  <TableCell>{slot.invigilator.user?.name || 'TBA'}</TableCell>
                  <TableCell className="text-right">{slot.expectedAttendance}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{slot.durationMinutes} min</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ExamScheduleView;