import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/phone";

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
};

/** Phone input that auto-inserts hyphens (010-1234-5678) as the user types. */
export function PhoneInput({ value, onValueChange, placeholder = "010-0000-0000", ...rest }: Props) {
  return (
    <Input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      maxLength={13}
      placeholder={placeholder}
      value={formatPhone(value)}
      onChange={(e) => onValueChange(formatPhone(e.target.value))}
    />
  );
}
