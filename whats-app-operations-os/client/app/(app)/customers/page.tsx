import { AppTopbar } from "@/components/app-topbar"
import { CustomersTable } from "@/components/customers/customers-table"

export default function CustomersPage() {
  return (
    <>
      <AppTopbar
        title="Customers"
        description="Every contact, unified with their deal stage, value, and history."
      />
      <CustomersTable />
    </>
  )
}
