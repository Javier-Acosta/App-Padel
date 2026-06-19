# Court Reservations Spec

## ADDED Requirements

### Requirement: Registered users can reserve available court turns

The system SHALL allow registered users to create court reservations for available turns in a single club.

#### Scenario: User creates a pending reservation

- **GIVEN** a registered user is authenticated
- **AND** an active court has availability for the selected time range
- **WHEN** the user selects a date, court, start time, and valid duration
- **THEN** the system creates a reservation with status `pending_payment`
- **AND** the selected court time is temporarily unavailable to other users.

### Requirement: Supported turn durations are fixed

The system SHALL only allow reservation durations from 60 to 900 minutes in 30-minute increments.

#### Scenario: User selects a supported duration

- **GIVEN** a user is creating a reservation
- **WHEN** the user selects a duration from 60 to 900 minutes in 30-minute increments
- **THEN** the system accepts the duration.

#### Scenario: User selects an unsupported duration

- **GIVEN** a user is creating a reservation
- **WHEN** the user selects a duration shorter than 60 minutes, longer than 900 minutes, or not aligned to a 30-minute increment
- **THEN** the system rejects the reservation request.

### Requirement: Availability is calculated for the full duration

The system SHALL only show a turn as available when the full requested duration is free for a court.

#### Scenario: Full duration is available

- **GIVEN** a court has no overlapping reservation or block for the requested range
- **AND** the requested range is inside club opening hours
- **WHEN** the user searches availability
- **THEN** the system shows the turn as available.

#### Scenario: Only part of the duration is available

- **GIVEN** a court has an overlapping reservation or block within the requested duration
- **WHEN** the user searches availability
- **THEN** the system does not show the turn as available.

### Requirement: Pending reservations expire

The system SHALL expire pending payment reservations that are not paid before their expiration time.

#### Scenario: Pending reservation expires

- **GIVEN** a reservation is `pending_payment`
- **AND** its expiration time has passed
- **WHEN** the system evaluates reservation status
- **THEN** the reservation becomes `expired`
- **AND** the court time becomes available again.

### Requirement: Confirmed and active pending reservations block availability

The system SHALL treat confirmed reservations and non-expired pending payment reservations as unavailable time.

#### Scenario: Another user searches a held time

- **GIVEN** a reservation is `pending_payment`
- **AND** the reservation has not expired
- **WHEN** another user searches overlapping availability
- **THEN** the overlapping court time is not shown as available.

#### Scenario: Another user searches a confirmed time

- **GIVEN** a reservation is `confirmed`
- **WHEN** another user searches overlapping availability
- **THEN** the overlapping court time is not shown as available.

### Requirement: Users can cancel eligible reservations

The system SHALL allow users to cancel confirmed reservations until 3 hours before the reservation start time.

#### Scenario: User cancels before cutoff

- **GIVEN** a user has a confirmed reservation
- **AND** the reservation starts more than 3 hours from now
- **WHEN** the user cancels the reservation
- **THEN** the reservation status becomes `cancelled_by_user`
- **AND** the court time becomes available
- **AND** the deposit is not refunded.

#### Scenario: User tries to cancel after cutoff

- **GIVEN** a user has a confirmed reservation
- **AND** the reservation starts in 3 hours or less
- **WHEN** the user tries to cancel the reservation
- **THEN** the system rejects the cancellation.

