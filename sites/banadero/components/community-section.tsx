'use client';

import { useEffect, useState } from 'react'
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@barangay/ui"
import {
  Users,
  Calendar,
  Heart,
  GraduationCap,
  Shield,
  Leaf,
  MapPin,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@barangay/shared"
import type { BarangayConfig } from "@barangay/shared"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Heart,
  GraduationCap,
  Leaf,
};

// Default data used as fallback when no config is provided
const defaultServices = [
  { id: 1, title: "Peace & Order", description: "Maintaining community safety through barangay tanod patrols", icon: "Shield" },
  { id: 2, title: "Health Services", description: "Free medical consultations and health programs", icon: "Heart" },
  { id: 3, title: "Education Support", description: "Scholarship programs for deserving students", icon: "GraduationCap" },
  { id: 4, title: "Environment", description: "Clean and green initiatives for a sustainable community", icon: "Leaf" },
];

const defaultOfficeHours = [
  { id: 1, day: "Monday - Friday", hours: "8:00 AM - 5:00 PM", is_closed: false },
  { id: 2, day: "Saturday", hours: "Closed", is_closed: true },
  { id: 3, day: "Sunday", hours: "Closed", is_closed: true },
];

const defaultContacts = [
  { id: 1, name: "Barangay Emergency", number: "0917 555 3323" },
  { id: 2, name: "Medical Emergency", number: "911" },
  { id: 3, name: "Fire Department", number: "0919 992 5484 / 0917 185 9984" },
  { id: 4, name: "UST Hospital", number: "0917 626 3621" },
  { id: 5, name: "BRTTH", number: "(052) 732 5555" },
  { id: 6, name: "Legazpi PNP", number: "0998 598 5926 / 0926 625 6247" },
  { id: 7, name: "Philippine Red Cross - Albay", number: "(052) 742-2199" },
  { id: 8, name: "Mental Health", number: "0917-899-8727" },
  { id: 9, name: "PDEA", number: "0998 598 5926" },
  { id: 10, name: "Legazpi 911", number: "0977 772 3909" },
  { id: 11, name: "ALECO", number: "0908 677 3393" },
  { id: 12, name: "LCWD", number: "0932 878 6141" },
  { id: 13, name: "CDRRMO", number: "0920 952 8188" },
];

const defaultOfficials = [
  { name: "Arthur R. Marco", position: "Punong Barangay", image: "/officers/arthur.webp" },
  { name: "Josefa B. Ballon", position: "Kagawad", image: "/officers/josefa.webp" },
  { name: "Clarence A. Castillo", position: "Kagawad", image: "/officers/clarance.webp" },
  { name: "Randy G. Loresto", position: "Kagawad", image: "/officers/randy.webp" },
  { name: "Ardi L. Marco", position: "Kagawad", image: "/officers/ardi.webp" },
  { name: "Annabelle L. Azicate", position: "Kagawad", image: "/officers/annabelle.webp" },
  { name: "Regie M. Ajero", position: "Kagawad", image: "/officers/regie.webp" },
  { name: "Carmelo A. Abache", position: "Kagawad", image: "/officers/carmelo.webp" },
  { name: "Franz Vincent B. Reynoso", position: "SK Chairman", image: "/officers/franz.webp" },
  { name: "Maria Angela A. Nalles", position: "Secretary", image: "/officers/maria.webp" },
  { name: "Judith H. Silvestre", position: "Treasurer", image: "/officers/judith.webp" },
];

interface FacilityBooking {
  id: string
  name: string
  form_data: {
    eventDate: string
    startTime: string
    endTime: string
    facility: string
    purpose?: string
  }
  created_at: string
}

interface CommunitySectionProps {
  config?: BarangayConfig
}

export function CommunitySection({ config }: CommunitySectionProps) {
  const services = (config?.services?.length ? config.services : defaultServices) as typeof defaultServices
  const officeHours = (config?.office_hours?.length ? config.office_hours : defaultOfficeHours) as typeof defaultOfficeHours
  const contacts = (config?.contacts?.length ? config.contacts : defaultContacts) as typeof defaultContacts
  const officials = (config?.officials?.length ? config.officials : defaultOfficials) as typeof defaultOfficials
  const events: Array<{ id: number; title: string; date: string; time: string; location: string; type: string }> = []
  const feedbackUrl = config?.google_form_urls?.feedback || '#'
  const rawColor = config?.primary_color || '#0007C6'
  const primaryColor = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#0007C6'
  const [bookings, setBookings] = useState<FacilityBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
    
    // Set up real-time subscription for facility bookings
    const channel = supabase
      .channel('facility_bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clearance_submissions',
          filter: 'clearance_type=eq.facility'
        },
        (payload) => {
          console.log('[Facility Bookings] Change detected:', payload)
          fetchBookings() // Refetch when there's a change
        }
      )
      .subscribe()

    // Check for date changes daily (at midnight) to remove past bookings
    const checkInterval = setInterval(() => {
      const now = new Date()
      // Check if it's close to midnight (within 5 minutes) or start of day
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        fetchBookings()
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => {
      supabase.removeChannel(channel)
      clearInterval(checkInterval)
    }
  }, [])

  async function fetchBookings() {
    try {
      const response = await fetch('/api/admin/facility-bookings')
      const result = await response.json()
      
      if (response.ok) {
        setBookings(result.data || [])
      } else {
        console.error('Failed to fetch facility bookings:', result.error)
        setBookings([])
      }
    } catch (error) {
      console.error('Error fetching facility bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  function formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }
  return (
    <section id="community" className="pt-6 sm:pt-8 lg:pt-10 pb-2 sm:pb-4 lg:pb-6">
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h2 className="font-black text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>COMMUNITY INFORMATION</h2>
          <p className="text-gray-600 font-medium" style={{fontSize: 'clamp(0.875rem, 1.5vw, 1rem)'}}>
            Everything you need to know about our barangay services, events, and community programs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {/* Services & Programs */}
          <div className="space-y-3 sm:space-y-4">
            <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98">
              <CardHeader className="pb-2">
                <CardTitle className="text-primary text-lg font-bold">Community Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {services.map((service) => {
                  const IconComponent = iconMap[service.icon] || Shield;
                  return (
                    <div key={service.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-balance text-sm">{service.title}</h3>
                        <p className="text-xs text-muted-foreground text-pretty leading-relaxed">{service.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98">
              <CardHeader>
                <CardTitle className="text-primary text-lg font-bold">Office Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {officeHours.map((hour) => (
                  <div key={hour.id} className="flex items-center gap-3">
                    <Clock className={`h-4 w-4 ${hour.is_closed ? 'text-muted-foreground' : 'text-primary'}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{hour.day}</p>
                      <p className={`text-xs ${hour.is_closed ? 'text-red-500' : 'text-muted-foreground'}`}>{hour.hours}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-primary text-lg font-bold">
                  <Calendar className="h-4 w-4" />
                  Covered Court Booked Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-4 text-center">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : bookings.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {bookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="border-l-4 border-primary pl-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-sm text-balance leading-tight">{booking.name}</h4>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{formatDate(booking.form_data.eventDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {formatTime(booking.form_data.startTime)} - {formatTime(booking.form_data.endTime)}
                            </span>
                          </div>
                          {booking.form_data.purpose && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span className="text-xs line-clamp-2">{booking.form_data.purpose}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 text-center">
                    <div>
                      <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm">No bookings scheduled</p>
                      <p className="text-xs mt-1 text-muted-foreground">Court is available for reservation</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <div className="space-y-3 sm:space-y-4">
            <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary text-lg font-bold">
                  <Calendar className="h-4 w-4" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div key={event.id} className="border-l-4 border-primary pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-balance text-sm">{event.title}</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-4 text-center">
                    <div>
                      <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm">No events scheduled</p>
                      <p className="text-xs mt-1">Check back later for upcoming events</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary text-lg font-bold">
                  <AlertCircle className="h-4 w-4" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{contact.name}</span>
                      <span className="text-xs">{contact.number}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Officials & Contact */}
          <div className="space-y-3 sm:space-y-4">
            <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary text-lg font-bold">
                  <Users className="h-4 w-4" />
                  Barangay Officials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {officials.map((official, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={official.image || "/placeholder.svg"}
                        alt={official.name}
                        fill
                        sizes="32px"
                        className="object-cover object-top"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-balance">{official.name}</p>
                      <p className="text-xs text-muted-foreground">{official.position}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-2xl transition-all duration-300" style={{backgroundColor: primaryColor}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-lg font-bold">
                  <Users className="h-4 w-4" />
                  Get Involved
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-white text-pretty leading-relaxed">
                  Join our community programs and help make our barangay a better place for everyone.
                </p>
                <div className="space-y-2">
                  <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="secondary" className="w-full bg-yellow-400 text-black hover:bg-yellow-400">
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
