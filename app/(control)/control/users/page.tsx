import { getUsers } from "@/lib/actions/control"
import { requireSuperAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { ControlUsersTable } from "@/components/control/ControlUsersTable"

export const metadata = { title: "Not found" }

export default async function ControlUsersPage() {
  const [me, users] = await Promise.all([requireSuperAdmin(), getUsers()])

  const suspended = users.filter((u) => !u.is_active).length

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={
          `Every account, including the hidden ones Settings → Users does not show. ` +
          (suspended > 0
            ? `${suspended} of ${users.length} are suspended.`
            : `All ${users.length} can sign in.`)
        }
      />
      <ControlUsersTable users={users} currentUserId={me.id} />
    </div>
  )
}
