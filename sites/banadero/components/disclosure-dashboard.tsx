"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@barangay/ui"
import { Folder } from "lucide-react"
import type { BarangayConfig } from "@barangay/shared"

interface DashboardItem {
  title: string
  year2025Link?: string
  year2026Link?: string
}

interface DisclosureDashboardProps {
  config?: BarangayConfig
}

export function DisclosureDashboard({ config }: DisclosureDashboardProps) {
  // Read disclosure links from site.config.json (injected via next.config.mjs env)
  const dashboardItems: DashboardItem[] = [
    { title: "BARANGAY BUDGET", year2025Link: process.env.DISCLOSURE_BARANGAY_BUDGET_2025, year2026Link: process.env.DISCLOSURE_BARANGAY_BUDGET_2026 },
    { title: "ITEMIZED MONTHLY COLLECTIONS AND DISBURSEMENT", year2025Link: process.env.DISCLOSURE_ITEMIZED_MONTHLY_2025, year2026Link: process.env.DISCLOSURE_ITEMIZED_MONTHLY_2026 },
    { title: "20% COMPONENT OF THE IRA UTILIZATION", year2025Link: process.env.DISCLOSURE_IRA_UTILIZATION_2025, year2026Link: process.env.DISCLOSURE_IRA_UTILIZATION_2026 },
    { title: "ANNUAL PROCUREMENT PLAN OR PROCUREMENT LIST", year2025Link: process.env.DISCLOSURE_PROCUREMENT_2025, year2026Link: process.env.DISCLOSURE_PROCUREMENT_2026 },
    { title: "LIST OF NOTICES AND AWARD", year2025Link: process.env.DISCLOSURE_NOTICES_AWARD_2025, year2026Link: process.env.DISCLOSURE_NOTICES_AWARD_2026 },
    { title: "SUMMARY OF INCOME AND EXPENDITURE", year2025Link: process.env.DISCLOSURE_INCOME_EXPENDITURE_2025, year2026Link: process.env.DISCLOSURE_INCOME_EXPENDITURE_2026 },
  ]

  return (
    <section 
      className="w-full relative"
      style={{ paddingTop: 'clamp(3rem, 6vh, 5rem)', paddingBottom: 'clamp(2rem, 4vh, 3rem)' }}
    >
      <div className="w-full max-w-[1300px] mx-auto">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h2 className="font-black text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>
            FULL DISCLOSURE DASHBOARD
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {dashboardItems.map((item, index) => (
            <Card 
              key={index}
              className="bg-white/95 backdrop-blur-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98 flex flex-col h-full"
            >
              {/* TITLE - Fixed height for consistent alignment */}
              <div className="h-[3.5rem] sm:h-[4rem] flex items-center justify-center text-center px-3 sm:px-6 pt-3 pb-2 flex-shrink-0">
                <h3 className="text-primary text-sm sm:text-base lg:text-lg font-black leading-tight line-clamp-2">
                  {item.title}
                </h3>
              </div>

              {/* BUTTONS - Pushed to bottom with mt-auto */}
              <CardContent className="space-y-3 pb-3 px-3 sm:px-6 pt-2 flex-1 flex flex-col mt-auto">
                {/* 2025 Folder - Blue */}
                <a
                  href={item.year2025Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 border-blue-300 bg-blue-100 hover:bg-blue-200 hover:border-blue-400 transition-all duration-200"
                >
                  <div className="flex-shrink-0">
                    <Folder className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#2563eb', fill: '#2563eb' }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: '#2563eb' }}>2025</div>
                  </div>
                </a>

                {/* 2026 Folder - Yellow */}
                <a
                  href={item.year2026Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 border-yellow-300 bg-yellow-100 hover:bg-yellow-200 hover:border-yellow-400 transition-all duration-200"
                >
                  <div className="flex-shrink-0">
                    <Folder className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#eab308', fill: '#eab308' }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: '#eab308' }}>2026</div>
                  </div>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
