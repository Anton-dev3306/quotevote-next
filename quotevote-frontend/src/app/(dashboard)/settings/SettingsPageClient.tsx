'use client'

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@apollo/client/react'
import { ChevronRight, Loader2, Moon, Sun, Sparkles, UserPen } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import ChangePasswordDialog from '@/components/settings/ChangePasswordDialog'
import { UPDATE_USER } from '@/graphql/mutations'
import { GET_USER } from '@/graphql/queries'
import { replaceGqlError } from '@/lib/utils/replaceGqlError'
import { useAppStore } from '@/store/useAppStore'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import {
  FOCUS_RING_CLASS,
  FORM_ERROR_TEXT_CLASS,
  FORM_FIELD_CLASS,
  FORM_LABEL_CLASS,
  PRIMARY_ACTION_CLASS,
  SWITCH_CLASS,
} from '@/lib/constants/formControls'
import type { SettingsUserData } from '@/types/settings'
import type { UpdateUserResponse } from '@/types/test'

const settingsSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

const noopSubscribe = () => () => {}

/**
 * Settings (#536): account and app preferences only. Photo, name, username,
 * About and banner are edited from the profile (Edit profile). Sign out lives
 * in the account menu. The password is changed from Account, in its own dialog.
 */
export default function SettingsPageClient() {
  const userData = useAppStore((state) => state.user.data) as SettingsUserData | undefined
  const setUserData = useAppStore((state) => state.setUserData)
  const { setTheme, isDarkMode, neoBrutalism, toggleNeoBrutalism } = useTheme()

  const username = userData?.username ?? ''
  const email = userData?.email ?? ''
  const userId = userData?.id ?? userData?._id ?? ''

  const [localDarkMode, setLocalDarkMode] = useState(isDarkMode)
  const [originalDarkMode, setOriginalDarkMode] = useState(isDarkMode)
  const [localBrutalism, setLocalBrutalism] = useState(neoBrutalism)
  // The theme comes from localStorage, which the server can't read, so the
  // switches, icon and labels show the saved theme only after hydration.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const darkShown = hydrated && localDarkMode
  const brutalismShown = hydrated && localBrutalism

  const [updateUser, { loading }] = useMutation<UpdateUserResponse>(UPDATE_USER)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { email },
    values: { email },
    resetOptions: { keepDirtyValues: true },
  })

  useEffect(() => {
    setLocalDarkMode(isDarkMode)
  }, [isDarkMode])

  const handleThemeToggle = useCallback(
    (checked: boolean) => {
      setTheme(checked ? 'dark' : 'light')
      setLocalDarkMode(checked)
    },
    [setTheme]
  )

  const handleBrutalismToggle = useCallback(() => {
    const next = toggleNeoBrutalism()
    setLocalBrutalism(next)
  }, [toggleNeoBrutalism])

  const themeDirty = localDarkMode !== originalDarkMode
  const isFormDirty = form.formState.isDirty || themeDirty

  const onSubmit = async (values: SettingsFormValues) => {
    const userInput: Record<string, unknown> = {
      _id: userId,
      themePreference: localDarkMode ? 'dark' : 'light',
    }
    if (form.formState.dirtyFields.email) userInput.email = values.email

    try {
      const result = await updateUser({
        variables: { user: userInput },
        refetchQueries: [{ query: GET_USER, variables: { username } }],
        awaitRefetchQueries: true,
      })
      const updated = result.data?.updateUser
      if (updated) {
        setUserData({
          ...userData,
          ...updated,
          avatar: userData?.avatar as string | undefined,
          themePreference: localDarkMode ? 'dark' : 'light',
        })
        setOriginalDarkMode(localDarkMode)
        toast.success('Settings saved')
        form.reset({ email: updated.email ?? values.email })
      }
    } catch (err) {
      const message = replaceGqlError(err instanceof Error ? err.message : 'Failed to save settings')
      if (/email/i.test(message)) {
        form.setError('email', { message }, { shouldFocus: true })
      } else {
        toast.error(message)
      }
    }
  }

  return (
    <div className="py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-foreground/75">Your account and app preferences.</p>
      </div>

      <Link
        href={username ? `/profile/${username}/edit` : '/profile'}
        data-testid="settings-edit-profile-link"
        className={cn(
          'flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/60',
          FOCUS_RING_CLASS
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserPen className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Edit profile</span>
          <span className="block text-foreground/75">Photo, name, username, About and banner</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-foreground/60" aria-hidden="true" />
      </Link>

      <Card>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <section className="space-y-4" aria-labelledby="settings-account-heading">
                <h2 id="settings-account-heading" className="text-base font-semibold">
                  Account
                </h2>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={FORM_LABEL_CLASS}>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className={FORM_FIELD_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className={FORM_ERROR_TEXT_CLASS} />
                    </FormItem>
                  )}
                />
                {/* Its own dialog and form: saving here never sends a password (#595 review). */}
                <ChangePasswordDialog userId={userId} username={username} />
              </section>

              <Separator />

              <section className="space-y-4" aria-labelledby="settings-appearance-heading">
                <h2 id="settings-appearance-heading" className="text-base font-semibold">
                  Appearance
                </h2>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Dark mode</Label>
                    <p className="text-sm text-foreground/75">
                      {darkShown ? 'Dark mode is on' : 'Dark mode is off'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {darkShown ? (
                      <Moon className="size-4 text-foreground/70" aria-hidden="true" />
                    ) : (
                      <Sun className="size-4 text-foreground/70" aria-hidden="true" />
                    )}
                    <Switch
                      id="dark-mode"
                      checked={darkShown}
                      onCheckedChange={handleThemeToggle}
                      size="lg"
                      className={cn(SWITCH_CLASS, FOCUS_RING_CLASS)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="neo-brutalism">Neo-Brutalism</Label>
                    <p className="text-sm text-foreground/75">
                      {brutalismShown
                        ? 'Bold borders, hard shadows, chunky type'
                        : 'Switch to a raw, high-contrast brutalist look'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-foreground/70" aria-hidden="true" />
                    <Switch
                      id="neo-brutalism"
                      checked={brutalismShown}
                      onCheckedChange={handleBrutalismToggle}
                      size="lg"
                      className={cn(SWITCH_CLASS, FOCUS_RING_CLASS)}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!isFormDirty || loading}
                  className={cn(PRIMARY_ACTION_CLASS, FOCUS_RING_CLASS)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
