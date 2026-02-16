import { headers } from "next/headers"
import { getBarangayConfig } from "@barangay/shared"
import { HomeClient } from "@/components/home-client"

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get('x-barangay-host') || headersList.get('host') || ''
  const config = await getBarangayConfig(host)

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Barangay not found</p>
      </div>
    )
  }

  return <HomeClient config={config} />
}
