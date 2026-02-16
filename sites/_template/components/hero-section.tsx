"use client"

import Link from "next/link"
import { Button, Card, CardContent, CardHeader, CardTitle } from "@barangay/ui"
import { FileText, Phone, Mail } from "lucide-react"
import type { BarangayConfig } from "@barangay/shared"

interface HeroSectionProps {
  config?: BarangayConfig
}

export function HeroSection({ config }: HeroSectionProps) {
  const fullName = config?.full_name || 'Your Barangay'
  const city = config?.city || 'City'
  const province = config?.province || 'Province'
  const phone = config?.phone || '0917 000 0000'
  const email = config?.email || 'barangay@example.com'
  const mission = config?.mission || 'Your barangay mission statement goes here.'
  const vision = config?.vision || 'Your barangay vision statement goes here.'
  const primaryColor = config?.primary_color || '#0007C6'

  return (
    <section id="hero" className="relative w-full py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{fullName}</h1>
          <p className="text-xl text-gray-600">{city}, {province}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{mission}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{vision}</p>
            </CardContent>
          </Card>
        </div>

        {/* TODO: Add services grid, officials section, contact info */}
        <div className="text-center">
          <Link href="/clearances">
            <Button size="lg" style={{ backgroundColor: primaryColor }} className="text-white">
              <FileText className="mr-2 h-5 w-5" />
              Request a Clearance
            </Button>
          </Link>
        </div>

        <div className="mt-8 flex justify-center gap-8 text-gray-600">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>{phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
