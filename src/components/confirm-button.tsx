"use client";

import { ButtonHTMLAttributes } from "react";

export function ConfirmButton({
  message,
  onClick,
  ...props
}: {
  message: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
        const form = event.currentTarget.form;
        if (form) {
          form.requestSubmit(event.currentTarget);
        }
      }}
    />
  );
}
