"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@apollo/client/react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UPDATE_USER } from "@/graphql/mutations";
import { replaceGqlError } from "@/lib/utils/replaceGqlError";
import { cn } from "@/lib/utils";
import {
  FOCUS_RING_CLASS,
  FORM_ERROR_TEXT_CLASS,
  FORM_FIELD_CLASS,
  FORM_LABEL_CLASS,
  PRIMARY_ACTION_CLASS,
} from "@/lib/constants/formControls";
import type { ChangePasswordDialogProps } from "@/types/settings";
import type { UpdateUserResponse } from "@/types/test";

/** Same rule Settings used before the profile split. */
export const PASSWORD_MIN_LENGTH = 8;

const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const EMPTY: ChangePasswordValues = { password: "", confirmPassword: "" };

/**
 * Change Password, under Account in Settings. It has its own form, so changing
 * the password never saves the email or theme, and vice versa. The live API's
 * `updateUser` hashes `password` and leaves every field it isn't sent alone.
 */
export default function ChangePasswordDialog({ userId, username }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [updateUser, { loading }] = useMutation<UpdateUserResponse>(UPDATE_USER);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    setOpen(next);
    if (!next) {
      form.reset(EMPTY);
      setShowPassword(false);
    }
  };

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      await updateUser({ variables: { user: { _id: userId, password: values.password } } });
      toast.success("Password changed");
      form.reset(EMPTY);
      setShowPassword(false);
      setOpen(false);
    } catch (err) {
      const message = replaceGqlError(
        err instanceof Error ? err.message : "Couldn't change your password"
      );
      form.setError("password", { message }, { shouldFocus: true });
    }
  };

  // The dialog renders in a portal, but React still bubbles its submit to the
  // Settings form around the trigger, so stop it here.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    void form.handleSubmit(onSubmit)(event);
  };

  const ToggleIcon = showPassword ? EyeOff : Eye;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium leading-none">Password</p>
          <p className="text-sm text-foreground/75">Change the password you sign in with.</p>
        </div>
        {/* A real trigger, so closing the dialog returns focus to this button. */}
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-testid="change-password-button"
            className={cn("shrink-0 border-[#8a8a93] dark:border-[#6e7681]", FOCUS_RING_CLASS)}
          >
            <KeyRound className="size-4" aria-hidden="true" />
            Change password
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        data-testid="change-password-dialog"
      >
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Choose a new password for signing in to Quote.Vote.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Lets password managers save the new password for the right account. */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              readOnly
              hidden
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={FORM_LABEL_CLASS}>New password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        autoCapitalize="none"
                        spellCheck={false}
                        className={cn("pr-11", FORM_FIELD_CLASS)}
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                      aria-pressed={showPassword}
                      className={cn(
                        "absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
                        FOCUS_RING_CLASS
                      )}
                    >
                      <ToggleIcon className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <FormDescription>At least {PASSWORD_MIN_LENGTH} characters.</FormDescription>
                  <FormMessage className={FORM_ERROR_TEXT_CLASS} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={FORM_LABEL_CLASS}>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={FORM_FIELD_CLASS}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className={FORM_ERROR_TEXT_CLASS} />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
                className={cn("border-[#8a8a93] dark:border-[#6e7681]", FOCUS_RING_CLASS)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={cn(PRIMARY_ACTION_CLASS, FOCUS_RING_CLASS)}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Changing…
                  </>
                ) : (
                  "Change password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
