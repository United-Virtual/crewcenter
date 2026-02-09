import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import { findUserByDiscord } from '@/bot/utils/user-lookup';
import {
  getCareerMinutesForUser,
  getFreeFlyMinutesForUser,
  getRankProgression,
  getTotalFlightsNumber,
  getUserLastFlights,
} from '@/db/queries';
import { getAirline } from '@/db/queries/airline';
import { logger } from '@/lib/logger';
import { formatFullCallsign, formatHoursMinutes } from '@/lib/utils';
import { createDiscordEmbed } from '@/lib/webhooks';

function createProgressBar(
  current: number,
  target: number,
  length: number = 10
): string {
  if (target <= 0) {
    return '█'.repeat(length);
  }

  const progress = Math.min(current / target, 1);
  const filledBlocks = Math.round(progress * length);
  const emptyBlocks = length - filledBlocks;

  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'approved':
      return '✅';
    case 'pending':
      return '⏳';
    case 'denied':
      return '❌';
    default:
      return '❓';
  }
}

export async function handleButton(interaction: ButtonInteraction) {
  try {
    const customId = interaction.customId;
    const buttonType = customId.split(':')[0].replace('stats_', '');
    const targetUserId = customId.includes(':') ? customId.split(':')[1] : null;

    // Always lock interactions to the original user who created the message
    const lockedDiscordUserId: string =
      targetUserId ??
      interaction.message.interaction?.user.id ??
      interaction.user.id;

    const targetDiscordUser =
      await interaction.client.users.fetch(lockedDiscordUserId);
    const user = await findUserByDiscord(targetDiscordUser);

    if (!user) {
      await interaction.reply({
        content: `❌ No pilot account found for the target user.`,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const airlineData = await getAirline();
    const airlineName = airlineData?.name;

    if (buttonType === 'general') {
      const [careerMinutes, freeFlyMinutes] = await Promise.all([
        getCareerMinutesForUser(user.id),
        getFreeFlyMinutesForUser(user.id),
      ]);
      const totalFlightsData = await getTotalFlightsNumber(user.id);
      const totalFlights = totalFlightsData.totalFlights;
      const rankProgression = await getRankProgression(careerMinutes);
      const airlineCallsign = airlineData?.callsign;
      const fullCallsign = formatFullCallsign(airlineCallsign!, user.callsign!);

      const lines = [
        `👨‍✈️ **Pilot:** ${user.name} (\`${fullCallsign}\`)`,
        `⏱️ **Career Time:** ${formatHoursMinutes(careerMinutes)}`,
        `🛫 **Free Fly Time:** ${formatHoursMinutes(freeFlyMinutes)}`,
        `📋 **Total PIREPs:** ${totalFlights}`,
        `🎖️ **Current Rank:** ${rankProgression.currentRank?.name ?? 'N/A'}`,
      ];

      if (rankProgression.nextRank) {
        const hoursToNext = rankProgression.hoursToNextRank!;
        const hoursToNextFormatted = formatHoursMinutes(
          Math.round(hoursToNext * 60)
        );
        const currentHours = careerMinutes / 60;
        const targetHours = rankProgression.nextRank.minimumFlightTime;
        const progressBar = createProgressBar(currentHours, targetHours);

        lines.push(
          `🎯 **Next Rank:** ${rankProgression.nextRank.name}`,
          `📊 **Progress:** ${progressBar} (${hoursToNextFormatted} more needed)`
        );
      } else {
        lines.push(`🏆 **Status:** Maximum rank achieved!`);
      }

      const embed = createDiscordEmbed({
        title: '✈️ Pilot Information',
        description: lines.join('\n\n'),
        color: 0x3498db,
        footer: { text: airlineName! },
        timestamp: new Date().toISOString(),
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`stats_general:${lockedDiscordUserId}`)
          .setLabel('General Stats')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📊'),
        new ButtonBuilder()
          .setCustomId(`stats_logbook:${lockedDiscordUserId}`)
          .setLabel('Recent Flights')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✈️')
      );

      await interaction.update({ embeds: [embed], components: [row] });
    } else if (buttonType === 'logbook') {
      const recentFlights = await getUserLastFlights(user.id);
      const airlineCallsign = airlineData?.callsign;
      const fullCallsign = formatFullCallsign(airlineCallsign!, user.callsign!);

      if (recentFlights.length === 0) {
        const embed = createDiscordEmbed({
          title: '✈️ Recent Flights',
          description: `**${user.name}** (\`${fullCallsign}\`)\n\nNo flights found in logbook.`,
          color: 0x95a5a6,
          footer: { text: airlineName! },
          timestamp: new Date().toISOString(),
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`stats_general:${lockedDiscordUserId}`)
            .setLabel('General Stats')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊'),
          new ButtonBuilder()
            .setCustomId(`stats_logbook:${lockedDiscordUserId}`)
            .setLabel('Recent Flights')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✈️')
        );

        await interaction.update({ embeds: [embed], components: [row] });
        return;
      }

      const flightLines = recentFlights.map((flight, index) => {
        const statusEmoji = getStatusEmoji(flight.status);
        const flightTime = formatHoursMinutes(flight.flightTime);
        const date = new Date(Number(flight.date)).toISOString().split('T')[0];

        return `${index + 1}. ${statusEmoji} **${flight.flightNumber}** - ${flight.departureIcao}→${flight.arrivalIcao} (${flightTime}) - ${date}`;
      });

      const embed = createDiscordEmbed({
        title: '✈️ Recent Flights',
        description: `${flightLines.join('\n')}\n\n`,
        color: 0x3498db,
        footer: { text: airlineName! },
        timestamp: new Date().toISOString(),
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`stats_general:${lockedDiscordUserId}`)
          .setLabel('General Stats')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📊'),
        new ButtonBuilder()
          .setCustomId(`stats_logbook:${lockedDiscordUserId}`)
          .setLabel('Recent Flights')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✈️')
      );

      await interaction.update({ embeds: [embed], components: [row] });
    }
  } catch {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Failed to fetch logbook data.',
          flags: [MessageFlags.Ephemeral],
        });
      } else {
        await interaction.reply({
          content: '❌ Failed to fetch logbook data.',
          flags: [MessageFlags.Ephemeral],
        });
      }
    } catch (followUpError) {
      logger.error({ error: followUpError }, 'Failed to send error response');
    }
  }
}

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Display pilot information')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('User to get information for (optional)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const targetUser = interaction.options.getUser('user');
    let user;

    if (targetUser) {
      user = await findUserByDiscord(targetUser);
      if (!user) {
        await interaction.reply({
          content: `❌ No pilot account found for Discord user: ${targetUser.username}. Please make sure they have linked their Discord account in their profile settings.`,
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }
    } else {
      user = await findUserByDiscord(interaction.user);
      if (!user) {
        await interaction.reply({
          content: `❌ No pilot account found for Discord user: ${interaction.user.username}. Please link your Discord account in your profile settings.`,
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }
    }

    const airlineData = await getAirline();
    const airlineCallsign = airlineData?.callsign;
    const airlineName = airlineData?.name;

    const [careerMinutes, freeFlyMinutes] = await Promise.all([
      getCareerMinutesForUser(user.id),
      getFreeFlyMinutesForUser(user.id),
    ]);
    const totalFlightsData = await getTotalFlightsNumber(user.id);
    const totalFlights = totalFlightsData.totalFlights;
    const rankProgression = await getRankProgression(careerMinutes);
    const fullCallsign = formatFullCallsign(airlineCallsign!, user.callsign!);

    const lines = [
      `👨‍✈️ **Pilot:** ${user.name} (\`${fullCallsign}\`)`,
      `⏱️ **Career Time:** ${formatHoursMinutes(careerMinutes)}`,
      `🛫 **Free Fly Time:** ${formatHoursMinutes(freeFlyMinutes)}`,
      `📋 **Total PIREPs:** ${totalFlights}`,
      `🎖️ **Current Rank:** ${rankProgression.currentRank?.name ?? 'N/A'}`,
    ];

    if (rankProgression.nextRank) {
      const hoursToNext = rankProgression.hoursToNextRank!;
      const hoursToNextFormatted = formatHoursMinutes(
        Math.round(hoursToNext * 60)
      );
      const currentHours = careerMinutes / 60;
      const targetHours = rankProgression.nextRank.minimumFlightTime;
      const progressBar = createProgressBar(currentHours, targetHours);

      lines.push(
        `🎯 **Next Rank:** ${rankProgression.nextRank.name}`,
        `📊 **Progress:** ${progressBar} (${hoursToNextFormatted} more needed)`
      );
    } else {
      lines.push(`🏆 **Status:** Maximum rank achieved!`);
    }

    const embed = createDiscordEmbed({
      title: '✈️ Pilot Information',
      description: lines.join('\n\n'),
      color: 0x3498db,
      footer: { text: airlineName! },
      timestamp: new Date().toISOString(),
    });

    // Always lock the buttons to the displayed/creating user's Discord ID
    const targetUserId = (targetUser ?? interaction.user).id;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_general:${targetUserId}`)
        .setLabel('General Stats')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId(`stats_logbook:${targetUserId}`)
        .setLabel('Recent Flights')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✈️')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  } catch {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Failed to fetch user information.',
          flags: [MessageFlags.Ephemeral],
        });
      } else {
        await interaction.reply({
          content: '❌ Failed to fetch user information.',
          flags: [MessageFlags.Ephemeral],
        });
      }
    } catch (followUpError) {
      logger.error({ error: followUpError }, 'Failed to send error response');
    }
  }
}
