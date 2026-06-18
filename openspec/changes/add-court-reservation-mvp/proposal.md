# Add Court Reservation MVP

## Summary

Build the first MVP for a single-club padel court reservation application. Registered users can browse available court times in a calendar, choose a 60, 90, or 120 minute turn, pay a non-refundable deposit through MercadoPago, and receive an automatically confirmed reservation when payment is approved.

## Motivation

The club needs a digital reservation flow that reduces manual coordination, prevents double-booking, and gives players a clear way to secure court time. MercadoPago deposit payment ensures commitment before the reservation is confirmed while keeping the remaining balance payable at the club.

## Scope

- User registration and authenticated reservation flow.
- Calendar-based court availability for a single club.
- Multiple courts with the same base pricing rules.
- Turn durations of 60, 90, and 120 minutes.
- Temporary reservation hold while payment is pending.
- MercadoPago checkout for deposit payment.
- MercadoPago webhook handling for payment confirmation.
- Automatic reservation confirmation after approved payment.
- User cancellation up to 3 hours before start time.
- Non-refundable deposit on user cancellation.
- Admin management for courts, opening hours, base price, deposit amount, promotions, blocks, and reservations.

## Out of Scope

- Multi-club marketplace behavior.
- Full online payment of the court price.
- Automatic refund processing.
- Player matching or social match creation.
- Competitive ranking and tournaments.
- Native mobile apps.

## Success Criteria

- A registered user can reserve an available court time and pay the deposit online.
- A reservation is not confirmed until MercadoPago reports an approved payment.
- A pending payment hold expires and releases availability if payment is not completed in time.
- A confirmed reservation blocks the court time for all users.
- A user can cancel a confirmed reservation more than 3 hours before the start time, releasing the court without refunding the deposit.
- An admin can configure the operational data needed for the club to use the reservation system.

