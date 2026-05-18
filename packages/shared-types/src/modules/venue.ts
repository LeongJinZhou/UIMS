/** Venue (building/floor) */
export interface Venue {
  id: string;
  name: string;
  building: string;
  floor: number;
  rooms: Room[];
}

/** Room within a venue */
export interface Room {
  id: string;
  venueId: string;
  code: string;          // e.g., "B3-301"
  name: string;
  capacity: number;
  equipment: RoomEquipment[];
  isActive: boolean;
  floorPlanX?: number;   // Coordinates on SVG floor plan
  floorPlanY?: number;
}

/** Equipment tag for a room */
export interface RoomEquipment {
  id: string;
  roomId: string;
  type: string;          // "PROJECTOR", "COMPUTER_LAB", "WHITEBOARD", "AV_SYSTEM"
  quantity: number;
}

/** Room availability calendar entry */
export interface RoomAvailability {
  roomId: string;
  date: string;
  slots: {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    bookedBy?: string;    // Course offering ID or event
  }[];
}

/** Room maintenance block */
export interface MaintenanceBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
}
