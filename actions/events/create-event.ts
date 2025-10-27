'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createEvent } from '@/domains/events/create-event';
import { MAX_CARGO_KG, MAX_FUEL_KG } from '@/lib/constants';
import { extractDbErrorMessage } from '@/lib/db-error';
import { authActionClient } from '@/lib/safe-action';

const createEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Event title is required')
    .max(100, 'Event title must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  imageUrl: z.string().optional(),
  imageFile: z.instanceof(File).optional(),
  departureIcao: z
    .string()
    .length(4, 'Departure ICAO must be exactly 4 characters')
    .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
  arrivalIcao: z
    .string()
    .length(4, 'Arrival ICAO must be exactly 4 characters')
    .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
  departureTime: z.date(),
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

export const createEventAction = authActionClient
  .inputSchema(createEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { imageFile, ...data } = parsedInput;
      const result = await createEvent(data, ctx.userId, imageFile);

      revalidatePath('/events');
      revalidatePath('/admin/events');

      return {
        success: true,
        message: 'Event created successfully',
        event: result.event,
      };
    } catch (error) {
      const errorMessage = extractDbErrorMessage(error, {
        unique: {
          title: 'An event with this title already exists',
          flight_number: 'An event with this flight number already exists',
        },
        fallback: 'Failed to create event',
      });

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  });
