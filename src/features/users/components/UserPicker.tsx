import { useMemo } from "react";
import type { Role } from "@/lib/api";
import { isStaff, roleLabel } from "@/lib/permissions";
import { SelectField } from "@/components/ui";
import { InlineNotice } from "@/components/feedback";
import { useSession } from "@/features/auth";
import { useUsers } from "../hooks/useUsers";

const ANY = "__any__";

export interface UserPickerProps {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  /** Only users with this role. */
  role?: Role | undefined;
  /** Hide users with these roles from the list (e.g. a corrective action isn't assigned to a manager). */
  excludeRoles?: Role[] | undefined;
  /** Text for the "no filter / unassigned" choice. Omit to force a choice. */
  anyLabel?: string | undefined;
  helper?: string | undefined;
  testID?: string | undefined;
}

/**
 * Staff-only (GET /v1/users is forbidden to workers), so it renders nothing for them
 * instead of firing a request that can only fail (guide §6).
 */
export function UserPicker({
  label,
  value,
  onChange,
  role,
  excludeRoles,
  anyLabel,
  helper,
  testID,
}: UserPickerProps) {
  const { user } = useSession();
  const staff = isStaff(user?.role);
  const query = useUsers(role, staff);
  const options = useMemo(() => {
    const users = (query.data ?? [])
      .filter((u) => !excludeRoles?.includes(u.role))
      .map((u) => ({
        value: u.id,
        label: u.fullName,
        description: roleLabel[u.role],
      }));
    return anyLabel ? [{ value: ANY, label: anyLabel }, ...users] : users;
  }, [query.data, excludeRoles, anyLabel]);

  if (!staff) return null;
  return (
    <>
      <SelectField
        label={label}
        value={value ?? (anyLabel ? ANY : null)}
        options={options}
        onChange={(next) => onChange(next === ANY ? null : next)}
        helper={helper}
        testID={testID}
      />
      {query.isError ? <InlineNotice message="Couldn't load people. Try again later." /> : null}
    </>
  );
}
