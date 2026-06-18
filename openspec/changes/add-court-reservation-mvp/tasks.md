# Tasks

## 1. Foundation

- [x] Define data model for users, courts, club settings, promotions, blocks, reservations, and payments.
- [x] Choose and configure persistence layer.
- [x] Add server-side validation for allowed durations, cancellation cutoff, and reservation statuses.
- [x] Create and run PocketBase schema sync for MVP collections.

## 2. Authentication and Roles

- [x] Implement user registration and login.
- [x] Add user/admin role support.
- [x] Protect reservation and admin routes by role.

## 3. Availability and Reservation Flow

- [x] Implement availability calculation for 60, 90, and 120 minute durations.
- [x] Exclude confirmed reservations, non-expired pending reservations, and admin blocks from availability.
- [x] Create pending payment reservations with expiration.
- [ ] Expire stale pending payment reservations and release their slots.
- [x] Prevent overlapping active reservations server-side.

## 4. MercadoPago Payment

- [ ] Create MercadoPago checkout preference for reservation deposits.
- [ ] Store provider preference and payment metadata.
- [ ] Implement MercadoPago webhook endpoint.
- [ ] Confirm reservations only after approved webhook payment.
- [ ] Record late or unmatched webhook events for admin review.

## 5. User Experience

- [x] Build calendar availability view.
- [x] Let users choose date, duration, court, and available start time.
- [ ] Redirect users to MercadoPago checkout.
- [ ] Show reservation status after checkout return.
- [ ] Add "My reservations" view.
- [ ] Allow user cancellation until 3 hours before start time.

## 6. Admin Experience

- [ ] Build admin agenda view by day or week.
- [ ] Add court management.
- [ ] Add opening hours configuration.
- [ ] Add base price and deposit configuration.
- [ ] Add promotion management.
- [ ] Add court block management.
- [ ] Add reservation detail and admin cancellation.

## 7. Verification

- [ ] Test successful reservation and payment confirmation flow.
- [ ] Test payment timeout and slot release.
- [ ] Test overlapping reservation prevention.
- [ ] Test user cancellation before and after the 3 hour cutoff.
- [ ] Test promotion price/deposit application.
- [ ] Test admin blocks removing availability.
