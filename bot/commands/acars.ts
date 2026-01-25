import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

import { findUserByDiscord } from '@/bot/utils/user-lookup';
import { db } from '@/db';
import {
  getAllowedAircraftForRank,
  getAllowedAircraftForUser,
} from '@/db/queries/aircraft';
import { getAirline } from '@/db/queries/airline';
import { getMultipliers } from '@/db/queries/multipliers';
import { getUserRank } from '@/db/queries/ranks';
import { getFlightTimeForUser } from '@/db/queries/users';
import { aircraft, airline } from '@/db/schema';
import {
  createPirep,
  sendPirepWebhookNotification,
} from '@/domains/pireps/create-pirep';
import { MAX_CARGO_KG, MAX_FUEL_KG } from '@/lib/constants';
import { decrypt } from '@/lib/encryption';
import { getIFLiveries } from '@/lib/if-api';
import { formatHoursMinutes } from '@/lib/utils';
import type {
  AircraftLivery,
  IFUserFlightsResponse,
  PirepCreationData,
  UserFlight,
} from '@/types/acars';

export async function getAcarsCommandData() {
  return new SlashCommandBuilder()
    .setName('acars')
    .setDescription('Create a PIREP from your recent Infinite Flight flights');
}

async function fetchInfiniteFlightFlights(userId: string, apiKey: string) {
  const API_URL = `https://api.infiniteflight.com/public/v2/users/${userId}/flights?apikey=${apiKey}&page=1`;
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Infinite Flight data (${response.status})`
    );
  }

  const data: IFUserFlightsResponse = await response.json();

  if (data.errorCode !== 0) {
    throw new Error(`Infinite Flight API returned error: ${data.errorCode}`);
  }

  return data.result.data;
}

async function fetchAircraftLiveries() {
  const liveriesData = await getIFLiveries();

  const aircraftMap = new Map();
  const liveryMap = new Map();

  for (const aircraftItem of liveriesData.aircraft) {
    aircraftMap.set(aircraftItem.aircraftID, aircraftItem);
    for (const livery of aircraftItem.liveries) {
      liveryMap.set(livery.id, {
        name: livery.name,
        aircraftId: aircraftItem.aircraftID,
      });
    }
  }

  return { aircraftMap, liveryMap };
}

async function validateAircraftAccess(
  userId: string,
  aircraftName: string,
  liveryName: string
): Promise<{ canFly: boolean; reason?: string }> {
  const existingAircraft = await db
    .select()
    .from(aircraft)
    .where(
      and(eq(aircraft.name, aircraftName), eq(aircraft.livery, liveryName))
    )
    .get();

  if (!existingAircraft) {
    return {
      canFly: false,
      reason: `Aircraft ${aircraftName} (${liveryName}) is not available in our fleet.`,
    };
  }

  const [airlineSettings, currentFlightTime] = await Promise.all([
    getAirline(),
    getFlightTimeForUser(userId),
  ]);
  const enforceTypeRatings = airlineSettings?.enforceTypeRatings ?? false;

  const rank = await getUserRank(currentFlightTime);
  if (!enforceTypeRatings && !rank) {
    return {
      canFly: false,
      reason: 'Unable to determine your rank. Please contact an administrator.',
    };
  }

  const allowedAircraft = enforceTypeRatings
    ? await getAllowedAircraftForUser(userId, currentFlightTime)
    : await getAllowedAircraftForRank(rank!.id);

  if (enforceTypeRatings && allowedAircraft.length === 0) {
    return {
      canFly: false,
      reason: 'No aircrafts found.',
    };
  }

  const isAircraftAllowed = allowedAircraft.some(
    (ac) => ac.id === existingAircraft.id
  );

  if (!isAircraftAllowed) {
    return {
      canFly: false,
      reason: enforceTypeRatings
        ? `Your assigned type ratings do not allow ${aircraftName} (${liveryName}).`
        : `Your rank (${rank?.name ?? 'Unknown'}) does not have access to ${aircraftName} (${liveryName}).`,
    };
  }

  return { canFly: true };
}

function validateFlightTime(flightTime: number): {
  isValid: boolean;
  reason?: string;
} {
  const minFlightTime = 1;
  const maxFlightTime = 24 * 60;

  if (flightTime < minFlightTime) {
    return {
      isValid: false,
      reason: `Flight time (${formatHoursMinutes(flightTime)}) is too short. Minimum is ${formatHoursMinutes(minFlightTime)}.`,
    };
  }

  if (flightTime > maxFlightTime) {
    return {
      isValid: false,
      reason: `Flight time (${formatHoursMinutes(flightTime)}) is too long. Maximum is ${formatHoursMinutes(maxFlightTime)}.`,
    };
  }

  return { isValid: true };
}

function createFlightEmbed(
  flights: UserFlight[],
  aircraftMap: Map<string, AircraftLivery>,
  liveryMap: Map<string, { name: string; aircraftId: string }>
) {
  const fields = flights.map((flight, index) => {
    const flightDate = new Date(flight.created);
    const formattedDate = flightDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const route =
      flight.originAirport && flight.destinationAirport
        ? `${flight.originAirport} → ${flight.destinationAirport}`
        : 'Unknown route';

    const aircraftInfo = aircraftMap.get(flight.aircraftId);
    const liveryInfo = liveryMap.get(flight.liveryId);
    const aircraftDisplay = aircraftInfo
      ? `${aircraftInfo.name} (${liveryInfo?.name || 'Default'})`
      : 'Unknown Aircraft';

    return {
      name: `Flight ${index + 1}`,
      value: `**Route:** ${route}\n**Date:** ${formattedDate}\n**Flight Time:** ${formatHoursMinutes(Math.round(flight.totalTime))}\n**Aircraft:** ${aircraftDisplay}`,
      inline: false,
    };
  });

  return {
    color: 0x0099ff,
    title: '✈️ Select a Flight to File PIREP',
    description:
      'Please select which flight you would like to file a PIREP for:',
    fields,
    footer: {
      text: 'Press the button to select a flight',
    },
  };
}

function createFlightButtons(flightCount: number) {
  const buttons = Array.from({ length: flightCount }, (_, index) =>
    new ButtonBuilder()
      .setCustomId(`acars_flight_${index}`)
      .setLabel(`Flight ${index + 1}`)
      .setStyle(ButtonStyle.Primary)
  );

  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

function createMultiplierEmbed(
  multipliers: Array<{ id: string; name: string; value: number }>,
  flightIndex: number
) {
  const multiplierLines = multipliers.map(
    (multiplier, index) =>
      `${index + 1}. **${multiplier.name}** (x${multiplier.value})`
  );

  return {
    color: 0x0099ff,
    title: '🎯 Select Multiplier',
    description: `Choose a multiplier for your PIREP:\n\n${multiplierLines.join('\n')}\n\nOr select **None** for no multiplier.`,
    footer: {
      text: `Flight ${flightIndex + 1} selected`,
    },
  };
}

function createMultiplierButtons(
  multipliers: Array<{ id: string; name: string; value: number }>,
  flightIndex: number
) {
  const buttons = multipliers.map((multiplier) =>
    new ButtonBuilder()
      .setCustomId(`acars_multiplier_${flightIndex}_${multiplier.id}`)
      .setLabel(`${multiplier.name} (x${multiplier.value})`)
      .setStyle(ButtonStyle.Primary)
  );

  const noneButton = new ButtonBuilder()
    .setCustomId(`acars_multiplier_${flightIndex}_none`)
    .setLabel('None')
    .setStyle(ButtonStyle.Secondary);

  buttons.push(noneButton);

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      buttons.slice(i, i + 5)
    );
    rows.push(row);
  }

  return rows;
}

function createPirepModal(flightIndex: number, multiplierId: string) {
  const modal = new ModalBuilder()
    .setCustomId(`acars_modal_${flightIndex}_${multiplierId}`)
    .setTitle('ACARS PIREP Details');

  const flightNumberInput = new TextInputBuilder()
    .setCustomId('flightNumber')
    .setLabel('Flight Number')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter flight number')
    .setRequired(true);

  const cargoInput = new TextInputBuilder()
    .setCustomId('cargo')
    .setLabel('Cargo Weight (kg)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter cargo weight in kg')
    .setRequired(true);

  const fuelInput = new TextInputBuilder()
    .setCustomId('fuel')
    .setLabel('Fuel Burned (kg)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter fuel burned in kg')
    .setRequired(true);

  const commentsInput = new TextInputBuilder()
    .setCustomId('comments')
    .setLabel('Comments (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter any additional comments...')
    .setRequired(false);

  const rows = [
    new ActionRowBuilder<TextInputBuilder>().addComponents(flightNumberInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(cargoInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(fuelInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(commentsInput),
  ];

  modal.addComponents(...rows);
  return modal;
}

function validatePirepData(
  flightNumber: string,
  cargo: number,
  fuel: number,
  comments?: string
) {
  if (!flightNumber?.trim()) {
    throw new Error('Flight number is required');
  }

  if (flightNumber.length > 10) {
    throw new Error('Flight number must be less than 10 characters');
  }

  if (isNaN(cargo) || cargo < 0 || cargo > MAX_CARGO_KG) {
    throw new Error(
      `Cargo must be between 0 and ${MAX_CARGO_KG.toLocaleString()} kg`
    );
  }

  if (isNaN(fuel) || fuel < 0 || fuel > MAX_FUEL_KG) {
    throw new Error(
      `Fuel used must be between 0 and ${MAX_FUEL_KG.toLocaleString()} kg`
    );
  }

  if (comments && comments.length > 200) {
    throw new Error('Comments must be at most 200 characters');
  }
}

async function findAircraft(aircraftName: string, liveryName: string) {
  const existingAircraft = await db
    .select()
    .from(aircraft)
    .where(
      and(eq(aircraft.name, aircraftName), eq(aircraft.livery, liveryName))
    )
    .get();

  return existingAircraft?.id || null;
}

function createSuccessEmbed(
  pirepData: PirepCreationData & { aircraftName: string; liveryName: string },
  multiplier: { id: string; name: string; value: number } | null,
  adjustedFlightTime: number
) {
  const lines = [
    `📋 **Flight:** ${pirepData.flightNumber}`,
    `🛫 **Route:** ${pirepData.departureIcao} → ${pirepData.arrivalIcao}`,
    `✈️ **Aircraft:** ${pirepData.aircraftName} (${pirepData.liveryName})`,
    `⏱️ **Flight Time:** ${formatHoursMinutes(adjustedFlightTime)}`,
  ];

  if (multiplier) {
    lines.push(`🎯 **Multiplier:** ${multiplier.name} (x${multiplier.value})`);
  }

  lines.push(
    `📦 **Cargo:** ${pirepData.cargo.toLocaleString()} kg`,
    `⛽ **Fuel:** ${pirepData.fuelBurned.toLocaleString()} kg`
  );

  return {
    color: 0x00ff00,
    title: '✅ ACARS PIREP Created Successfully',
    description: lines.join('\n\n'),
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Created from Infinite Flight flight',
    },
  };
}

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const user = await findUserByDiscord(interaction.user);

    if (!user) {
      await interaction.reply({
        content: `❌ No pilot account found for Discord user: ${interaction.user.username}. Please link your Discord account in your profile settings.`,
        flags: 64,
      });
      return;
    }

    if (!user.infiniteFlightId) {
      await interaction.reply({
        content:
          '❌ No Infinite Flight ID found in your profile. Please add your IFC Name in your profile settings.',
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    const airlineData = await db.select().from(airline).get();

    if (!airlineData?.infiniteFlightApiKey) {
      await interaction.editReply(
        '❌ Infinite Flight API key not configured. Please contact an administrator.'
      );
      return;
    }

    const apiKey = decrypt(airlineData.infiniteFlightApiKey);
    const flights = await fetchInfiniteFlightFlights(
      user.infiniteFlightId!,
      apiKey
    );

    if (flights.length === 0) {
      await interaction.editReply(
        '❌ No recent flights found. Please complete some flights in Infinite Flight first.'
      );
      return;
    }

    const recentFlights = flights.slice(0, 3);
    const { aircraftMap, liveryMap } = await fetchAircraftLiveries();

    const flightSelectionEmbed = createFlightEmbed(
      recentFlights,
      aircraftMap,
      liveryMap
    );
    const row = createFlightButtons(recentFlights.length);

    await interaction.editReply({
      embeds: [flightSelectionEmbed],
      components: [row],
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create ACARS PIREP';
    await interaction.editReply(`❌ ${errorMessage}`);
  }
}

export async function handleButton(interaction: ButtonInteraction) {
  try {
    const customId = interaction.customId;

    if (!customId.startsWith('acars_')) {
      return;
    }

    if (customId.startsWith('acars_flight_')) {
      await interaction.deferReply({ flags: 64 });

      const flightIndex = parseInt(customId.replace('acars_flight_', ''));

      // Get user and validate aircraft access before showing multipliers
      const user = await findUserByDiscord(interaction.user);
      if (!user) {
        await interaction.editReply('❌ User not found in database');
        return;
      }

      const airlineData = await db.select().from(airline).get();
      if (!airlineData?.infiniteFlightApiKey) {
        await interaction.editReply(
          '❌ Infinite Flight API key not configured'
        );
        return;
      }

      const apiKey = decrypt(airlineData.infiniteFlightApiKey);
      const flights = await fetchInfiniteFlightFlights(
        user.infiniteFlightId!,
        apiKey
      );

      if (flights.length === 0 || flightIndex >= flights.length) {
        await interaction.editReply('❌ Flight not found');
        return;
      }

      const selectedFlight = flights[flightIndex];
      const { aircraftMap, liveryMap } = await fetchAircraftLiveries();

      const aircraftInfo = aircraftMap.get(selectedFlight.aircraftId);
      const liveryInfo = liveryMap.get(selectedFlight.liveryId);

      if (!aircraftInfo) {
        await interaction.editReply(
          '❌ Aircraft not found in Infinite Flight database'
        );
        return;
      }

      const aircraftName = aircraftInfo.name;
      const liveryName = liveryInfo?.name || 'Default';

      // Validate flight time
      const flightTimeValidation = validateFlightTime(selectedFlight.totalTime);
      if (!flightTimeValidation.isValid) {
        await interaction.editReply(`❌ ${flightTimeValidation.reason}`);
        return;
      }

      // Validate aircraft access based on rank
      const aircraftAccess = await validateAircraftAccess(
        user.id,
        aircraftName,
        liveryName
      );
      if (!aircraftAccess.canFly) {
        await interaction.editReply(`❌ ${aircraftAccess.reason}`);
        return;
      }

      // Check if aircraft exists in our fleet
      const aircraftId = await findAircraft(aircraftName, liveryName);
      if (!aircraftId) {
        await interaction.editReply(
          `❌ Aircraft ${aircraftName} (${liveryName}) is not available in our fleet.`
        );
        return;
      }

      const multipliersList = await getMultipliers();

      const multiplierEmbed = createMultiplierEmbed(
        multipliersList,
        flightIndex
      );
      const rows = createMultiplierButtons(multipliersList, flightIndex);

      await interaction.editReply({
        embeds: [multiplierEmbed],
        components: rows,
      });
    } else if (customId.startsWith('acars_multiplier_')) {
      const parts = customId.split('_');
      const flightIndex = parseInt(parts[2]);
      const multiplierId = parts[3];

      const modal = createPirepModal(flightIndex, multiplierId);
      await interaction.showModal(modal);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to show modal';
    await interaction.reply({ content: `❌ ${errorMessage}`, flags: 64 });
  }
}

export async function handleModal(interaction: ModalSubmitInteraction) {
  try {
    const customId = interaction.customId;

    if (!customId.startsWith('acars_modal_')) {
      return;
    }

    const parts = customId.split('_');
    const flightIndex = parseInt(parts[2]);
    const selectedMultiplierId = parts[3];

    const flightNumber = interaction.fields.getTextInputValue('flightNumber');
    const cargoInput = interaction.fields.getTextInputValue('cargo');
    const fuelInput = interaction.fields.getTextInputValue('fuel');
    const comments =
      interaction.fields.getTextInputValue('comments') || undefined;

    const cargo = parseInt(cargoInput);
    const fuel = parseInt(fuelInput);

    validatePirepData(flightNumber, cargo, fuel, comments);

    await interaction.reply({
      content: `✅ Processing PIREP for Flight ${flightIndex + 1}...`,
      flags: 64,
    });

    const user = await findUserByDiscord(interaction.user);
    if (!user) {
      await interaction.editReply('❌ User not found in database');
      return;
    }

    const airlineData = await db.select().from(airline).get();
    if (!airlineData?.infiniteFlightApiKey) {
      await interaction.editReply('❌ Infinite Flight API key not configured');
      return;
    }

    const apiKey = decrypt(airlineData.infiniteFlightApiKey);
    const flights = await fetchInfiniteFlightFlights(
      user.infiniteFlightId!,
      apiKey
    );

    if (flights.length === 0 || flightIndex >= flights.length) {
      await interaction.editReply('❌ Flight not found');
      return;
    }

    const selectedFlight = flights[flightIndex];
    const { aircraftMap, liveryMap } = await fetchAircraftLiveries();

    const aircraftInfo = aircraftMap.get(selectedFlight.aircraftId);
    const liveryInfo = liveryMap.get(selectedFlight.liveryId);

    if (!aircraftInfo) {
      await interaction.editReply(
        '❌ Aircraft not found in Infinite Flight database'
      );
      return;
    }

    const aircraftName = aircraftInfo.name;
    const liveryName = liveryInfo?.name || 'Default';

    const aircraftId = await findAircraft(aircraftName, liveryName);

    if (!aircraftId) {
      await interaction.editReply(
        `❌ Aircraft ${aircraftName} (${liveryName}) is not available in our fleet.`
      );
      return;
    }

    const pirepData = {
      flightNumber,
      date: new Date(selectedFlight.created),
      departureIcao: selectedFlight.originAirport || 'UNKN',
      arrivalIcao: selectedFlight.destinationAirport || 'UNKN',
      flightTime: Math.round(selectedFlight.totalTime),
      cargo,
      fuelBurned: fuel,
      aircraftId,
      multiplierId:
        selectedMultiplierId === 'none' ? undefined : selectedMultiplierId,
      comments,
    };

    const { adjustedFlightTime, newPirep } = await createPirep(
      pirepData,
      user.id
    );

    await sendPirepWebhookNotification(
      pirepData,
      newPirep.id,
      adjustedFlightTime,
      user.id
    );

    const multipliersList = await getMultipliers();
    const multiplier =
      selectedMultiplierId && selectedMultiplierId !== 'none'
        ? multipliersList.find((m) => m.id === selectedMultiplierId) || null
        : null;

    const successEmbed = createSuccessEmbed(
      { ...pirepData, aircraftName, liveryName },
      multiplier,
      adjustedFlightTime
    );

    await interaction.editReply({
      content:
        '✅ PIREP created successfully from your Infinite Flight flight!',
      embeds: [successEmbed],
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to process modal';
    await interaction.reply({ content: `❌ ${errorMessage}`, flags: 64 });
  }
}
