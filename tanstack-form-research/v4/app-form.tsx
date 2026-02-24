// =============================================================================
// app-form.tsx — Form wrapper with submit handling and scroll-to-error
// =============================================================================

import { type ReactNode } from "react";
import { Stack, type StackProps } from "@mantine/core";

type AppFormProps = {
  form: { handleSubmit: () => Promise<void>; state: { isValid: boolean } };
  children: ReactNode;
} & Omit<StackProps, "component">;

export function AppForm({
  form,
  children,
  gap = "md",
  ...rest
}: AppFormProps) {
  return (
    <Stack
      component="form"
      onSubmit={async (e: React.FormEvent) => {
        e.preventDefault();
        await form.handleSubmit();

        if (!form.state.isValid) {
          requestAnimationFrame(() => {
            const el =
              document.querySelector<HTMLElement>('[data-error="true"]');
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            }
          });
        }
      }}
      gap={gap}
      {...rest}
    >
      {children}
    </Stack>
  );
}
