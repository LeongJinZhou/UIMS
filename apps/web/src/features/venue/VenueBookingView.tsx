import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Room {
  id: string;
  code: string;
  name: string;
  capacity: number;
  venue: {
    id: string;
    name: string;
    building: string;
    floor: number;
  };
  equipment: Array<{
    type: string;
    quantity: number;
  }>;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  bookedBy: string;
  bookedAt: string;
  status: string;
  room: Room;
}

const VenueBookingView: React.FC = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [roomId, setRoomId] = React.useState<string | null>(null);

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await api.get('/venue/rooms');
      return response.data;
    },
  });

  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['venueBookings', date, roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const response = await api.get(`/venue/rooms/${roomId}/bookings`, {
        params: { date }
      });
      return response.data;
    },
    enabled: !!roomId,
  });

  const { mutate: cancelBooking } = useMutation({
    mutationFn: (bookingId: string) =>
      api.delete(`/venue/bookings/${bookingId}`),
    onSuccess: () => {
      refetchBookings();
      queryClient.invalidateQueries({ queryKey: ['venueBookings'] });
    },
  });

  if (roomsLoading) return <div className="p-6">Loading rooms...</div>;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoomId(e.target.value || null);
  };

  // Generate time slots 8:00–18:00
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      const booking = (bookings || []).find(
        (b: Booking) => b.startTime === startTime && b.endTime === endTime
      );
      slots.push({ startTime, endTime, booking });
    }
    return slots;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venue Booking Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
          <div className="flex-[2] min-w-[250px]">
            <label className="block text-sm font-medium mb-1">Room</label>
            <select
              value={roomId || ''}
              onChange={handleRoomChange}
              className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="">Select a room</option>
              {rooms?.map((room: Room) => (
                <option key={room.id} value={room.id}>
                  {room.code} - {room.name} ({room.venue.building} Floor {room.venue.floor})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => refetchBookings()}>Refresh</Button>
        </div>

        {!roomId ? (
          <div className="text-center py-8 text-muted-foreground">
            Please select a room to view its booking calendar
          </div>
        ) : bookingsLoading ? (
          <div className="text-center py-8">Loading bookings...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Time</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Booked By</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generateTimeSlots().map(({ startTime, endTime, booking }) => (
                <TableRow key={startTime}>
                  <TableCell className="font-mono">{startTime} - {endTime}</TableCell>
                  <TableCell>
                    {booking ? (
                      <div>
                        <div className="font-semibold">{booking.room.code}</div>
                        <div className="text-sm text-muted-foreground">
                          Capacity: {booking.room.capacity}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Available</span>
                    )}
                  </TableCell>
                  <TableCell>{booking?.purpose || '-'}</TableCell>
                  <TableCell>{booking?.bookedBy || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking?.status === 'CONFIRMED' ? 'default' :
                        booking?.status === 'CANCELLED' ? 'destructive' :
                        !booking ? 'secondary' : 'outline'
                      }
                    >
                      {booking?.status || 'Available'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {booking ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Cancel this booking?')) {
                            cancelBooking(booking.id);
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">Book</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default VenueBookingView;