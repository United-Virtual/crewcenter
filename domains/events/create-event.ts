import { z } from 'zod';

import { db } from '@/db';
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

import { uploadEventImage } from './upload-event-image';

const ICAO_REGEX = /^[A-Z]{4}$/;

const _createEventSchema = z.object({
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
  status: z.enum(['draft', 'published']),
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

type CreateEventData = z.infer<typeof _createEventSchema>;

export type CreateEventResult = {
  event: Event;
  aircraft: EventAircraft[];
  gates: EventGate[];
};

// Database mutations
async function createEventMutation(eventData: NewEvent): Promise<Event> {
  const result = await db.insert(events).values(eventData).returning();
  return result[0];
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

export async function createEventRecord(
  data: CreateEventData,
  userId: string,
  imageFile?: File
): Promise<CreateEventResult> {
  let imageUrl: string | undefined;

  if (imageFile) {
    const eventId = crypto.randomUUID();
    imageUrl = await uploadEventImage({ eventId, file: imageFile });
  }

  const event = await createEventMutation({
    id: crypto.randomUUID(),
    title: data.title,
    description: data.description,
    imageUrl: imageUrl || data.imageUrl,
    departureIcao: data.departureIcao,
    arrivalIcao: data.arrivalIcao,
    departureTime: data.departureTime,
    flightTime: data.flightTime,
    flightNumber: data.flightNumber,
    cargo: data.cargo ?? 0,
    fuel: data.fuel ?? 0,
    multiplierId: data.multiplierId,
    status: data.status,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const aircraftPromises = data.aircraftIds.map((aircraftId) =>
    addAircraftToEventMutation(event.id, aircraftId)
  );

  const departureGatePromises = (data.departureGates || []).map((gateNumber) =>
    addGateToEventMutation(event.id, gateNumber, 'departure')
  );

  const arrivalGatePromises = (data.arrivalGates || []).map((gateNumber) =>
    addGateToEventMutation(event.id, gateNumber, 'arrival')
  );

  const [aircraft, departureGates, arrivalGates] = await Promise.all([
    Promise.all(aircraftPromises),
    Promise.all(departureGatePromises),
    Promise.all(arrivalGatePromises),
  ]);

  return {
    event,
    aircraft: aircraft.filter((a): a is EventAircraft => a !== null),
    gates: [...departureGates, ...arrivalGates].filter(
      (g): g is EventGate => g !== null
    ),
  };
}

export async function createEvent(
  data: CreateEventData,
  userId: string,
  imageFile?: File
): Promise<CreateEventResult> {
  return createEventRecord(data, userId, imageFile);
}
