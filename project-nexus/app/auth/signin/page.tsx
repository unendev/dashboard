import { Suspense } from "react"
import LoginForm from "@/app/components/auth/LoginForm"

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
