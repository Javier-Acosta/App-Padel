# Design: Court Reservation MVP

## Product Model

The application serves one padel club. All courts belong to that club and share the same base price rules. The system focuses on reserving court time, not on assembling players for matches.

## Primary Roles

- `user`: registered player who can browse availability, create reservations, pay deposits, and cancel eligible reservations.
- `admin`: club operator who can configure courts, hours, prices, promotions, blocks, and manage reservations.

## Core Entities

### User

- `id`
- `name`
- `email`
- `phone`
- `role`
- `createdAt`

### Court

- `id`
- `name`
- `active`
- `createdAt`
- `updatedAt`

All courts use the same base pricing configuration for the MVP.

### ClubSettings

- `openingHours`
- `basePrice`
- `depositAmount`
- `paymentHoldMinutes`
- `cancellationCutoffHours`

Initial defaults:

- `paymentHoldMinutes`: 10
- `cancellationCutoffHours`: 3

### Promotion

- `id`
- `name`
- `active`
- `startsAt`
- `endsAt`
- `daysOfWeek`
- `timeRange`
- `priceOverride`
- `depositOverride`

Promotions are managed by the admin and can affect total price, deposit amount, or both.

### CourtBlock

- `id`
- `courtId`
- `startsAt`
- `endsAt`
- `reason`
- `createdBy`

Blocks are used for maintenance, private events, weather-related closures, or manual admin holds.

### Reservation

- `id`
- `userId`
- `courtId`
- `startsAt`
- `endsAt`
- `durationMinutes`
- `status`
- `totalPrice`
- `depositAmount`
- `expiresAt`
- `createdAt`
- `updatedAt`

Reservation statuses:

- `pending_payment`
- `confirmed`
- `expired`
- `cancelled_by_user`
- `cancelled_by_admin`
- `completed`
- `no_show`

### Payment

- `id`
- `reservationId`
- `provider`
- `providerPreferenceId`
- `providerPaymentId`
- `status`
- `amount`
- `rawWebhookData`
- `createdAt`
- `updatedAt`

Payment provider for MVP:

- `mercadopago`

## Reservation Flow

```text
User selects duration
  -> User selects date
  -> System shows available court slots
  -> User selects court and start time
  -> System creates pending_payment reservation
  -> System creates MercadoPago checkout preference
  -> User pays deposit
  -> MercadoPago sends webhook
  -> System validates payment
  -> Reservation becomes confirmed
```

## Availability Rules

A slot is available only when:

- The court is active.
- The requested duration is at least 60 minutes, no more than 900 minutes, and aligned to a 30-minute increment.
- The requested time range is inside club opening hours.
- No confirmed reservation overlaps the requested range.
- No non-expired pending payment reservation overlaps the requested range.
- No admin block overlaps the requested range.

Availability must be calculated for the full selected duration. For example, a 90 minute reservation must have 90 continuous free minutes.

## Pending Payment Hold

When a user starts checkout, the system creates a `pending_payment` reservation with an `expiresAt` timestamp. While pending and not expired, the time range is unavailable to other users.

If the user does not complete payment before expiration:

- the reservation becomes `expired`;
- the court time becomes available again.

If a MercadoPago approved payment arrives after the reservation has expired, the system must not confirm the reservation automatically. The payment should be recorded for admin review.

## Payment Confirmation

The MercadoPago webhook is the source of truth for confirming reservations. Client-side return URLs may show an intermediate result but must not confirm the reservation without webhook validation.

Only approved deposit payments confirm reservations.

## Cancellation Rules

Users can cancel confirmed reservations until 3 hours before `startsAt`.

On user cancellation:

- reservation status becomes `cancelled_by_user`;
- the court time is released;
- the deposit is not refunded;
- the payment record remains linked to the cancelled reservation.

Admins can cancel reservations regardless of cutoff. Refund handling is out of scope for MVP and remains a manual operational decision.

## Admin Operations

The admin interface should support:

- Managing courts.
- Managing club opening hours.
- Managing base price and deposit amount.
- Managing promotions.
- Creating and removing court blocks.
- Viewing agenda by day or week.
- Viewing reservation details and payment status.
- Cancelling reservations.

## Data Integrity

The system must prevent overlapping active reservations for the same court. Active blocking statuses are:

- `pending_payment` when not expired
- `confirmed`

Implementation should enforce overlap prevention server-side during reservation creation and confirmation.

