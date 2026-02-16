'use client';

import { ProjectCard, Project } from "./project-card"

export function ProjectsSection() {
  const coreAreasProjectsStatic = [
    {
      title: "Financial Administration",
      description: "Barangay Assembly – Second Semester CY 2024. Held on October 26, 2024, the assembly gathered residents and officials to present the financial report, update ongoing projects, and address community concerns through open dialogue and feedback.",
      image: "/finance.webp",
      date: "October 26, 2024",
      beneficiaries: "All residents",
      url: "https://drive.google.com/drive/folders/10SxM2mhq1j7OqwlMr3FQAV3pEj9-18vQ?usp=sharing",
    },
    {
      title: "Disaster Preparedness",
      description: "Preemptive Evacuation and Relief Distribution for Typhoon Opong. PB Arthur Marco led the preemptive evacuation of 24 families to ensure safety as Typhoon Opong intensified. Together with Kagawad Regie Ajero, BDRRM Chairman, the barangay council and BHW distributed food packs at the evacuation center.",
      image: "/disaster.webp",
      date: "September 25, 2025",
      beneficiaries: "24 evacuated families",
      url: "https://drive.google.com/drive/folders/1kAyJOijS80A_Y3Yr4ca53s9C9-_DnNfa?usp=sharing",
    },
    {
      title: "Social Protection",
      description: "External Accreditation of Barangay 6 Bañadero Child Development Center. External evaluation was conducted to assess and improve the quality of education, ensuring standards for effective learning. Gratitude was extended to the accreditors, Barangay officials, and the Child Development Worker for their support in making the accreditation a success.",
      image: "/social protection.webp",
      date: "September 24, 2025",
      beneficiaries: "Children and families",
      url: "https://drive.google.com/drive/folders/191n5A7HwWok4vNpssWP8fE3udTi23eWc?usp=sharing",
    },
  ]

  const essentialAreasProjectsStatic = [
    {
      title: "Business-Friendliness and Competitiveness",
      description: "Empowering Women: Strengthening Lives Through Awareness and Opportunities. A seminar focused on gender advocacy, mental health, conflict resolution, and livelihood opportunities for women in the community.",
      image: "/livelihood.webp",
      date: "September 17, 2025",
      beneficiaries: "Women in the community",
      url: "https://drive.google.com/drive/folders/1vwyhTr3teTlupka_-9gQyMJ8KMNSCm9S?usp=sharing",
    },
    {
      title: "Peace and Order",
      description: "Seminar/Training for Lupon and Tanod – Empowering for a Drug-Free Community. Held on August 24, 2024, at the Barangay Action Center, the training covered the Katarungang Pambarangay Law, drug awareness and prevention, warrantless arrest procedures, and arresting and handcuffing techniques for barangay tanods.",
      image: "/peace and order.webp",
      date: "August 24, 2024",
      beneficiaries: "Lupon and Tanod members",
      url: "https://drive.google.com/drive/folders/1N_jgpcREiMRM1j-iE0JKs0tIJC46cfJ8?usp=sharing",
    },
    {
      title: "Environmental Management",
      description: "Seminar on Ecological Waste Segregation and Recycling for Livelihood. A community seminar held at the Barangay Action Center highlighting composting, waste segregation in line with RA 9003, and recycling as livelihood opportunities. Resource speakers from OCENR and ESWMO provided insights, while practical demonstrations showed how waste can be turned into useful and marketable products.",
      image: "/environment.webp",
      date: "March 8, 2025",
      beneficiaries: "Community residents",
      url: "https://drive.google.com/drive/folders/1m5xssM3vAWrQvgm2FcOe9VG5g3Lsjc6d?usp=sharing",
    },
  ]

  return (
    <section id="projects" className="min-h-screen py-12 sm:py-16 lg:py-20">
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h2 className="font-black text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>COMMUNITY PROJECTS</h2>
          <p className="text-gray-600 font-medium" style={{fontSize: 'clamp(0.875rem, 1.5vw, 1rem)'}}>
            Discover the ongoing and completed projects that are transforming our barangay and improving the quality of
            life for all residents.
          </p>
        </div>

        {/* Main Pillars Section */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="font-bold text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.25rem, 2.5vw, 2rem)'}}>MAIN PILLARS</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 sm:auto-rows-fr">
            {coreAreasProjectsStatic.map((project: Project, index: number) => (
              <div 
                key={`core-${project.title}-${index}`}
                className={index === 2 ? "sm:col-start-1 sm:col-end-3 sm:flex sm:justify-center lg:col-start-auto lg:col-end-auto lg:block h-full" : "h-full"}
              >
                <div className={index === 2 ? "sm:w-full sm:max-w-md lg:max-w-none lg:w-full h-full" : "w-full h-full"}>
                  <ProjectCard 
                    project={project}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supporting Pillars Section */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="font-bold text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.25rem, 2.5vw, 2rem)'}}>SUPPORTING PILLARS</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 sm:auto-rows-fr">
            {essentialAreasProjectsStatic.map((project: Project, index: number) => (
              <div 
                key={`essential-${project.title}-${index}`}
                className={index === 2 ? "sm:col-start-1 sm:col-end-3 sm:flex sm:justify-center lg:col-start-auto lg:col-end-auto lg:block h-full" : "h-full"}
              >
                <div className={index === 2 ? "sm:w-full sm:max-w-md lg:max-w-none lg:w-full h-full" : "w-full h-full"}>
                  <ProjectCard 
                    project={project}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

          {/* Land for All Section */}
        <div className="mb-0">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="font-black text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>
              BARANGAY 6, BANADERO
            </h3>
            <h4 className="font-bold text-gray-800 leading-snug" style={{fontSize: 'clamp(1.125rem, 2vw, 1.5rem)'}}>
              LAND FOR ALL: Affordable Lots for the Informal Settlers / Renters
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 sm:auto-rows-fr">
            {/* Project Background Card */}
            <div className="h-full">
              <div className="w-full h-full">
                <div className="bg-white/95 backdrop-blur-lg border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-lg overflow-hidden h-full flex flex-col p-6 sm:p-8">
                  <h5 className="font-black tracking-tight mb-4" style={{fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)', letterSpacing: '-0.02em', color: '#1E40AF'}}>
                    PROJECT BACKGROUND & OBJECTIVES
                  </h5>
                  <div className="flex-1 space-y-4">
                    <p className="text-gray-700 leading-relaxed text-justify" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.7', textIndent: '2.5em'}}>
                      <span className="font-bold text-black">The Land for All:</span> Affordable Lots for Informal Settlers project is a Barangay-initiated housing assistance program, funded through a loan from Veterans Bank – Legazpi Branch. The primary goal is to provide secure, affordable residential lots to qualified, landless residents of Barangay 6, Banadero, currently residing as informal settlers or renters.
                    </p>
                    <p className="text-gray-700 leading-relaxed text-justify" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.7', textIndent: '2.5em'}}>
                      To assist low-income beneficiaries in fulfilling their monthly payment obligations, the Barangay shall work in partnership with the Barangay Accredited Cooperative, the Banadero Consumers' Cooperative (BCC)/Empowered Women Association of Barangay Banadero (EWABB), which will serve as an ally organization tasked with mobilizing fund drive activities and capacity-building to ensure prompt amortization payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Eligibility Criteria Card */}
            <div className="h-full">
              <div className="w-full h-full">
                <div className="bg-white/95 backdrop-blur-lg border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-lg overflow-hidden h-full flex flex-col p-6 sm:p-8">
                  <h5 className="font-black tracking-tight mb-4" style={{fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)', letterSpacing: '-0.02em', color: '#1E40AF'}}>
                    ELIGIBILITY CRITERIA FOR BENEFICIARIES
                  </h5>
                  <div className="flex-1 space-y-3">
                    <p className="text-gray-800 leading-snug font-medium" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.6'}}>
                      To qualify as a beneficiary under the Land for All program, applicants must:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex gap-2">
                        <span className="font-bold flex-shrink-0" style={{color: '#1E40AF'}}>•</span>
                        <span className="text-gray-700 leading-snug" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.6'}}>
                          Be landless and living in an informal or rental housing situation.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold flex-shrink-0" style={{color: '#1E40AF'}}>•</span>
                        <span className="text-gray-700 leading-snug" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.6'}}>
                          Be a bonafide resident of Barangay 6, Banadero, Legazpi City or a Registered Voter and/or BCC-EWABB Member is an advantage.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold flex-shrink-0" style={{color: '#1E40AF'}}>•</span>
                        <span className="text-gray-700 leading-snug" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.6'}}>
                          Not have previously availed of any government-funded housing program.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold flex-shrink-0" style={{color: '#1E40AF'}}>•</span>
                        <span className="text-gray-700 leading-snug" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.6'}}>
                          Be willing to cooperate with the support mechanisms facilitated by the cooperative, including community fund drives and educational sessions.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold flex-shrink-0" style={{color: '#1E40AF'}}>•</span>
                        <span className="text-gray-700 leading-snug" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.6'}}>
                          Commit to paying the monthly amortization on time for the full term of the agreement.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions Card */}
            <div className="h-full sm:col-start-1 sm:col-end-3 sm:flex sm:justify-center lg:col-start-auto lg:col-end-auto lg:block">
              <div className="sm:w-full sm:max-w-md lg:max-w-none lg:w-full h-full">
                <div className="bg-white/95 backdrop-blur-lg border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-lg overflow-hidden h-full flex flex-col p-6 sm:p-8">
                  <h5 className="font-black tracking-tight mb-4" style={{fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)', letterSpacing: '-0.02em', color: '#1E40AF'}}>
                    TERMS AND CONDITIONS OF LOT ACQUISITION
                  </h5>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h6 className="font-bold mb-4 tracking-wide text-gray-800" style={{fontSize: 'clamp(0.9375rem, 1.3vw, 1rem)', letterSpacing: '0.05em'}}>
                        LOT COST AND FINANCING
                      </h6>
                      <div className="space-y-0">
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                          <span className="text-gray-700 font-medium" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)'}}>
                            Total cost per lot:
                          </span>
                          <span className="font-bold text-black" style={{fontSize: 'clamp(1rem, 1.4vw, 1.125rem)'}}>
                            ₱119,250.00
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                          <span className="text-gray-700 font-medium" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)'}}>
                            Monthly amortization:
                          </span>
                          <span className="font-bold text-black" style={{fontSize: 'clamp(1rem, 1.4vw, 1.125rem)'}}>
                            ₱1,987.50
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                          <span className="text-gray-700 font-medium" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)'}}>
                            Lot size:
                          </span>
                          <span className="font-bold text-black" style={{fontSize: 'clamp(1rem, 1.4vw, 1.125rem)'}}>
                            50 sq. meters
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-gray-700 font-medium" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)'}}>
                            Term:
                          </span>
                          <span className="font-bold text-black" style={{fontSize: 'clamp(1rem, 1.4vw, 1.125rem)'}}>
                            60 months (5 years)
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed mt-4" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)', lineHeight: '1.7'}}>
                        Financing is covered by the Barangay's loan with Veterans Bank and beneficiaries' payments will go towards paying this loan.
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 font-medium mt-6 text-right" style={{fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)'}}>
                    - PB Arthur R Marco
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
