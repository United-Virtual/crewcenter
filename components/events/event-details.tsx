'use client';

import { format } from 'date-fns';
import { useState } from 'react';

import { JoinLeaveButton } from '@/components/events/join-leave-button';
import { LocalTime } from '@/components/ui/local-time';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  Aircraft,
  Airline,
  Event,
  EventAircraft,
  EventGate,
  EventParticipant,
} from '@/db/schema';
import { fileUrl } from '@/lib/urls';
import { formatFullCallsign, formatHoursMinutes } from '@/lib/utils';

interface ParticipantWithUser {
  participant: EventParticipant;
  user?: { name: string | null; callsign: number | null } | null;
}

interface EventDetailsProps {
  event: Event;
  participants: ParticipantWithUser[];
  aircraft: EventAircraft[];
  gates: EventGate[];
  aircraftDetails: Aircraft[];
  isParticipating: boolean;
  airline?: Airline;
}

const TABS = [
  { key: 'aircraft', label: 'Aircraft' },
  { key: 'gates', label: 'Gates' },
  { key: 'participants', label: 'Participants' },
];

export function EventDetails({
  event,
  participants,
  aircraft,
  gates,
  aircraftDetails,
  isParticipating,
  airline,
}: EventDetailsProps) {
  const [activeTab, setActiveTab] = useState('aircraft');

  const departureGates = gates.filter((g) => g.airportType === 'departure');
  const arrivalGates = gates.filter((g) => g.airportType === 'arrival');

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-md border border-input bg-panel">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="relative lg:col-span-2">
            {event.imageUrl ? (
              <img
                src={fileUrl(event.imageUrl)}
                alt={event.title}
                className="h-auto w-full object-contain"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-muted text-muted-foreground sm:h-64 lg:h-full">
                No image
              </div>
            )}
          </div>
          <div className="p-4 sm:p-6 lg:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{event.title}</h3>
                <JoinLeaveButton
                  eventId={event.id}
                  isParticipating={isParticipating}
                  eventGates={gates}
                />
              </div>

              <div className="space-y-3">
                {event.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-md border border-input bg-panel">
            <div className="border-b border-border px-4 py-3 sm:px-6">
              <h3 className="font-semibold">Operational Details</h3>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Route
                  </p>
                  <p className="text-lg font-semibold">
                    {event.departureIcao} → {event.arrivalIcao}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="text-lg font-semibold">
                    {format(event.departureTime, 'MMMM d')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Departure Time (Local)
                  </p>
                  <p className="text-lg font-semibold">
                    <LocalTime date={event.departureTime} />
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Est. Arrival (Local)
                  </p>
                  <p className="text-lg font-semibold">
                    <LocalTime
                      date={
                        new Date(
                          event.departureTime.getTime() +
                            event.flightTime * 60 * 1000
                        )
                      }
                    />
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Flight Number
                  </p>
                  <p className="text-lg font-semibold">{event.flightNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cargo
                  </p>
                  <p className="text-lg font-semibold">
                    {event.cargo === 0
                      ? 'Pilot Discretion'
                      : `${event.cargo.toLocaleString()} kg`}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Fuel
                  </p>
                  <p className="text-lg font-semibold">
                    {event.fuel === 0
                      ? 'Pilot Discretion'
                      : `${event.fuel.toLocaleString()} kg`}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Flight Time
                  </p>
                  <p className="text-lg font-semibold">
                    {formatHoursMinutes(event.flightTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-input bg-panel">
            <div className="border-b border-border">
              <nav className="flex" aria-label="Tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    data-tab={tab.key}
                    className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-primary text-primary bg-muted/30'
                        : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 sm:p-6">
              <div
                className={`${activeTab !== 'aircraft' ? 'hidden' : ''}`}
                role="tabpanel"
                aria-labelledby="tab-aircraft"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">Allowed Aircraft</h4>
                </div>
                {aircraft.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No aircraft assigned to this event.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {aircraft.map((eventAircraft) => {
                      const aircraftDetail = aircraftDetails.find(
                        (a) => a.id === eventAircraft.aircraftId
                      );
                      return (
                        <li
                          key={eventAircraft.id}
                          className="flex items-center justify-between rounded-md border border-border p-3"
                        >
                          <div>
                            <p className="font-medium">
                              {aircraftDetail?.name || 'Unknown Aircraft'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {aircraftDetail?.livery || 'No livery'}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div
                className={`${activeTab !== 'gates' ? 'hidden' : ''}`}
                role="tabpanel"
                aria-labelledby="tab-gates"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">Gates</h4>
                </div>

                <div className="mb-4 flex gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-border bg-card"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-primary bg-primary/10"></div>
                    <span>Assigned</span>
                  </div>
                </div>

                {departureGates.length > 0 && arrivalGates.length > 0 && (
                  <div className="mb-4 rounded-md border border-border bg-muted p-3 text-xs">
                    <p className="font-medium mb-1">Gate Assignment Info:</p>
                    <p>
                      When you join this event, you&apos;ll be automatically
                      assigned available gates. If all gates are taken, you can
                      still join and manually assign gates later when they
                      become available.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-border bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Departure Gates ({event.departureIcao})
                    </p>
                    {departureGates.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No departure gates assigned.
                      </p>
                    ) : (
                      <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        {departureGates.map((gate) => {
                          const assignedParticipant = participants.find(
                            (p) => p.participant.departureGateId === gate.id
                          );
                          const isAssigned = !!assignedParticipant;

                          return (
                            <li
                              key={gate.id}
                              className={`rounded-md border px-2 py-1 text-center ${
                                isAssigned
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-card text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{gate.gateNumber}</span>
                                {isAssigned && (
                                  <span className="text-xs">
                                    {assignedParticipant?.user?.name ||
                                      `User ${assignedParticipant?.participant.userId}`}
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-md border border-border bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Arrival Gates ({event.arrivalIcao})
                    </p>
                    {arrivalGates.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No arrival gates assigned.
                      </p>
                    ) : (
                      <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        {arrivalGates.map((gate) => {
                          const assignedParticipant = participants.find(
                            (p) => p.participant.arrivalGateId === gate.id
                          );
                          const isAssigned = !!assignedParticipant;

                          return (
                            <li
                              key={gate.id}
                              className={`rounded-md border px-2 py-1 text-center ${
                                isAssigned
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-card text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{gate.gateNumber}</span>
                                {isAssigned && (
                                  <span className="text-xs">
                                    {assignedParticipant?.user?.name ||
                                      `User ${assignedParticipant?.participant.userId}`}
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`${activeTab !== 'participants' ? 'hidden' : ''}`}
                role="tabpanel"
                aria-labelledby="tab-participants"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">Participants</h4>
                </div>

                {participants.length > 0 && (
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                    <div className="rounded-md bg-muted p-2">
                      <div className="font-medium text-muted-foreground">
                        Total Participants
                      </div>
                      <div className="text-lg font-semibold">
                        {participants.length}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <div className="font-medium text-muted-foreground">
                        With Departure Gate
                      </div>
                      <div className="text-lg font-semibold">
                        {
                          participants.filter(
                            (p) => p.participant.departureGateId
                          ).length
                        }
                      </div>
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <div className="font-medium text-muted-foreground">
                        With Arrival Gate
                      </div>
                      <div className="text-lg font-semibold">
                        {
                          participants.filter(
                            (p) => p.participant.arrivalGateId
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                )}

                {participants.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No participants yet.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-muted/50 font-semibold text-foreground">
                            User
                          </TableHead>
                          <TableHead className="bg-muted/50 font-semibold text-foreground">
                            Joined
                          </TableHead>
                          <TableHead className="bg-muted/50 font-semibold text-foreground text-center">
                            Dep Gate
                          </TableHead>
                          <TableHead className="bg-muted/50 font-semibold text-foreground text-center">
                            Arr Gate
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((p) => (
                          <TableRow
                            key={p.participant.id}
                            className="transition-colors hover:bg-muted/30"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {(
                                      p.user?.name ||
                                      p.participant.userId.toString()
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {p.user?.name ||
                                      `User ${p.participant.userId}`}
                                  </p>
                                  {p.user?.callsign && airline && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatFullCallsign(
                                        airline.callsign,
                                        p.user.callsign
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(p.participant.joinedAt, 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="text-center">
                              {p.participant.departureGateId ? (
                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                  {departureGates.find(
                                    (g) =>
                                      g.id === p.participant.departureGateId
                                  )?.gateNumber || 'N/A'}
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border"
                                  style={{
                                    backgroundColor: 'var(--destructive)',
                                    color: 'var(--destructive-foreground)',
                                    borderColor: 'var(--destructive)',
                                  }}
                                >
                                  No Gate
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {p.participant.arrivalGateId ? (
                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                  {arrivalGates.find(
                                    (g) => g.id === p.participant.arrivalGateId
                                  )?.gateNumber || 'N/A'}
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border"
                                  style={{
                                    backgroundColor: 'var(--destructive)',
                                    color: 'var(--destructive-foreground)',
                                    borderColor: 'var(--destructive)',
                                  }}
                                >
                                  No Gate
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
