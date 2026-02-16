'use client'

import { useEffect, useState, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Header } from '@/components/header'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, useToast } from '@barangay/ui'
import { FileText, Download, CheckCircle, XCircle, Clock, UserPlus, Building2, AlertCircle, Calendar, CreditCard, FolderOpen } from 'lucide-react'
import { supabase } from '@barangay/shared'
import type { BarangayConfig } from '@barangay/shared'

interface Submission {
  id: string
  clearance_type: string
  name: string
  form_data: any
  status: string
  document_url?: string
  created_at: string
  processed_at?: string
  processed_by?: string
}

interface Registration {
  id: string
  first_name: string
  middle_name?: string
  last_name: string
  suffix?: string
  birthdate: string
  age?: number
  gender: string
  civil_status: string
  citizenship: string
  purok: string
  contact?: string
  status: string
  created_at: string
  processed_at?: string
  processed_by?: string
}

interface AdminClientProps {
  config: BarangayConfig
}

export function AdminClient({ config }: AdminClientProps) {
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('pending')

  // Filter data client-side for instant updates
  const submissions = allSubmissions.filter(s => filter === 'all' || s.status === filter)
  const registrations = allRegistrations.filter(r => filter === 'all' || r.status === filter)
  const [activeTab, setActiveTab] = useState<'clearances' | 'registrations' | 'facility' | 'blotter' | 'barangay-id' | 'projects'>('clearances')
  const [clearanceCategory, setClearanceCategory] = useState<string>('all')
  const [generating, setGenerating] = useState<string | null>(null)
  const [removingSubmissions, setRemovingSubmissions] = useState<Set<string>>(new Set())
  const [removingRegistrations, setRemovingRegistrations] = useState<Set<string>>(new Set())
  const [removingRegistrationStatuses, setRemovingRegistrationStatuses] = useState<Map<string, string>>(new Map())
  const [newSubmissions, setNewSubmissions] = useState<Set<string>>(new Set())
  const [newRegistrations, setNewRegistrations] = useState<Set<string>>(new Set())
  const [expandingSubmissions, setExpandingSubmissions] = useState<Set<string>>(new Set())
  const [expandingRegistrations, setExpandingRegistrations] = useState<Set<string>>(new Set())
  const [animateEmptySubmissions, setAnimateEmptySubmissions] = useState(false)
  const [animateEmptyRegistrations, setAnimateEmptyRegistrations] = useState(false)
  const [highlightedSubmissions, setHighlightedSubmissions] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const filterRef = useRef(filter)
  const activeTabRef = useRef(activeTab)
  const removingRegistrationsRef = useRef(removingRegistrations)

  // Keep removing ref in sync
  useEffect(() => {
    removingRegistrationsRef.current = removingRegistrations
  }, [removingRegistrations])

  // Keep refs in sync
  useEffect(() => {
    filterRef.current = filter
    activeTabRef.current = activeTab
  }, [filter, activeTab])

  // Initial fetch
  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations()
    } else {
      fetchSubmissions()
    }
  }, [activeTab])

  // Fetch all data when filter changes (background update)
  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations(true)
    } else {
      fetchSubmissions(true)
    }
  }, [filter])

  // Get filtered submissions by category
  const getFilteredSubmissions = () => {
    let filtered = submissions

    switch (activeTab) {
      case 'clearances':
        filtered = submissions.filter(s =>
          ['barangay', 'business', 'good-moral', 'indigency', 'residency', 'cso-accreditation', 'luntian'].includes(s.clearance_type)
        )
        break
      case 'facility':
        filtered = submissions.filter(s => s.clearance_type === 'facility')
        break
      case 'blotter':
        filtered = submissions.filter(s => s.clearance_type === 'blotter')
        break
      case 'barangay-id':
        filtered = submissions.filter(s => s.clearance_type === 'barangay-id')
        break
      case 'projects':
        filtered = submissions.filter(s => s.clearance_type === 'projects')
        break
      default:
        break
    }

    return filtered
  }

  const displaySubmissions = activeTab === 'registrations' ? [] : getFilteredSubmissions()

  // Real-time subscriptions
  useEffect(() => {
    let submissionsChannel: ReturnType<typeof supabase.channel> | null = null
    let registrationsChannel: ReturnType<typeof supabase.channel> | null = null

    console.log('[Realtime] Setting up subscriptions...')

    // Subscribe to clearance_submissions changes
    submissionsChannel = supabase
      .channel('clearance_submissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clearance_submissions',
        },
        (payload) => {
          console.log('[Realtime] Clearance submission change detected:', payload)
          const currentFilter = filterRef.current
          const newRecord = payload.new as any
          const oldRecord = payload.old as any
          const eventType = payload.eventType || (payload as any).type

          // Handle INSERT - add new item with animation
          if (eventType === 'INSERT' || (!oldRecord && newRecord)) {
            setAllSubmissions(prev => {
              // Check if already exists
              if (prev.some(s => s.id === newRecord.id)) return prev
              // Add to beginning
              const updated = [newRecord as Submission, ...prev]
              // Mark as new for animation if it matches current filter
              if (currentFilter === 'all' || newRecord?.status === currentFilter) {
                setNewSubmissions(prev => new Set(prev).add(newRecord.id))
                // Expand card after brief delay to allow render
                setTimeout(() => {
                  setExpandingSubmissions(prev => new Set(prev).add(newRecord.id))
                }, 150)
                // Remove animation class after animation completes
                setTimeout(() => {
                  setNewSubmissions(prev => {
                    const next = new Set(prev)
                    next.delete(newRecord.id)
                    return next
                  })
                  setExpandingSubmissions(prev => {
                    const next = new Set(prev)
                    next.delete(newRecord.id)
                    return next
                  })
                }, 950)
              }
              return updated
            })
            return // Don't fetch, we already added it
          }
          // Handle UPDATE/DELETE - refresh list
          if (eventType === 'UPDATE' || eventType === 'DELETE' || (oldRecord && newRecord)) {
            if (currentFilter === 'all' ||
                newRecord?.status === currentFilter ||
                oldRecord?.status === currentFilter ||
                (oldRecord?.status !== newRecord?.status)) {
              console.log('[Realtime] Fetching submissions due to change')
              fetchSubmissions(true) // silent fetch
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Clearance submissions subscription status:', status)
      })

    // Subscribe to pending_registrations changes
    registrationsChannel = supabase
      .channel('pending_registrations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_registrations',
        },
        (payload: any) => {
          console.log('[Realtime] Registration change detected:', payload)
          console.log('[Realtime] Full payload:', JSON.stringify(payload, null, 2))
          const currentFilter = filterRef.current
          const newRecord = payload.new
          const oldRecord = payload.old
          const eventType = payload.eventType || payload.type || (payload as any).eventType

          console.log('[Realtime] Event type:', eventType, 'Has new:', !!newRecord, 'Has old:', !!oldRecord)
          console.log('[Realtime] Active tab:', activeTabRef.current, 'Current filter:', currentFilter)

          // Handle INSERT - add new item with animation
          if (eventType === 'INSERT' || (!oldRecord && newRecord)) {
            console.log('[Realtime] Processing INSERT for registration')
            setAllRegistrations(prev => {
              // Check if already exists
              if (prev.some(r => r.id === newRecord.id)) {
                console.log('[Realtime] Registration already exists, skipping')
                return prev
              }
              console.log('[Realtime] Adding new registration:', newRecord.id)
              // Add to beginning
              const updated = [newRecord as Registration, ...prev]
              // Mark as new for animation if it matches current filter
              if (currentFilter === 'all' || newRecord?.status === currentFilter) {
                setNewRegistrations(prev => new Set(prev).add(newRecord.id))
                // Expand card after brief delay to allow render
                setTimeout(() => {
                  setExpandingRegistrations(prev => new Set(prev).add(newRecord.id))
                }, 150)
                // Remove animation class after animation completes
                setTimeout(() => {
                  setNewRegistrations(prev => {
                    const next = new Set(prev)
                    next.delete(newRecord.id)
                    return next
                  })
                  setExpandingRegistrations(prev => {
                    const next = new Set(prev)
                    next.delete(newRecord.id)
                    return next
                  })
                }, 950)
              }
              return updated
            })
            return // Don't fetch, we already added it
          }
          // Handle UPDATE/DELETE
          if (eventType === 'UPDATE' || eventType === 'DELETE' || (oldRecord && newRecord)) {
            // Skip if this item is being animated out
            const recordId = newRecord?.id || oldRecord?.id
            if (recordId && removingRegistrationsRef.current.has(recordId)) {
              console.log('[Realtime] Skipping update for item being removed:', recordId)
              return
            }
            if (currentFilter === 'all' ||
                newRecord?.status === currentFilter ||
                oldRecord?.status === currentFilter ||
                (oldRecord?.status !== newRecord?.status)) {
              console.log('[Realtime] Fetching registrations due to change')
              fetchRegistrations(true) // silent fetch
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Registrations subscription status:', status)
        if (err) {
          console.error('[Realtime] Registrations subscription error:', err)
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to pending_registrations')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error - check if table has realtime enabled')
        }
      })

    return () => {
      console.log('[Realtime] Cleaning up subscriptions')
      if (submissionsChannel) {
        supabase.removeChannel(submissionsChannel)
      }
      if (registrationsChannel) {
        supabase.removeChannel(registrationsChannel)
      }
    }
  }, [])

  async function fetchSubmissions(silent = false) {
    if (!silent) setError(null)
    try {
      // Fetch all submissions, filter client-side
      const response = await fetch(`/api/admin/submissions?status=all`)
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      setAllSubmissions(result.data || [])
      const filtered = (result.data || []).filter((s: Submission) => filter === 'all' || s.status === filter)
      if (filtered.length > 0) {
        setAnimateEmptySubmissions(false)
      }
    } catch (error) {
      console.error('Error:', error)
      if (!silent) setError('Failed to load')
    }
  }

  async function fetchRegistrations(silent = false) {
    if (!silent) setError(null)
    try {
      // Fetch all registrations, filter client-side
      const response = await fetch(`/api/admin/registrations?status=all`)
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      // Preserve items that are being removed (to not interrupt animation)
      const newData = result.data || []
      const filtered = newData.filter((r: Registration) => filter === 'all' || r.status === filter)
      if (filtered.length > 0) {
        setAnimateEmptyRegistrations(false)
      }
      setAllRegistrations(prev => {
        const removingIds = removingRegistrationsRef.current
        if (removingIds.size === 0) {
          return newData
        }
        // Keep removing items from previous state WITH ORIGINAL STATUS, add new items that aren't being removed
        const removingItems = prev
          .filter(r => removingIds.has(r.id))
          .map(r => {
            // Preserve original status from the stored map
            const originalStatus = removingRegistrationStatuses.get(r.id)
            return originalStatus ? { ...r, status: originalStatus } : r
          })
        const otherItems = newData.filter((r: Registration) => !removingIds.has(r.id))
        return [...removingItems, ...otherItems]
      })
    } catch (error) {
      console.error('Error:', error)
      if (!silent) setError('Failed to load')
    }
  }

  async function generateDocument(submissionId: string) {
    setGenerating(submissionId)

    try {
      const response = await fetch('/api/admin/generate-clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, processedBy: 'Secretary' })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      // Update submission locally with document URL
      setAllSubmissions(prev => prev.map(s =>
        s.id === submissionId
          ? { ...s, status: 'approved', document_url: result.documentUrl }
          : s
      ))

      // Switch to approved tab
      setFilter('approved')

      // Highlight the newly generated submission
      setHighlightedSubmissions(prev => new Set(prev).add(submissionId))

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedSubmissions(prev => {
          const next = new Set(prev)
          next.delete(submissionId)
          return next
        })
      }, 3000)

      toast({
        title: 'Document generated',
        description: 'The clearance document has been generated successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to generate document',
        description: 'An error occurred while generating the document. Please try again.',
      })
    } finally {
      setGenerating(null)
    }
  }

  async function updateStatus(submissionId: string, status: string) {
    try {
      // Check if this is the last item in filtered view
      const isLastItem = submissions.length === 1

      // Mark for removal animation
      setRemovingSubmissions(prev => new Set(prev).add(submissionId))

      const response = await fetch('/api/admin/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, status })
      })

      if (!response.ok) {
        // Revert on error
        setRemovingSubmissions(prev => {
          const next = new Set(prev)
          next.delete(submissionId)
          return next
        })
        throw new Error()
      }

      // If this was the last item, set animation flag before removal
      if (isLastItem) {
        setAnimateEmptySubmissions(true)
      }

      // Remove from list after animation completes
      setTimeout(() => {
        setAllSubmissions(prev => {
          const filtered = prev.filter(s => s.id !== submissionId)
          return filtered
        })
        setRemovingSubmissions(prev => {
          const next = new Set(prev)
          next.delete(submissionId)
          return next
        })
      }, 400)

      toast({
        title: 'Status updated',
        description: (
          <span>
            The submission has been <span className="text-red-600 font-semibold">rejected</span>.
          </span>
        ),
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update',
        description: 'An error occurred while updating the status. Please try again.',
      })
    }
  }

  async function approveRegistration(registrationId: string) {
    try {
      // Check if this is the last item in filtered view
      const isLastItem = registrations.length === 1

      // If this was the last item, set animation flag before removal
      if (isLastItem) {
        setAnimateEmptyRegistrations(true)
      }

      // Store original status and mark for removal - update ref immediately for realtime check
      const registration = registrations.find(r => r.id === registrationId)
      if (registration) {
        setRemovingRegistrationStatuses(prev => new Map(prev).set(registrationId, registration.status))
      }
      // Update ref first (synchronous)
      removingRegistrationsRef.current = new Set(removingRegistrationsRef.current).add(registrationId)
      // Mark for removal animation
      setRemovingRegistrations(prev => new Set(prev).add(registrationId))

      const response = await fetch('/api/admin/approve-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, processedBy: 'Secretary' })
      })

      if (!response.ok) {
        // Revert on error
        setRemovingRegistrations(prev => {
          const next = new Set(prev)
          next.delete(registrationId)
          return next
        })
        setRemovingRegistrationStatuses(prev => {
          const next = new Map(prev)
          next.delete(registrationId)
          return next
        })
        removingRegistrationsRef.current.delete(registrationId)
        throw new Error()
      }

      // Remove from list after animation completes
      setTimeout(() => {
        setAllRegistrations(prev => prev.filter(r => r.id !== registrationId))
        setRemovingRegistrations(prev => {
          const next = new Set(prev)
          next.delete(registrationId)
          return next
        })
        setRemovingRegistrationStatuses(prev => {
          const next = new Map(prev)
          next.delete(registrationId)
          return next
        })
        removingRegistrationsRef.current.delete(registrationId)
      }, 400)

      toast({
        title: 'Registration approved',
        description: (
          <span>
            The resident has been <span className="text-green-600 font-semibold">approved</span> and added to the database.
          </span>
        ),
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to approve',
        description: 'An error occurred while approving the registration. Please try again.',
      })
    }
  }

  async function rejectRegistration(registrationId: string) {
    try {
      // Check if this is the last item in filtered view
      const isLastItem = registrations.length === 1

      // If this was the last item, set animation flag before removal
      if (isLastItem) {
        setAnimateEmptyRegistrations(true)
      }

      // Store original status and mark for removal - update ref immediately for realtime check
      const registration = registrations.find(r => r.id === registrationId)
      if (registration) {
        setRemovingRegistrationStatuses(prev => new Map(prev).set(registrationId, registration.status))
      }
      // Update ref first (synchronous)
      removingRegistrationsRef.current = new Set(removingRegistrationsRef.current).add(registrationId)
      // Mark for removal animation
      setRemovingRegistrations(prev => new Set(prev).add(registrationId))

      const response = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, status: 'rejected' })
      })

      if (!response.ok) {
        // Revert on error
        setRemovingRegistrations(prev => {
          const next = new Set(prev)
          next.delete(registrationId)
          return next
        })
        setRemovingRegistrationStatuses(prev => {
          const next = new Map(prev)
          next.delete(registrationId)
          return next
        })
        removingRegistrationsRef.current.delete(registrationId)
        throw new Error()
      }

      // Remove from list after animation completes
      setTimeout(() => {
        setAllRegistrations(prev => {
          const filtered = prev.filter(r => r.id !== registrationId)
          return filtered
        })
        setRemovingRegistrations(prev => {
          const next = new Set(prev)
          next.delete(registrationId)
          return next
        })
        setRemovingRegistrationStatuses(prev => {
          const next = new Map(prev)
          next.delete(registrationId)
          return next
        })
        removingRegistrationsRef.current.delete(registrationId)
      }, 400)

      toast({
        title: 'Registration rejected',
        description: (
          <span>
            The registration has been <span className="text-red-600 font-semibold">rejected</span>.
          </span>
        ),
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to reject',
        description: 'An error occurred while rejecting the registration. Please try again.',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', icon: Clock },
      processing: { variant: 'default', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle }
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  return (
    <>
      <Header config={config} />
      <main style={{ paddingLeft: '5%', paddingRight: '5%', paddingTop: 'max(100px, min(20vh, 200px))', paddingBottom: '40px', minHeight: '100vh', overflow: 'visible' }}>
        <div className="w-full max-w-[1600px] mx-auto" style={{ overflow: 'visible' }}>
          <div className="text-center mb-6 sm:mb-8 lg:mb-10">
            <h1 className="font-black text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>
              Admin Panel
            </h1>
            <p className="text-gray-600 font-medium" style={{fontSize: 'clamp(0.875rem, 1.5vw, 1rem)'}}>
              Manage clearance requests and resident registrations
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('clearances'); setFilter('pending'); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold transition-colors border-b-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'clearances' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="inline h-4 w-4 mr-1 sm:mr-2" />
              Clearances
            </button>
            <button
              onClick={() => { setActiveTab('registrations'); setFilter('pending'); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold transition-colors border-b-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'registrations' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="inline h-4 w-4 mr-1 sm:mr-2" />
              Registrations
            </button>
            <button
              onClick={() => { setActiveTab('facility'); setFilter('pending'); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold transition-colors border-b-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'facility' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="inline h-4 w-4 mr-1 sm:mr-2" />
              Facility Use
            </button>
            <button
              onClick={() => { setActiveTab('blotter'); setFilter('pending'); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold transition-colors border-b-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'blotter' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertCircle className="inline h-4 w-4 mr-1 sm:mr-2" />
              Blotter
            </button>
            <button
              onClick={() => { setActiveTab('barangay-id'); setFilter('pending'); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold transition-colors border-b-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'barangay-id' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="inline h-4 w-4 mr-1 sm:mr-2" />
              Barangay ID
            </button>
            <button
              onClick={() => { setActiveTab('projects'); setFilter('pending'); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold transition-colors border-b-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderOpen className="inline h-4 w-4 mr-1 sm:mr-2" />
              Projects
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['pending', 'approved', 'rejected', 'all'].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="sm:w-[100px] h-9 px-4"
                style={{
                  height: '36px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          {/* Content */}
          {error && (
            <Card className="bg-white mb-4 shadow-xl">
              <CardContent className="py-6 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm mb-2">{error}</p>
                <Button size="sm" onClick={() => activeTab === 'clearances' ? fetchSubmissions() : fetchRegistrations()}>Retry</Button>
              </CardContent>
            </Card>
          )}

          {activeTab !== 'registrations' && (
            displaySubmissions.length === 0 && removingSubmissions.size === 0 ? (
              <div
                onAnimationEnd={() => animateEmptySubmissions && setAnimateEmptySubmissions(false)}
                style={{
                  opacity: animateEmptySubmissions ? 0 : 1,
                  animation: animateEmptySubmissions ? 'fadeInSlide 0.8s ease-in-out forwards' : 'none'
                }}
              >
                <Card
                  className="bg-white shadow-xl"
                >
                <CardContent className="py-12 text-center text-muted-foreground">
                  No submissions found
                </CardContent>
              </Card>
              </div>
            ) : displaySubmissions.length > 0 ? (
              <div className="space-y-4">
                {displaySubmissions.map((submission) => {
                  const isRemoving = removingSubmissions.has(submission.id)
                  const isNew = newSubmissions.has(submission.id)
                  const isHighlighted = highlightedSubmissions.has(submission.id)

                  return (
                    <div
                      key={submission.id}
                      style={{
                        maxHeight: isRemoving ? '0px' : (isNew && !expandingSubmissions.has(submission.id)) ? '0px' : '5000px',
                        marginBottom: isRemoving ? '0px' : undefined,
                        paddingTop: isRemoving ? undefined : (isNew && !expandingSubmissions.has(submission.id)) ? '0px' : undefined,
                        paddingBottom: isRemoving ? undefined : (isNew && !expandingSubmissions.has(submission.id)) ? '0px' : undefined,
                        overflow: 'hidden',
                        transition: isRemoving
                          ? 'max-height 0.4s ease-out, margin-bottom 0.4s ease-out'
                          : 'max-height 0.8s ease-in-out, margin-bottom 0.8s ease-in-out, padding-top 0.8s ease-in-out, padding-bottom 0.8s ease-in-out'
                      }}
                    >
                      <Card
                        className="bg-white shadow-xl hover:shadow-2xl"
                        style={{
                          opacity: isRemoving ? 0 : (isNew && !expandingSubmissions.has(submission.id)) ? 0 : 1,
                          transform: isRemoving
                            ? 'translateY(-20px) scale(0.95)'
                            : (isNew && !expandingSubmissions.has(submission.id))
                            ? 'translateY(-10px) scale(0.98)'
                            : 'translateY(0) scale(1)',
                          transition: isRemoving
                            ? 'opacity 0.4s ease-out, transform 0.4s ease-out'
                            : 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out, background-color 0.3s ease-in-out',
                          pointerEvents: isRemoving ? 'none' : 'auto',
                          backgroundColor: isHighlighted ? 'rgb(254, 252, 232)' : 'white',
                          border: isHighlighted ? '2px solid rgb(250, 204, 21)' : undefined
                        }}
                      >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                            <span className="truncate">{submission.name}</span>
                          </CardTitle>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(submission.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="mb-3 text-xs sm:text-sm text-muted-foreground">
                        <span className="font-semibold">Submitted:</span> {new Date(submission.created_at).toLocaleString()}
                      </div>
                      <details className="mb-4">
                        <summary className="cursor-pointer text-xs sm:text-sm font-semibold mb-2 hover:text-primary">View Details</summary>
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48 border">{JSON.stringify(submission.form_data, null, 2)}</pre>
                      </details>
                      <div className="flex gap-2 flex-wrap">
                        {submission.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => generateDocument(submission.id)} disabled={generating === submission.id}>
                              {generating === submission.id ? 'Generating...' : 'Generate Document'}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => updateStatus(submission.id, 'rejected')}>
                              Reject
                            </Button>
                          </>
                        )}
                        {submission.document_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(submission.document_url, '_blank')}>
                            <Download className="h-4 w-4 mr-1" />View Document
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    </div>
                  )
                })}
              </div>
            ) : null
          )}

          {(activeTab as 'clearances' | 'registrations') === 'registrations' && (
            registrations.length === 0 && removingRegistrations.size === 0 ? (
              <div
                onAnimationEnd={() => animateEmptyRegistrations && setAnimateEmptyRegistrations(false)}
                style={{
                  opacity: animateEmptyRegistrations ? 0 : 1,
                  animation: animateEmptyRegistrations ? 'fadeInSlide 0.8s ease-in-out forwards' : 'none'
                }}
              >
                <Card
                  className="bg-white shadow-xl"
                >
                <CardContent className="py-12 text-center text-muted-foreground">
                  No registrations found
                </CardContent>
              </Card>
              </div>
            ) : registrations.length > 0 ? (
              <div className="space-y-4">
                {registrations.map((registration) => {
                  const isRemoving = removingRegistrations.has(registration.id)
                  const isNew = newRegistrations.has(registration.id)
                  // Get the status to use for display - prefer stored original status if removing
                  const displayStatus = isRemoving
                    ? (removingRegistrationStatuses.get(registration.id) || registration.status)
                    : registration.status

                  return (
                    <div
                      key={registration.id}
                      style={{
                        maxHeight: isRemoving ? '0px' : (isNew && !expandingRegistrations.has(registration.id)) ? '0px' : '5000px',
                        marginBottom: isRemoving ? '0px' : undefined,
                        paddingTop: isRemoving ? undefined : (isNew && !expandingRegistrations.has(registration.id)) ? '0px' : undefined,
                        paddingBottom: isRemoving ? undefined : (isNew && !expandingRegistrations.has(registration.id)) ? '0px' : undefined,
                        overflow: 'hidden',
                        transition: isRemoving
                          ? 'max-height 0.4s ease-out, margin-bottom 0.4s ease-out'
                          : 'max-height 0.8s ease-in-out, margin-bottom 0.8s ease-in-out, padding-top 0.8s ease-in-out, padding-bottom 0.8s ease-in-out'
                      }}
                    >
                      <Card
                        className="bg-white shadow-xl hover:shadow-2xl"
                        style={{
                          opacity: isRemoving ? 0 : (isNew && !expandingRegistrations.has(registration.id)) ? 0 : 1,
                          transform: isRemoving
                            ? 'translateY(-20px) scale(0.95)'
                            : (isNew && !expandingRegistrations.has(registration.id))
                            ? 'translateY(-10px) scale(0.98)'
                            : 'translateY(0) scale(1)',
                          transition: isRemoving
                            ? 'opacity 0.4s ease-out, transform 0.4s ease-out'
                            : 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
                          pointerEvents: isRemoving ? 'none' : 'auto'
                        }}
                      >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                            <span className="truncate">{registration.first_name} {registration.middle_name} {registration.last_name} {registration.suffix}</span>
                          </CardTitle>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(registration.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 text-xs sm:text-sm">
                        <div><span className="font-semibold">Birthdate:</span> {registration.birthdate} (Age: {registration.age})</div>
                        <div><span className="font-semibold">Gender:</span> {registration.gender}</div>
                        <div><span className="font-semibold">Civil Status:</span> {registration.civil_status}</div>
                        <div><span className="font-semibold">Purok:</span> {registration.purok}</div>
                        {registration.contact && <div><span className="font-semibold">Contact:</span> {registration.contact}</div>}
                        <div><span className="font-semibold">Submitted:</span> {new Date(registration.created_at).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(isRemoving || displayStatus === 'pending') && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveRegistration(registration.id)}
                              disabled={isRemoving}
                              className={isRemoving ? 'opacity-100' : ''}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectRegistration(registration.id)}
                              disabled={isRemoving}
                              className={isRemoving ? 'opacity-100' : ''}
                            >
                              <XCircle className="h-4 w-4 mr-1" />Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    </div>
                  )
                })}
              </div>
            ) : null
          )}
        </div>
      </main>
    </>
  )
}
