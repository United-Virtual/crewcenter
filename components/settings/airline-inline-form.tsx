'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateAirlineAction } from '@/actions/airline/update-airline';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Airline } from '@/db/schema';
import { extractErrorMessage } from '@/lib/error-handler';

const schema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Name is required').max(100),
    callsign: z.string().min(1, 'Callsign is required').max(20),
    theme: z
      .string()
      .trim()
      .refine(
        (v) =>
          v === 'default' ||
          /^[a-z0-9-]+$/i.test(v) ||
          /^https?:\/\//i.test(v) ||
          /^\/.+\.css$/i.test(v),
        'Use a preset slug (e.g., aviation-blue), "default", an absolute URL, or a CSS path beginning with /'
      ),
    callsignMinRange: z
      .number()
      .min(1, 'Minimum range must be at least 1')
      .max(999999),
    callsignMaxRange: z
      .number()
      .min(1, 'Maximum range must be at least 1')
      .max(999999),
    inactivityPeriod: z
      .number()
      .min(1, 'Inactivity period must be at least 1 day')
      .max(365, 'Inactivity period must be less than 365 days'),
    enforceTypeRatings: z.boolean(),
    liveFilterSuffix: z.string().optional(),
    liveFilterVirtualOrg: z.string().optional(),
    liveFilterType: z.enum(['suffix', 'virtual_org']).optional(),
  })
  .refine(
    (data) => {
      const min = data.callsignMinRange;
      const max = data.callsignMaxRange;
      if (
        typeof min !== 'number' ||
        typeof max !== 'number' ||
        Number.isNaN(min) ||
        Number.isNaN(max)
      ) {
        return true;
      }
      return min <= max;
    },
    {
      message: 'Minimum range must be less than or equal to maximum range',
      path: ['callsignMinRange'],
    }
  );

type FormValues = z.infer<typeof schema>;

interface AirlineInlineFormProps {
  airline: Airline;
}

export function AirlineInlineForm({ airline }: AirlineInlineFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: airline.id,
      name: airline.name,
      callsign: airline.callsign,
      theme: (airline.theme as FormValues['theme']) || 'default',
      callsignMinRange: airline.callsignMinRange || 1,
      callsignMaxRange: airline.callsignMaxRange || 999,
      inactivityPeriod: airline.inactivityPeriod || 30,
      enforceTypeRatings: airline.enforceTypeRatings ?? false,
      liveFilterSuffix: airline.liveFilterSuffix || '',
      liveFilterVirtualOrg: airline.liveFilterVirtualOrg || '',
      liveFilterType:
        (airline.liveFilterType as 'suffix' | 'virtual_org') || 'virtual_org',
    },
  });

  const { execute, isExecuting, result, status } =
    useAction(updateAirlineAction);

  const submittedRef = useRef(false);
  const lastResultRef = useRef<object | null>(null);

  useEffect(() => {
    if (result === lastResultRef.current) {
      return;
    }
    lastResultRef.current = result as object | null;
    if (!submittedRef.current) {
      return;
    }

    const res = result as
      | { data?: unknown; serverError?: unknown; validationErrors?: unknown }
      | undefined;

    if (
      res &&
      typeof res === 'object' &&
      'data' in res &&
      res.data !== undefined
    ) {
      toast.success('Airline updated');
      submittedRef.current = false;
      return;
    }

    if (
      status === 'hasErrored' ||
      (res &&
        typeof res === 'object' &&
        (('serverError' in res && res.serverError !== undefined) ||
          ('validationErrors' in res && res.validationErrors !== undefined)))
    ) {
      const msg = extractErrorMessage(res, 'Update failed');
      toast.error(msg);
      submittedRef.current = false;
    }
  }, [result, status]);

  const onSubmit = (values: FormValues) => {
    submittedRef.current = true;
    execute({
      ...values,
      pirepsWebhookUrl: airline.pirepsWebhookUrl || '',
      newApplicationsWebhookUrl: airline.newApplicationsWebhookUrl || '',
      rankUpWebhookUrl: airline.rankUpWebhookUrl || '',
      leaveRequestWebhookUrl: airline.leaveRequestWebhookUrl || '',
      inactivityWebhookUrl: airline.inactivityWebhookUrl || '',
      liveFilterSuffix: values.liveFilterSuffix || '',
      liveFilterVirtualOrg: values.liveFilterVirtualOrg || '',
      liveFilterType: values.liveFilterType || 'virtual_org',
      enforceTypeRatings: values.enforceTypeRatings,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Airline Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter airline name"
                    className="h-11"
                    disabled={isExecuting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="callsign"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Callsign</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter callsign"
                    className="h-11"
                    disabled={isExecuting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <FormLabel className="text-base font-medium">
              Pilot Callsign Range
            </FormLabel>
            <p className="text-sm text-muted-foreground">
              Configure the numeric range available for pilot callsigns (e.g.,
              1-999). Staff members with any role aren’t restricted by this
              range.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="callsignMinRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Range</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1"
                      min="1"
                      max="999999"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-11"
                      disabled={isExecuting}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={
                        field.value === undefined ||
                        field.value === null ||
                        Number.isNaN(field.value as number)
                          ? ''
                          : (field.value as number)
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          field.onChange(Number.NaN);
                          return;
                        }
                        const num = Number(val);
                        if (Number.isNaN(num)) {
                          field.onChange(Number.NaN);
                        } else {
                          field.onChange(num);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="callsignMaxRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Range</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="999"
                      min="1"
                      max="999999"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-11"
                      disabled={isExecuting}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={
                        field.value === undefined ||
                        field.value === null ||
                        Number.isNaN(field.value as number)
                          ? ''
                          : (field.value as number)
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          field.onChange(Number.NaN);
                          return;
                        }
                        const num = Number(val);
                        if (Number.isNaN(num)) {
                          field.onChange(Number.NaN);
                        } else {
                          field.onChange(num);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="inactivityPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inactivity Period (days)</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Number of days a pilot can go without flying before being
                  considered inactive
                </p>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    min="1"
                    max="365"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-11"
                    disabled={isExecuting}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={
                      field.value === undefined ||
                      field.value === null ||
                      Number.isNaN(field.value as number)
                        ? ''
                        : (field.value as number)
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        field.onChange(Number.NaN);
                        return;
                      }
                      const num = Number(val);
                      if (Number.isNaN(num)) {
                        field.onChange(Number.NaN);
                      } else {
                        field.onChange(num);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <FormLabel className="text-base font-medium">
              PIREP Settings
            </FormLabel>
            <p className="text-sm text-muted-foreground">
              Configure how type ratings affect PIREP submissions.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="enforce-type-ratings"
              checked={form.watch('enforceTypeRatings')}
              onCheckedChange={(checked) =>
                form.setValue('enforceTypeRatings', checked as boolean)
              }
              disabled={isExecuting}
            />
            <label
              htmlFor="enforce-type-ratings"
              className="text-sm leading-tight"
            >
              Enforce type ratings for PIREPs
              <span className="mt-1 block text-xs text-muted-foreground">
                When enabled, pilots must hold a type rating to file a PIREP for
                that aircraft.
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <FormLabel className="text-base font-medium">
              Live Flight Filter Settings
            </FormLabel>
            <p className="text-sm text-muted-foreground">
              Configure how live flights are filtered in the Discord bot
            </p>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="liveFilterType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filter Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isExecuting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select filter type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="virtual_org">
                        Virtual Organization
                      </SelectItem>
                      <SelectItem value="suffix">Callsign Suffix</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="liveFilterSuffix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Callsign Suffix</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Filter flights by callsigns ending with this suffix (e.g.,
                    &quot;AK&quot;)
                  </p>
                  <FormControl>
                    <Input
                      placeholder="VA"
                      className="h-11"
                      disabled={isExecuting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="liveFilterVirtualOrg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Virtual Organization</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Filter flights by virtual organization name (case-sensitive,
                    must be exactly like on the IFC)
                  </p>
                  <FormControl>
                    <Input
                      placeholder="Air France - KLM Virtual Group [AFKLM]"
                      className="h-11"
                      disabled={isExecuting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isExecuting} className="min-w-32">
            {isExecuting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
