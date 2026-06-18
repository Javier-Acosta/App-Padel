# Payments Spec

## ADDED Requirements

### Requirement: Reservations require MercadoPago deposit payment

The system SHALL require a MercadoPago deposit payment before confirming a reservation.

#### Scenario: User starts payment

- **GIVEN** a reservation is `pending_payment`
- **WHEN** the user proceeds to payment
- **THEN** the system creates a MercadoPago checkout preference for the reservation deposit
- **AND** stores the provider preference metadata.

### Requirement: Approved webhook confirms reservation

The system SHALL confirm reservations only after receiving and validating an approved MercadoPago payment webhook.

#### Scenario: MercadoPago approves payment

- **GIVEN** a reservation is `pending_payment`
- **AND** MercadoPago sends an approved payment webhook for the reservation deposit
- **WHEN** the system validates the webhook event
- **THEN** the payment status is recorded as approved
- **AND** the reservation status becomes `confirmed`.

### Requirement: Client checkout return does not confirm reservation

The system SHALL NOT confirm a reservation solely from a client-side checkout return.

#### Scenario: User returns from checkout before webhook processing

- **GIVEN** a user returns from MercadoPago checkout
- **AND** the approval webhook has not been processed
- **WHEN** the reservation page is displayed
- **THEN** the system shows the current reservation status
- **AND** does not mark the reservation as confirmed from the return URL alone.

### Requirement: User cancellation does not refund deposit

The system SHALL retain the paid deposit when a user cancels a confirmed reservation.

#### Scenario: User cancels a paid reservation

- **GIVEN** a reservation is `confirmed`
- **AND** the linked deposit payment is approved
- **WHEN** the user cancels before the cancellation cutoff
- **THEN** the reservation becomes `cancelled_by_user`
- **AND** the payment remains recorded as approved
- **AND** no automatic refund is created.

### Requirement: Late approved payments require review

The system SHALL NOT automatically confirm an expired reservation when an approved payment arrives after expiration.

#### Scenario: Payment arrives after reservation expiration

- **GIVEN** a reservation is `expired`
- **WHEN** an approved MercadoPago webhook arrives for that reservation
- **THEN** the system records the payment event
- **AND** does not mark the reservation as `confirmed`
- **AND** makes the event available for admin review.

