# Admin Operations Spec

## ADDED Requirements

### Requirement: Admin can manage courts

The system SHALL allow admins to create, update, activate, and deactivate courts for the club.

#### Scenario: Admin deactivates a court

- **GIVEN** an admin is managing courts
- **WHEN** the admin deactivates a court
- **THEN** the court no longer appears in new user availability searches.

### Requirement: Admin can configure club pricing

The system SHALL allow admins to configure the club base price and deposit amount used for reservations.

#### Scenario: Admin updates deposit amount

- **GIVEN** an admin changes the deposit amount
- **WHEN** a user creates a new reservation
- **THEN** the new reservation uses the updated deposit amount unless a promotion overrides it.

### Requirement: Admin can manage promotions

The system SHALL allow admins to define promotions that can override total price and/or deposit amount for matching turns.

#### Scenario: Promotion applies to matching turn

- **GIVEN** an active promotion matches the selected date and time
- **WHEN** a user creates a reservation for that turn
- **THEN** the reservation uses the promotional price and/or deposit override.

#### Scenario: Promotion does not match turn

- **GIVEN** an active promotion does not match the selected date or time
- **WHEN** a user creates a reservation
- **THEN** the reservation uses the standard club price and deposit settings.

### Requirement: Admin can block court time

The system SHALL allow admins to block court time so users cannot reserve it.

#### Scenario: Admin creates a court block

- **GIVEN** an admin creates a block for a court time range
- **WHEN** users search availability for that range
- **THEN** the blocked time is not shown as available.

### Requirement: Admin can view and manage reservations

The system SHALL allow admins to view reservations and cancel reservations when needed.

#### Scenario: Admin cancels reservation

- **GIVEN** an admin views a confirmed reservation
- **WHEN** the admin cancels the reservation
- **THEN** the reservation status becomes `cancelled_by_admin`
- **AND** the court time becomes available unless blocked by another rule.

### Requirement: Admin can configure opening hours

The system SHALL allow admins to configure the club opening hours used by availability calculations.

#### Scenario: User searches outside opening hours

- **GIVEN** the club is closed for the requested time range
- **WHEN** a user searches availability
- **THEN** the system does not show turns outside opening hours.

