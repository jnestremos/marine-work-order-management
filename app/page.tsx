import { WorkOrderProvider } from "@/components/work-orders/WorkOrderProvider"
import { SessionSwitch } from "@/components/session/SessionSwitch"
import { AdminHome } from "@/components/views/AdminHome"
import { CaptainHome } from "@/components/views/CaptainHome"
import { CrewHome } from "@/components/views/CrewHome"
import { EmptyRole } from "@/components/views/EmptyRole"

export default function HomePage() {
  return (
    <WorkOrderProvider>
      <main>
        <SessionSwitch
          admin={<AdminHome />}
          captain={<CaptainHome />}
          crew={<CrewHome />}
          empty={<EmptyRole />}
        />
      </main>
    </WorkOrderProvider>
  )
}
