import React from 'react';
import { Card, Table, Badge, Tag, Spin, Input, Button, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

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
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  purpose: string;
  bookedBy: string;
  bookedAt: string; // ISO date string
  status: string;
  room: Room;
}

const VenueBookingView: React.FC = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]); // Today's date
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

  if (roomsLoading) return <Spin tip="Loading rooms..." />;
  if (bookingsLoading) return <Spin tip="Loading bookings..." />;

  const handleDateChange = (dateValue: Date) => {
    setDate(dateValue.toISOString().split('T')[0]);
  };

  const handleRoomChange = (value: string) => {
    setRoomId(value);
  };

  return (
    <Card title="Venue Booking Calendar" bordered={false}>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'end' }}>
        <div style={{ flex: 1 }}>
          <label>Date</label>
          <Input
            type="date"
            value={date}
            onChange={e => handleDateChange(new Date(e.target.value))}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label>Room</label>
          <select
            value={roomId || ''}
            onChange={e => handleRoomChange(e.target.value)}
          >
            <option value="">Select a room</option>
            {rooms?.map(room => (
              <option key={room.id} value={room.id}>
                {room.code} - {room.name} ({room.venue.building} Floor {room.venue.floor})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Button type="primary" onClick={() => refetchBookings()}>
            Refresh
          </Button>
        </div>
      </div>

      {!roomId ? (
        <div>Please select a room to view its booking calendar</div>
      ) : (
        <Table
          columns={[
            {
              title: 'Time',
              dataIndex: 'timeSlot',
              key: 'timeSlot',
              width: 150,
            },
            {
              title: 'Booking Details',
              dataIndex: 'details',
              key: 'details',
            },
            {
              title: 'Purpose',
              dataIndex: 'purpose',
              key: 'purpose',
            },
            {
              title: 'Booked By',
              dataIndex: 'bookedBy',
              key: 'bookedBy',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
            },
            {
              title: 'Actions',
              dataIndex: 'actions',
              key: 'actions',
              width: 100,
            },
          ]}
          dataSource={generateTimeSlots(bookings || [])}
          pagination={false}
        />
      )}
    </Card>
  );
};

// Generate standard time slots (8:00-18:00 in 1-hour blocks)
function generateTimeSlots(bookings: Booking[]) {
  const slots = [];
  for (let hour = 8; hour < 18; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    // Find booking for this time slot
    const booking = bookings.find(b =>
      b.startTime === startTime && b.endTime === endTime
    );

    slots.push({
      timeSlot: `${startTime} - ${endTime}`,
      details: booking ? (
        <div>
          <div style={{ fontWeight: 'bold' }}>{booking.room.code}</div>
          <div>Capacity: {booking.room.capacity}</div>
          <div>
            Equipment: {booking.room.equipment.map(e => `${e.type} (${e.quantity})`).join(', ')}
          </div>
        </div>
      ) : (
        <div>Available</div>
      ),
      purpose: booking?.purpose || '-',
      bookedBy: booking?.bookedBy || '-',
      status: booking?.status ? (
        <Badge
          status={booking.status === 'CONFIRMED' ? 'success' :
                   booking.status === 'CANCELLED' ? 'error' : 'warning'}
        >
          {booking.status}
        </Badge>
      ) : (
        <Badge status="success">Available</Badge>
      ),
      actions: booking ? (
        <Popconfirm
          title="Are you sure you want to cancel this booking?"
          onConfirm={() => cancelBooking(booking.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button size="small" danger>
            <DeleteOutlined />
          </Button>
        </Popconfirm>
      ) : (
        <Button size="small" type="primary">
          <PlusOutlined /> Book
        </Button>
      ),
    });
  }
  return slots;
}

export default VenueBookingView;