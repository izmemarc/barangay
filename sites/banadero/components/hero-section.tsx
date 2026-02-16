"use client"

import Link from "next/link"
import Image from "next/image"
import { Button, Card, CardContent, CardHeader, CardTitle } from "@barangay/ui"
import { FileText, Calendar, MapPin, Phone, Mail, Briefcase, AlertCircle, UserPlus, CreditCard, Award, Leaf } from "lucide-react"
import type { BarangayConfig } from "@barangay/shared"

interface HeroSectionProps {
  config?: BarangayConfig
}

export function HeroSection({ config }: HeroSectionProps) {
  const fullName = config?.full_name || 'Barangay 6, Bañadero'
  const city = config?.city || 'Legazpi City'
  const province = config?.province || 'Albay'
  const barangayPhone = config?.phone || '0917 555 3323'
  const barangayEmail = config?.email || 'brgy6banadero@gmail.com'
  const mission = config?.mission || 'With the inspiration and guidance of the Almighty God, we are committed to adopt state-of-the-art technologies, plan and implement programs, projects and activities using the Community Driven Development (CDD) strategy to promptly deliver quality basic services for the total improvement of the barangay.'
  const vision = config?.vision || 'A self-reliant community enjoying a progressive and even-handed economy, disaster resilient, drug-free, well-managed solid wastes, peaceful and ecologically balanced environment with God-loving people guided by a responsive, participatory, transparent and accountable leadership and governance.'
  const captain = config?.officials?.[0]
  const captainName = captain?.name || 'Arthur R. Marco'
  const captainPosition = captain?.position || 'Punong Barangay'
  return (
    <section
      id="hero"
      className="relative w-full"
      style={{minHeight: 'auto', paddingTop: '5rem', paddingBottom: '3rem'}}
    >
      <div className="w-full max-w-[1600px] mx-auto flex items-start hero-content" style={{paddingTop: 'clamp(1rem, 2vh, 2rem)', minHeight: 'auto'}}>
        <div className="grid grid-cols-1 lg:grid-cols-3 w-full hero-grid gap-4 sm:gap-6 lg:gap-8" style={{paddingTop: 'clamp(1rem, 2vh, 2rem)', paddingBottom: 'clamp(1rem, 2vh, 2rem)'}}>
          {/* Left and Center Columns - Logo spanning both */}
          <div className="lg:col-span-2 flex flex-col hero-column gap-4 sm:gap-6 lg:gap-8">
            {/* Logo Card spanning left and center */}
            <Card className="bg-white/98 backdrop-blur-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:shadow-xl w-full overflow-hidden hero-card transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row items-center lg:items-stretch">
                  {/* Logo Section */}
                  <div className="flex-shrink-0 flex items-center justify-center hero-logo-section" style={{paddingLeft: 'clamp(1.5rem, 3vw, 3rem)', paddingRight: 'clamp(1rem, 2vw, 2rem)', paddingTop: 'clamp(1.5rem, 3vh, 2.5rem)', paddingBottom: 'clamp(1.5rem, 3vh, 2.5rem)'}}>
                    <div className="relative drop-shadow-sm" style={{width: 'clamp(10rem, 16vw, 9rem)', height: 'clamp(10rem, 16vw, 9rem)'}}>
                      <Image
                        src="/logo.png"
                        alt="Barangay Logo"
                        fill
                        sizes="(max-width: 1024px) 10rem, 16vw"
                        className="object-contain"
                        priority
                      />
                    </div>
                  </div>
                  
                  {/* Title Section */}
                  <div className="flex-1 text-center lg:text-left hero-text-section" style={{paddingLeft: 'clamp(1rem, 2vw, 2rem)', paddingRight: 'clamp(1rem, 2vw, 2rem)', paddingTop: 'clamp(1rem, 2vh, 2rem)', paddingBottom: 'clamp(1rem, 2vh, 2rem)'}}>
                     <h1 className="font-black text-primary leading-none tracking-tight whitespace-nowrap" style={{fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>
                       {fullName}
                     </h1>
                     <h2 className="font-bold text-primary leading-none" style={{fontSize: 'clamp(1.5rem, 3.2vw, 2rem)', marginBottom: 'clamp(0.75rem, 1.5vh, 1rem)'}}>
                       {city}
                     </h2>
                    <div className="text-gray-600 font-medium" style={{fontSize: 'clamp(1.125rem, 2vw, 1rem)', gap: 'clamp(0.25rem, 0.5vh, 0.25rem)'}}>
                      <p>Republic of the Philippines</p>
                      <p>Province of {province}</p>
                    </div>
                    <div className="flex items-center justify-start gap-4 sm:gap-6 mt-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-sm text-gray-700 font-medium">{barangayPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="text-sm text-gray-700 font-medium">{barangayEmail}</span>
                      </div>
                        </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two columns for Mission/Vision and Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 gap-4 sm:gap-6 lg:gap-8">
              {/* Left Side - Mission & Vision */}
              <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
                <Card className="bg-white/95 backdrop-blur-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:shadow-2xl hero-card hover-yellow transition-all duration-300 cursor-pointer">
                  <CardHeader className="pb-0 pt-0 px-3 sm:px-6 gap-0">
                    <CardTitle className="text-primary text-sm sm:text-base lg:text-lg font-semibold">Our Mission</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 pb-3 px-3 sm:px-6 pt-0">
                     <p className="text-sm sm:text-sm lg:text-base text-pretty text-justify leading-snug -mt-2">
                       {mission}
                     </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:shadow-2xl hero-card hover-yellow transition-all duration-300 cursor-pointer">
                  <CardHeader className="pb-0 pt-0 px-3 sm:px-6 gap-0">
                    <CardTitle className="text-primary text-sm sm:text-base lg:text-lg font-semibold">Our Vision</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 pb-3 px-3 sm:px-6 pt-0">
                     <p className="text-sm sm:text-sm lg:text-base text-pretty text-justify leading-snug -mt-2">
                       {vision}
                     </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side - Barangay Services */}
              <div className="flex flex-col order-first lg:order-none" style={{gap: 'clamp(0.75rem, 1.5vh, 1rem)'}}>
                <Card className="bg-white/95 backdrop-blur-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98 hero-card">
                  <CardHeader className="pb-0 pt-0 px-3 sm:px-6 gap-0">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-primary text-sm sm:text-base lg:text-lg font-semibold">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                      Barangay Services
                </CardTitle>
              </CardHeader>
                  <CardContent className="space-y-1.5 pb-3 px-3 sm:px-6 pt-0 mt-0.5">
                <Link href="/clearances?type=barangay" className="w-full block -mt-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request Barangay Clearance"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Barangay Clearance
                  </Button>
                </Link>
                <Link href="/clearances?type=business" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request Business Clearance"
                  >
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Business Clearance
                  </Button>
                </Link>
                <Link href="/clearances?type=blotter" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="File a Blotter"
                  >
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Blotter
                  </Button>
                </Link>
                <Link href="/clearances?type=facility" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request Facility Use"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Facility Use
                  </Button>
                </Link>
                <Link href="/clearances?type=good-moral" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request Certificate of Good Moral"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Certificate of Good Moral
                  </Button>
                </Link>
                <Link href="/clearances?type=indigency" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request Certificate of Indigency"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Certificate of Indigency
                  </Button>
                </Link>
                <Link href="/clearances?type=residency" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request Certificate of Residency"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Certificate of Residency
                  </Button>
                </Link>
                <Link href="/clearances?type=register" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Register as Resident"
                  >
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Register as Resident
                  </Button>
                </Link>
                <Link href="/clearances?type=barangay-id" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request Barangay ID"
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Barangay ID
                  </Button>
                </Link>
                <Link href="/clearances?type=cso-accreditation" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Request CSO/NGOs Brgy. Accreditation"
                  >
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    CSO/NGOs Brgy. Accreditation
                  </Button>
                </Link>
                <Link href="/clearances?type=luntian" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover-yellow border-primary/20 text-left text-sm sm:text-sm font-medium h-8 sm:h-9 px-3 py-1 sm:py-2 cursor-pointer"
                    aria-label="Linis Ligtas Luntian Request Form"
                  >
                    <Leaf className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                    Linis Ligtas Luntian Request Form
                  </Button>
                </Link>
              </CardContent>
            </Card>
                </div>
                </div>
          </div>

          {/* Right Side - Barangay Captain */}
          <div className="flex flex-col items-center justify-start space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Captain Section */}
            <div className="flex flex-col items-center text-center w-full">
              <div className="relative mb-3 sm:mb-4">
                <Image
                  src="/captain.webp"
                  alt="Barangay Captain"
                  width={400}
                  height={500}
                  sizes="(max-width: 640px) 80vw, (max-width: 768px) 14rem, (max-width: 1024px) 18rem, 20rem"
                  className="w-4/5 h-auto mx-auto xs:w-56 xs:h-64 sm:w-64 sm:h-72 md:w-72 md:h-80 lg:w-80 lg:h-88 xl:w-88 xl:h-104 object-cover object-[center_40%] rounded-lg shadow-2xl"
                  priority
                />
              </div>

              <div className="space-y-0 w-full">
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-black text-balance text-primary uppercase tracking-wider leading-tight px-2">
                  {captainName}
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-medium">{captainPosition}</p>
              </div>
            </div>

            {/* Barangay Council Section */}
            <div className="w-full">
              <div className="w-full rounded-lg shadow-lg overflow-visible">
                <Image
                  src="/group.webp"
                  alt="Barangay Council"
                  width={400}
                  height={300}
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
              <h3 className="text-primary text-sm sm:text-base md:text-lg font-semibold text-center mt-3 px-2">
                Barangay Council
              </h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
