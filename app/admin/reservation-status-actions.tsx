"use client";

import { useFormStatus } from "react-dom";

import type { ReservationStatus } from "@/lib/domain/reservations";

type ReservationStatusActionsProps = {
  actions: ReadonlyArray<readonly [ReservationStatus, string]>;
  compact?: boolean;
  currentStatus: ReservationStatus;
  reservationId: string;
  updateAction: (formData: FormData) => void | Promise<void>;
};

const guardedStatuses = new Set<ReservationStatus>(["cancelled_by_admin"]);

function StatusSubmitButton({
  compact,
  disabled,
  label,
}: {
  compact: boolean;
  disabled: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`rounded-md border border-[#cbd3c9] bg-white font-semibold text-[#26382f] transition hover:border-[#8ea090] disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm"
      }`}
    >
      {pending ? "Guardando..." : label}
    </button>
  );
}

export function ReservationStatusActions({
  actions,
  compact = false,
  currentStatus,
  reservationId,
  updateAction,
}: ReservationStatusActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(([status, label]) => (
        <form
          key={`${reservationId}-${status}`}
          action={updateAction}
          onSubmit={(event) => {
            if (
              guardedStatuses.has(status) &&
              !window.confirm("¿Confirmás que querés cancelar esta reserva?")
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={reservationId} />
          <input type="hidden" name="status" value={status} />
          <StatusSubmitButton
            compact={compact}
            disabled={currentStatus === status}
            label={label}
          />
        </form>
      ))}
    </div>
  );
}
