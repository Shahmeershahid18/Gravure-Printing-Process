import { getUsers } from "@/lib/actions/control"
import { PageHeader } from "@/components/ui/page-header"
import { Alert } from "@/components/ui/alert"
import { ControlUsersTable } from "@/components/control/ControlUsersTable"

export const metadata = { title: "Not found" }

export default async function ControlUsersPage() {
  const users = await getUsers()

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Every account, including the hidden ones that Settings → Users does not show."
      />

      <Alert tone="info" title="This list is not the same as the admin one." className="mb-4">
        Settings → Users is filtered by the row level policy on{" "}
        <code>profiles</code>: hidden accounts are absent from it, and an admin
        cannot edit or deactivate one even knowing its id. This page reads
        through <code>fn_sa_users()</code>, which is not filtered, and adds the
        sign-in facts that live in <code>auth.users</code>.
      </Alert>

      <ControlUsersTable users={users} />
    </div>
  )
}
