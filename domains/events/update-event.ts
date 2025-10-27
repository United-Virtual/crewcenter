import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { getEventAircraft, getEventById, getEventGates } from '@/db/queries';
import { users } from '@/db/schema';
import {
  type Event,
  type EventAircraft,
  eventAircraft,
  type EventGate,
  eventGates,
  events,
  type NewEvent,
} from '@/db/schema';
import { MAX_CARGO_KG, MAX_FUEL_KG } from '@/lib/constants';
import { hasRequiredRole, parseRolesField } from '@/lib/roles';

import { deleteEventImage, uploadEventImage } from './upload-event-image';

const ICAO_REGEX = /^[A-Z]{4}$/;

const _updateEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Event title is required')
    .max(100, 'Event title must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  imageUrl: z.string().optional(),
  departureIcao: z
    .string()
    .length(4, 'Departure ICAO must be exactly 4 characters')
    .regex(ICAO_REGEX, 'ICAO must contain exactly 4 uppercase letters (A-Z)'),
  arrivalIcao: z
    .string()
    .length(4, 'Arrival ICAO must be exactly 4 characters')
    .regex(ICAO_REGEX, 'ICAO must contain exactly 4 uppercase letters (A-Z)'),
  departureTime: z.date().refine((date) => {
    const now = new Date();
    return date > now;
  }, 'Departure time must be in the future'),
  flightTime: z
    .number()
    .min(1, 'Flight time must be at least 1 minute')
    .max(1440, 'Flight time must be at most 24 hours'),
  flightNumber: z
    .string()
    .min(1, 'Flight number is required')
    .max(20, 'Flight number must be less than 20 characters'),
  cargo: z
    .number()
    .min(0, 'Cargo must be non-negative')
    .max(
      MAX_CARGO_KG,
      `Cargo must be at most ${MAX_CARGO_KG.toLocaleString()} kg`
    )
    .optional(),
  fuel: z
    .number()
    .min(0, 'Fuel must be non-negative')
    .max(MAX_FUEL_KG, `Fuel must be at most ${MAX_FUEL_KG.toLocaleString()} kg`)
    .optional(),
  multiplierId: z.string().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']),
  aircraftIds: z
    .array(z.string().min(1, 'Aircraft ID is required'))
    .min(1, 'At least one aircraft must be selected'),
  departureGates: z
    .array(z.string().min(1, 'Gate number is required'))
    .optional(),
  arrivalGates: z
    .array(z.string().min(1, 'Gate number is required'))
    .optional(),
});

type UpdateEventData = z.infer<typeof _updateEventSchema> & {
  imageFile?: File;
};

export type UpdateEventResult = {
  event: Event;
  aircraft: EventAircraft[];
  gates: EventGate[];
};

// Database mutations
async function updateEventMutation(
  id: string,
  eventData: Partial<NewEvent>
): Promise<Event | null> {
  const result = await db
    .update(events)
    .set({ ...eventData, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return result[0] ?? null;
}

async function addAircraftToEventMutation(
  eventId: string,
  aircraftId: string
): Promise<EventAircraft | null> {
  const result = await db
    .insert(eventAircraft)
    .values({
      id: crypto.randomUUID(),
      eventId,
      aircraftId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0] ?? null;
}

async function removeAircraftFromEventMutation(
  eventId: string,
  aircraftId: string
): Promise<boolean> {
  await db
    .delete(eventAircraft)
    .where(
      and(
        eq(eventAircraft.eventId, eventId),
        eq(eventAircraft.aircraftId, aircraftId)
      )
    );
  return true;
}

async function addGateToEventMutation(
  eventId: string,
  gateNumber: string,
  airportType: string
): Promise<EventGate | null> {
  const result = await db
    .insert(eventGates)
    .values({
      id: crypto.randomUUID(),
      eventId,
      gateNumber,
      airportType,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0] ?? null;
}

async function removeGateFromEventMutation(
  eventId: string,
  gateNumber: string,
  airportType: string
): Promise<boolean> {
  await db
    .delete(eventGates)
    .where(
      and(
        eq(eventGates.eventId, eventId),
        eq(eventGates.gateNumber, gateNumber),
        eq(eventGates.airportType, airportType)
      )
    );
  return true;
}

export async function updateEventRecord(
  eventId: string,
  data: UpdateEventData,
  userId: string,
  imageFile?: File
): Promise<UpdateEventResult> {
  const existingEvent = await getEventById(eventId);
  if (!existingEvent) {
    throw new Error('Event not found');
  }

  if (existingEvent.createdBy !== userId) {
    const currentUser = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    const userRoles = parseRolesField(currentUser?.role ?? null);
    const allowed = hasRequiredRole(userRoles, ['events']);
    if (!allowed) {
      throw new Error('Access denied. Required role: events');
    }
  }

  let imageUrl = data.imageUrl;

  if (imageFile) {
    // Delete old image if it exists
    if (existingEvent.imageUrl) {
      await deleteEventImage(existingEvent.imageUrl);
    }
    // Upload new image
    imageUrl = await uploadEventImage({ eventId, file: imageFile });
  }

  const updatedEvent = await updateEventMutation(eventId, {
    title: data.title,
    description: data.description,
    imageUrl: imageUrl,
    departureIcao: data.departureIcao,
    arrivalIcao: data.arrivalIcao,
    departureTime: data.departureTime,
    flightTime: data.flightTime,
    flightNumber: data.flightNumber,
    cargo: data.cargo ?? 0,
    fuel: data.fuel ?? 0,
    multiplierId: data.multiplierId || null,
    status: data.status,
  });

  if (!updatedEvent) {
    throw new Error('Failed to update event');
  }

  const [existingAircraft, existingGates] = await Promise.all([
    getEventAircraft(eventId),
    getEventGates(eventId),
  ]);

  const existingAircraftIds = existingAircraft.map((ea) => ea.aircraftId);
  const newAircraftIds = data.aircraftIds;

  const aircraftToAdd = newAircraftIds.filter(
    (id) => !existingAircraftIds.includes(id)
  );
  const aircraftToRemove = existingAircraftIds.filter(
    (id) => !newAircraftIds.includes(id)
  );

  const existingDepartureGates = existingGates
    .filter((g) => g.airportType === 'departure')
    .map((g) => g.gateNumber);
  const existingArrivalGates = existingGates
    .filter((g) => g.airportType === 'arrival')
    .map((g) => g.gateNumber);

  const departureGatesToAdd = (data.departureGates || []).filter(
    (gate) => !existingDepartureGates.includes(gate)
  );
  const departureGatesToRemove = existingDepartureGates.filter(
    (gate) => !(data.departureGates || []).includes(gate)
  );

  const arrivalGatesToAdd = (data.arrivalGates || []).filter(
    (gate) => !existingArrivalGates.includes(gate)
  );
  const arrivalGatesToRemove = existingArrivalGates.filter(
    (gate) => !(data.arrivalGates || []).includes(gate)
  );

  const aircraftAddPromises = aircraftToAdd.map((aircraftId) =>
    addAircraftToEventMutation(eventId, aircraftId)
  );

  const aircraftRemovePromises = aircraftToRemove.map((aircraftId) =>
    removeAircraftFromEventMutation(eventId, aircraftId)
  );

  const departureGateAddPromises = departureGatesToAdd.map((gateNumber) =>
    addGateToEventMutation(eventId, gateNumber, 'departure')
  );

  const departureGateRemovePromises = departureGatesToRemove.map((gateNumber) =>
    removeGateFromEventMutation(eventId, gateNumber, 'departure')
  );

  const arrivalGateAddPromises = arrivalGatesToAdd.map((gateNumber) =>
    addGateToEventMutation(eventId, gateNumber, 'arrival')
  );

  const arrivalGateRemovePromises = arrivalGatesToRemove.map((gateNumber) =>
    removeGateFromEventMutation(eventId, gateNumber, 'arrival')
  );

  await Promise.all([
    ...aircraftAddPromises,
    ...aircraftRemovePromises,
    ...departureGateAddPromises,
    ...departureGateRemovePromises,
    ...arrivalGateAddPromises,
    ...arrivalGateRemovePromises,
  ]);

  const [updatedAircraft, updatedGates] = await Promise.all([
    getEventAircraft(eventId),
    getEventGates(eventId),
  ]);

  return {
    event: updatedEvent,
    aircraft: updatedAircraft,
    gates: updatedGates,
  };
}

export async function updateEvent(
  eventId: string,
  data: UpdateEventData,
  userId: string,
  imageFile?: File
): Promise<UpdateEventResult> {
  return updateEventRecord(eventId, data, userId, imageFile);
}
