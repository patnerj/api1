import { redirect } from 'next/navigation'

// Alias route — redirect to canonical /reset-password
export default function ForgotPasswordPage() {
  redirect('/reset-password')
}
