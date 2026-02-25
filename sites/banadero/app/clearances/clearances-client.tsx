'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@barangay/ui'
import { FileText, Building2, AlertCircle, Calendar, Award, Heart, Home, ArrowLeft, UserPlus, CheckCircle, User, Camera, X, Users, Leaf, CreditCard } from 'lucide-react'
import { submitClearance, searchResidents, calculateAge, type Resident, supabase, type BarangayConfig } from '@barangay/shared'

type ClearanceType = 
  | 'barangay'
  | 'business'
  | 'blotter'
  | 'facility'
  | 'good-moral'
  | 'indigency'
  | 'residency'
  | 'register'
  | 'cso-accreditation'
  | 'luntian'
  | 'barangay-id'

interface FormData {
  name: string
  [key: string]: string
}

const clearanceTypes = [
  { id: 'barangay' as ClearanceType, label: 'Barangay Clearance', icon: FileText },
  { id: 'business' as ClearanceType, label: 'Business Clearance', icon: Building2 },
  { id: 'blotter' as ClearanceType, label: 'Blotter', icon: AlertCircle },
  { id: 'facility' as ClearanceType, label: 'Facility Use', icon: Calendar },
  { id: 'good-moral' as ClearanceType, label: 'Certificate of Good Moral', icon: Award },
  { id: 'indigency' as ClearanceType, label: 'Certificate of Indigency', icon: Heart }, 
  { id: 'residency' as ClearanceType, label: 'Certificate of Residency', icon: Home },
  { id: 'barangay-id' as ClearanceType, label: 'Barangay ID', icon: CreditCard },
  { id: 'register' as ClearanceType, label: 'Register as Resident', icon: UserPlus },
  { id: 'cso-accreditation' as ClearanceType, label: 'CSO/NGO Accreditation', icon: Users },
  { id: 'luntian' as ClearanceType, label: 'Luntian Request Form', icon: Leaf },
]

// Custom Dropdown Component for multi-line text
function MultiSelectCheckboxes({ 
  id, 
  value, 
  options, 
  onChange, 
  required
}: { 
  id: string
  value: string
  options: string[]
  onChange: (value: string) => void
  required?: boolean
}) {
  // Parse selected values from comma-separated string
  const selectedValues = value ? value.split(', ').filter(v => v) : []

  const toggleOption = (option: string) => {
    let newSelected: string[]
    if (selectedValues.includes(option)) {
      newSelected = selectedValues.filter(v => v !== option)
    } else {
      newSelected = [...selectedValues, option]
    }
    onChange(newSelected.join(', '))
  }

  return (
    <div className="w-full border border-border rounded-md p-3 bg-background">
      <div className="space-y-2.5">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={() => toggleOption(option)}
              className="mt-0.5 w-4 h-4 border border-border rounded focus:ring-2 focus:ring-primary flex-shrink-0"
            />
            <span className="text-sm whitespace-normal break-words flex-1 font-sans font-normal" style={{ lineHeight: '1.4', fontWeight: 'normal', letterSpacing: 'normal' }}>
              {option}
            </span>
          </label>
        ))}
      </div>
      <input
        type="hidden"
        id={id}
        value={value}
        required={required}
      />
    </div>
  )
}

interface ClearancesClientProps {
  config: BarangayConfig
}

export function ClearancesClient({ config }: ClearancesClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Read type from URL parameter immediately (not in useEffect to avoid flash)
  const typeParam = searchParams.get('type')
  const initialType = typeParam && clearanceTypes.some(t => t.id === typeParam) 
    ? (typeParam as ClearanceType) 
    : null
  
  const [selectedType, setSelectedType] = useState<ClearanceType | null>(initialType)
  const [formData, setFormData] = useState<FormData>({ name: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Autocomplete state
  const [nameQuery, setNameQuery] = useState('')
  const [residents, setResidents] = useState<Resident[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedResidentIndex, setSelectedResidentIndex] = useState(-1)
  const [nameWasSelected, setNameWasSelected] = useState(false)
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [residentPhotoUrl, setResidentPhotoUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  // Image caching
  // photoUrlCacheRef removed — photo_url is now stored directly on the resident record
  
  // Camera capture state for registration
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Mark page as loaded and sync selectedType with URL changes
  useEffect(() => {
    // Mark clearances page as loaded to skip loading screen next time
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('clearances-loaded', 'true')
    }
    
    // Update selectedType if URL param changes
    const newTypeParam = searchParams.get('type')
    if (newTypeParam && clearanceTypes.some(t => t.id === newTypeParam)) {
      setSelectedType(newTypeParam as ClearanceType)
    }
  }, [searchParams])

  // Search residents when name query changes
  useEffect(() => {
    // Don't search if name was just selected
    if (nameWasSelected) return
    
    const searchTimeout = setTimeout(async () => {
      if (nameQuery.length >= 2) {
        const results = await searchResidents(nameQuery, config.id)
        setResidents(results as Resident[])
        setShowSuggestions(results.length > 0)

        // Prefetch photos for top results so they're instant when clicked
        results.slice(0, 5).forEach((r: any) => {
          if (r.photo_url) {
            const img = new window.Image()
            img.src = `/_next/image?url=${encodeURIComponent(r.photo_url)}&w=384&q=75`
          }
        })
      } else {
        setResidents([])
        setShowSuggestions(false)
      }
    }, 200) // Debounce 200ms

    return () => clearTimeout(searchTimeout)
  }, [nameQuery, nameWasSelected])

  // Set default citizenship when register type is selected
  useEffect(() => {
    if (selectedType === 'register' && !formData.citizenship) {
      setFormData(prev => ({ ...prev, citizenship: 'Filipino' }))
    }
  }, [selectedType])

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Enable scrolling for all clearances
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    document.body.style.height = 'auto'
    document.documentElement.style.height = 'auto'
    
    return () => {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
      document.body.style.height = 'auto'
      document.documentElement.style.height = 'auto'
    }
  }, [])

  // Reset image error and loading state when photo URL changes
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [residentPhotoUrl])

  // Clear captured photo when resident changes and has no photo on file
  useEffect(() => {
    if (selectedResidentId && selectedType !== 'register' && selectedType !== 'cso-accreditation') {
      if (!residentPhotoUrl && selectedType !== 'barangay-id' && selectedType !== 'luntian') {
        setCapturedPhoto(null)
      }
    }
  }, [selectedResidentId, selectedType, residentPhotoUrl])

  // Camera functions for registration photo capture
  const openCamera = async () => {
    setIsCameraOpen(true)
    try {
      console.log('[Camera] Requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 640 } 
      })
      console.log('[Camera] Stream obtained')
      streamRef.current = stream
      
      // Wait for video element to be in DOM
      requestAnimationFrame(() => {
        if (videoRef.current) {
          console.log('[Camera] Setting video srcObject')
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(err => {
            console.error('[Camera] Error playing video:', err)
          })
        } else {
          console.error('[Camera] Video ref is null')
        }
      })
    } catch (error) {
      console.error('[Camera] Error accessing camera:', error)
      setError('Unable to access camera. Please check permissions.')
      setIsCameraOpen(false)
    }
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedPhoto(photoData)
        closeCamera()
      }
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
    openCamera()
  }

  const removePhoto = () => {
    setCapturedPhoto(null)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Set video stream when camera opens
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [isCameraOpen])

  // Handle selecting a resident from suggestions
  const selectResident = (resident: Resident) => {
    const fullName = `${resident.first_name} ${resident.middle_name ? resident.middle_name + ' ' : ''}${resident.last_name}`.toUpperCase()
    setFormData(prev => ({ ...prev, name: fullName }))
    setNameQuery(fullName)
    setShowSuggestions(false)
    setSelectedResidentIndex(-1)
    setNameWasSelected(true)
    setSelectedResidentId(resident.id)

    // Search already returns all fields — render instantly, no extra fetch needed
    setSelectedResident(resident)
    setResidentPhotoUrl(resident.photo_url || null)
  }

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedResidentIndex(prev => 
        prev < residents.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedResidentIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedResidentIndex >= 0) {
      e.preventDefault()
      selectResident(residents[selectedResidentIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const getFormFields = (type: ClearanceType) => {
    switch (type) {
      case 'barangay':
        return [
          { 
            id: 'purpose', 
            label: 'Purpose', 
            type: 'select', 
            required: true,
            options: ['Reference', 'Job Application', 'Scholarship', 'Loan', 'Other']
          },
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
        ]
      case 'barangay-id':
        return [
          { id: 'contact_no', label: 'Contact No.', type: 'tel', required: true },
          { id: 'sss_no', label: 'SSS No.', type: 'text', required: false },
          { id: 'tin_no', label: 'TIN No.', type: 'text', required: false },
          { id: 'passport_no', label: 'Passport No.', type: 'text', required: false },
          { id: 'other_id_no', label: 'Other ID No.', type: 'text', required: false },
          { id: 'precinct_no', label: 'Precinct No.', type: 'text', required: false },
          { 
            id: 'occupation', 
            label: 'Occupation', 
            type: 'text', 
            required: false 
          },
          { id: 'contact_person', label: 'Contact Person', type: 'text', required: false },
          { id: 'cp_number', label: 'Contact Person No.', type: 'tel', required: false },
          { 
            id: 'blood_type', 
            label: 'Blood Type', 
            type: 'select', 
            required: false,
            options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
          },
        ]
      case 'business':
        return [
          { id: 'businessName', label: 'Business Name', type: 'text', required: true },
          { id: 'businessAddress', label: 'Business Address', type: 'text', required: true },
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
        ]
      case 'blotter':
        return [
          { id: 'age', label: 'Age', type: 'number', required: true },
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
          { id: 'address', label: 'Address', type: 'text', required: true },
          { 
            id: 'civilStatus', 
            label: 'Civil Status', 
            type: 'select', 
            required: true,
            options: ['Single', 'Married', 'Widowed', 'Divorced', 'Separated']
          },
          { id: 'respondentName', label: 'Respondent Name', type: 'text', required: true },
          { id: 'incidentDate', label: 'Date of Incident', type: 'date', required: true },
          { id: 'incidentTime', label: 'Time of Incident', type: 'time', required: true },
          { id: 'incidentLocation', label: 'Place of Incident', type: 'text', required: true },
          { 
            id: 'incidentType', 
            label: 'Type of Incident', 
            type: 'select', 
            required: true,
            options: ['Unjust Vexation', 'Physical Injury', 'Theft', 'Grave Threats', 'Property Damage', 'Harassment', 'Disturbance of Peace', 'Trespassing', 'Robbery', 'Defamation', 'Vandalism', 'Scam / Fraud', 'Coercion', 'Other']
          },
          { id: 'incidentDescription', label: 'Brief Description of the Incident', type: 'textarea', required: true },
        ]
      case 'facility':
        return [
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
          { 
            id: 'facility', 
            label: 'Facility', 
            type: 'select', 
            required: true,
            options: ['Basketball Court Day time (500 php/hour)', 'Basketball Court Night time (700 php/hour)']
          },
          { id: 'eventDate', label: 'Date', type: 'date', required: true },
          { id: 'startTime', label: 'Starting Time', type: 'time', required: true },
          { id: 'endTime', label: 'End Time', type: 'time', required: true },
          { id: 'purpose', label: 'Purpose', type: 'textarea', required: true },
          { id: 'participants', label: 'Number of participants', type: 'number', required: true },
          { id: 'equipment', label: 'Equipment Needed', type: 'text', required: false },
        ]
      case 'good-moral':
        return [
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
        ]
      case 'indigency':
        return [
          { id: 'purpose', label: 'Purpose', type: 'textarea', required: true },
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
        ]
      case 'residency':
        return [
          { id: 'yearResided', label: 'Year resided', type: 'number', required: true },
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
        ]
      case 'register':
        return [
          { id: 'firstName', label: 'First Name', type: 'text', required: true },
          { id: 'middleName', label: 'Middle Name', type: 'text', required: false },
          { id: 'lastName', label: 'Last Name', type: 'text', required: true },
          { 
            id: 'suffix', 
            label: 'Suffix', 
            type: 'select', 
            required: false,
            options: ['None', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V']
          },
          { id: 'birthdate', label: 'Birthdate', type: 'date', required: true },
          { 
            id: 'gender', 
            label: 'Gender', 
            type: 'select', 
            required: true,
            options: ['Male', 'Female']
          },
          { 
            id: 'civilStatus', 
            label: 'Civil Status', 
            type: 'select', 
            required: true,
            options: ['Single', 'Married', 'Widowed', 'Divorced', 'Separated']
          },
          { id: 'citizenship', label: 'Citizenship', type: 'text', required: true, placeholder: 'Filipino' },
          { 
            id: 'purok', 
            label: 'Purok', 
            type: 'select', 
            required: true,
            options: ['1', '2', '3', '4', '5', '6']
          },
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
        ]
      case 'cso-accreditation':
        return [
          // Organization Information
          { id: 'orgName', label: 'Complete Name of Organization', type: 'text', required: true },
          { id: 'orgAcronym', label: 'Acronym (if any)', type: 'text', required: false },
          { 
            id: 'orgType', 
            label: 'Type of Organization', 
            type: 'select', 
            required: true,
            options: [
              'Non-Government Organization',
              'People\'s Organization',
              'Sectoral Organization',
              'Faith-Based Organization',
              'Others'
            ]
          },
          { 
            id: 'orgNature', 
            label: 'Nature of Organization', 
            type: 'select', 
            required: true,
            options: [
              'Non-stock',
              'Non-profit',
              'Non-government',
              'Non-partisan',
              'Stock Corporation',
              'Profit Organization',
              'Government Organization',
              'Other'
            ]
          },
          
          // Registration Information
          { 
            id: 'registeringAgency', 
            label: 'Registering Agency', 
            type: 'select', 
            required: true,
            options: ['SEC', 'CDA', 'DOLE', 'Barangay (for community-based organizations)']
          },
          { id: 'registrationNo', label: 'Registration No.', type: 'text', required: true },
          { id: 'registrationDate', label: 'Date of Registration', type: 'date', required: true },
          
          // Office Address and Contact
          { id: 'officeAddress', label: 'Office Address', type: 'text', required: true },
          { id: 'contact', label: 'Contact Number', type: 'tel', required: true },
          { id: 'email', label: 'Email Address (if any)', type: 'email', required: false },
          
          // Officers (simplified for form - will be a table in actual display)
          { id: 'president', label: 'President Name', type: 'text', required: true },
          { id: 'presidentTenure', label: 'President Tenure', type: 'text', required: true },
          { id: 'vicePresident', label: 'Vice President Name', type: 'text', required: true },
          { id: 'vicePresidentTenure', label: 'Vice President Tenure', type: 'text', required: true },
          { id: 'secretary', label: 'Secretary Name', type: 'text', required: true },
          { id: 'secretaryTenure', label: 'Secretary Tenure', type: 'text', required: true },
          { id: 'treasurer', label: 'Treasurer Name', type: 'text', required: true },
          { id: 'treasurerTenure', label: 'Treasurer Tenure', type: 'text', required: true },
          { id: 'auditor', label: 'Auditor Name', type: 'text', required: true },
          { id: 'auditorTenure', label: 'Auditor Tenure', type: 'text', required: true },
          
          // Membership
          { id: 'totalMembers', label: 'Total Number of Members', type: 'number', required: true },
          { id: 'barangayMembers', label: 'Number of Members Residing in the Barangay', type: 'number', required: true },
          
          // Track Record/Areas of Advocacy
          { 
            id: 'advocacy', 
            label: 'Track Record/Areas of Advocacy (Check all applicable)', 
            type: 'select', 
            required: true,
            options: [
              'Social Welfare and Development',
              'Health and Nutrition',
              'Education and Youth Development',
              'Peace and Order/Public Safety',
              'Disaster Risk Reduction and Management',
              'Environmental Protection',
              'Livelihood/Economic Development',
              'Women/Children/PWD/Senior Citizens',
              'Others'
            ]
          },
          
          // Local Special Bodies
          { 
            id: 'specialBody', 
            label: 'Local Special Bodies/BBIs for Representation (As provided under RA 7160 and DILG issuances)', 
            type: 'select', 
            required: true,
            options: [
              'Barangay Development Council (BDC)',
              'Barangay Peace and Order Council (BPOC)',
              'Barangay Disaster Risk Reduction and Management Committee (BDRRMC)',
              'Barangay Council for the Protection of Children (BCPC)',
              'Barangay Anti-Drug Abuse Council (BADAC)',
              'Barangay Nutrition Committee (BNC)',
              'Other Barangay-Based Institution (specify)'
            ]
          },
        ]
      case 'luntian':
        return [
          { 
            id: 'requestedItems', 
            label: 'Requested items', 
            type: 'select', 
            required: true,
            options: [
              'Vegetable seeds',
              'Gardening materials / water containers',
              'Organic fertilizer / compost',
              'Cleaning tools / waste segregation materials',
              'Others'
            ]
          },
          { id: 'purposeOfRequest', label: 'Purpose of request', type: 'textarea', required: true },
          { id: 'contact', label: 'Contact number', type: 'tel', required: true },
        ]
      default:
        return []
    }
  }

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
    
    // If name field is manually changed, clear resident selection
    if (id === 'name') {
      setSelectedResidentId(null)
      setNameWasSelected(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    // Hide resident info immediately when submit is clicked
    setSelectedResident(null)
    setResidentPhotoUrl(null)

    try {
      if (!selectedType) {
        throw new Error('No clearance type selected')
      }

      // For registration and CSO accreditation, skip photo requirement
      if (selectedType === 'register') {
        // Check if photo is captured
        if (!capturedPhoto) {
          setIsSubmitting(false)
          setError('Please capture a photo before submitting')
          return
        }

        const response = await fetch('/api/register-resident', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            photo: capturedPhoto
          })
        })

        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Registration failed')

        setIsSubmitting(false)
        setSubmitted(true)
        
        // Clear resident info immediately when success shows
        setSelectedResident(null)
        setResidentPhotoUrl(null)
        setSelectedResidentId(null)
        setCapturedPhoto(null)
        
        // Redirect to home page after 5 seconds
        setTimeout(() => {
          router.push('/')
        }, 5000)
        return
      }

      // For CSO accreditation, use separate handling (no photo required)
      if (selectedType === 'cso-accreditation') {
        const response = await fetch('/api/submit-clearance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clearanceType: selectedType,
            name: formData.orgName || 'CSO Application',
            formData,
            residentId: null,
            capturedPhoto: null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to submit CSO accreditation')
        }

        setIsSubmitting(false)
        setSubmitted(true)
        
        // Redirect to home page after 5 seconds
        setTimeout(() => {
          router.push('/')
        }, 5000)
        return
      }

      // For Luntian request form, use separate handling (no photo required)
      if (selectedType === 'luntian') {
        const response = await fetch('/api/submit-clearance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clearanceType: selectedType,
            name: formData.name || 'Luntian Request',
            formData,
            residentId: selectedResidentId,
            capturedPhoto: null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to submit Luntian request')
        }

        setIsSubmitting(false)
        setSubmitted(true)
        
        // Redirect to home page after 5 seconds
        setTimeout(() => {
          router.push('/')
        }, 5000)
        return
      }

                      // For other clearances (except barangay-id), check if resident has photo or if photo was captured
                      if (selectedType !== 'barangay-id' && selectedResidentId && (!residentPhotoUrl || imageError) && !capturedPhoto) {
                        setIsSubmitting(false)
                        setError('Please capture a photo of the resident before submitting')
                        return
                      }

      // Submit clearance to Supabase via API (includes SMS notification)
      console.log('[Clearance] Submitting:', { type: selectedType, hasCapturedPhoto: !!capturedPhoto })
      
      const response = await fetch('/api/submit-clearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearanceType: selectedType,
          name: formData.name,
          formData,
          residentId: selectedResidentId,
          capturedPhoto: capturedPhoto || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit clearance')
      }

      setIsSubmitting(false)
      setSubmitted(true)
      
      // Clear resident info immediately when success shows
      setSelectedResident(null)
      setResidentPhotoUrl(null)
      setSelectedResidentId(null)
      setCapturedPhoto(null)
      
      // Redirect to home page after 5 seconds
      setTimeout(() => {
        router.push('/')
      }, 5000)
    } catch (err) {
      setIsSubmitting(false)
      setError(err instanceof Error ? err.message : 'Failed to submit form. Please try again.')
      console.error('Submission error:', err)
    }
  }

  const selectedTypeData = selectedType ? clearanceTypes.find(t => t.id === selectedType) : null
  const formFields = selectedType ? getFormFields(selectedType) : []

  return (
    <>
      <Header config={config} />
      <main className="px-4 sm:px-[5%]" style={{ 
        paddingTop: 'max(100px, min(20vh, 200px))', 
        paddingBottom: selectedType && selectedType !== 'register' ? (isMobile ? '20px' : '30px') : (isMobile ? '30px' : '40px'),
        minHeight: '100vh',
        overflow: 'visible',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%'
      }}>
        <div className="w-full max-w-[1600px] mx-auto" style={{ 
          overflow: 'visible', 
          paddingBottom: '0px',
          maxWidth: '100%'
        }}>
          <div className="text-center mb-6 sm:mb-8 lg:mb-10">
            <h1 className="font-black text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>Barangay Clearances & Certificates</h1>
            <p className="text-gray-600 font-medium" style={{fontSize: 'clamp(0.875rem, 1.5vw, 1rem)'}}>
              Select a clearance or certificate type to begin
            </p>
          </div>

          {!selectedType ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 p-8 lg:p-12 justify-items-center" style={{ margin: '0 auto', overflow: 'visible', maxWidth: '1600px' }}>
              {clearanceTypes.map((type) => {
                const Icon = type.icon
                return (
                  <div
                    key={type.id}
                    role="button"
                    tabIndex={0}
                    className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98 cursor-pointer rounded-lg border flex flex-col items-center justify-center text-center p-5 focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ width: '170px', height: '170px' }}
                    onClick={() => setSelectedType(type.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedType(type.id) } }}
                  >
                    <div className="flex items-center justify-center flex-shrink-0 mb-3">
                      <Icon className="h-14 w-14 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{type.label}</h3>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="relative mx-auto" style={{ overflow: 'visible', width: '100%', maxWidth: '100%' }}>
              {/* Fixed width container to prevent shifting */}
              <div 
                className="mx-auto transition-all duration-500 ease-in-out"
                style={{ 
                  width: selectedResident && selectedType !== 'register' && selectedType !== 'cso-accreditation' && !submitted 
                    ? 'calc(475px + 400px + 24px)' 
                    : '475px',
                  maxWidth: '100%',
                  overflow: 'visible'
                }}
              >
                <div className="flex justify-start items-start gap-6" style={{ overflow: 'visible' }}>
                  <div 
                    className="flex-shrink-0 w-full lg:w-auto"
                    style={{ 
                      overflow: 'visible', 
                      minWidth: 0,
                      maxWidth: '100%'
                    }}
                  >
                  <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:bg-white/98 h-full flex flex-col relative w-full lg:w-[475px]" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', marginBottom: selectedType === 'register' ? '40px' : undefined, minWidth: 0, overflow: 'visible', maxWidth: '100%' }}>
                      {!submitted && (
                        <CardHeader className="pb-0 pt-3 lg:pt-4 lg:px-6 px-4">
                          <div className="relative flex items-center justify-center">
                            {/* Back button on left side for all screen sizes */}
                            <div className="absolute left-0 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  router.push('/')
                                }}
                                className="hover:bg-primary/5 p-2.5 lg:p-1.5"
                              >
                                <ArrowLeft className="lg:w-6 lg:h-6 w-5 h-5" />
                              </Button>
                            </div>
                            {selectedTypeData && (
                              <CardTitle className="w-full text-center text-primary text-2xl font-bold">
                                {selectedTypeData.label}
                              </CardTitle>
                            )}
                          </div>
                        </CardHeader>
                      )}
                      <CardContent className="pt-0 flex-1 flex flex-col" style={{ paddingBottom: selectedType === 'register' ? '40px' : undefined, minWidth: 0, maxWidth: '100%', overflow: 'visible', boxSizing: 'border-box' }}>

                {submitted ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="flex justify-center">
                      <CheckCircle className="h-20 w-20 text-green-600" />
                    </div>
                    <p className="text-gray-600 text-lg">
                      {selectedType === 'register' 
                        ? 'Your registration has been submitted successfully. Pending admin approval.'
                        : selectedType === 'cso-accreditation'
                        ? 'CSO accreditation application submitted successfully. Pending admin approval.'
                        : selectedType === 'luntian'
                        ? 'Luntian request submitted successfully. Pending admin approval.'
                        : 'Form submitted successfully.'}
                    </p>
                  </div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6" style={{ minWidth: 0, maxWidth: '100%', overflow: 'visible', boxSizing: 'border-box' }}>
                    {/* Error message */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
                        {error}
                      </div>
                    )}

                    {/* Facility terms */}
                    {selectedType === 'facility' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs space-y-2 break-words" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <h4 className="font-bold text-sm">TERMS AND CONDITIONS</h4>
                        <ul className="list-disc pl-4 space-y-1 text-gray-700 break-words">
                          <li>The facility/equipment shall be used exclusively for the approved purpose indicated in the request form.</li>
                          <li>The requestor is responsible for maintaining cleanliness, orderliness, and proper conduct within the facility at all times.</li>
                          <li>Any damage, loss, or misuse of barangay property shall be charged to the requestor, who will be held accountable for repair or replacement costs.</li>
                          <li>The Barangay reserves the right to cancel, deny, or reschedule the approved request at any time if the facility is required for official or emergency use.</li>
                          <li>The requestor shall strictly comply with all barangay rules, regulations, and safety protocols governing the use of the facility.</li>
                          <li>The Barangay shall not be held liable for any accidents, injuries, or loss of personal property that may occur during the use of the facility.</li>
                        </ul>
                      </div>
                    )}

                    {/* Name field - required for all forms except register and cso-accreditation */}
                    {selectedType !== 'register' && selectedType !== 'cso-accreditation' && (
                    <div className="space-y-2 relative">
                      <label htmlFor="name" className="block text-sm font-semibold text-foreground">
                        {selectedType === 'blotter' ? 'Complainant Name' : 'Name'}
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        ref={nameInputRef}
                        id="name"
                        type="text"
                        required
                        value={nameQuery}
                        onChange={(e) => {
                          const value = e.target.value
                          setNameQuery(value)
                          handleInputChange('name', value)
                          // Reset flag when user types
                          if (nameWasSelected && value !== formData.name) {
                            setNameWasSelected(false)
                            setSelectedResident(null)
                            setResidentPhotoUrl(null)
                            setSelectedResidentId(null)
                          }
                          // Clear resident info when name is cleared
                          if (!value) {
                            setSelectedResident(null)
                            setResidentPhotoUrl(null)
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                          if (residents.length > 0 && !nameWasSelected) setShowSuggestions(true)
                        }}
                        className="w-full max-w-full px-4 py-2.5 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        style={{ boxSizing: 'border-box' }}
                        placeholder="Start typing to search residents..."
                        autoComplete="off"
                      />
                      
                      {/* Autocomplete suggestions */}
                      {showSuggestions && residents.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white/98 backdrop-blur-lg border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
                          {residents.slice(0, 5).map((resident, index) => (
                            <div
                              key={resident.id}
                              className={`px-4 py-3 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 ${
                                index === selectedResidentIndex
                                  ? 'bg-primary text-white shadow-md'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => selectResident(resident)}
                              onMouseEnter={() => setSelectedResidentIndex(index)}
                            >
                              <div className="font-semibold text-sm">
                                {resident.first_name} {resident.middle_name} {resident.last_name}
                              </div>
                              <div className={`text-xs mt-0.5 flex items-center gap-2 ${index === selectedResidentIndex ? 'text-white/90' : 'text-gray-500'}`}>
                                {resident.purok && (
                                  <span className="flex items-center gap-1">
                                    <Home className="h-3 w-3" />
                                    {resident.purok}
                                  </span>
                                )}
                                {resident.birthdate && (
                                  <span className="flex items-center gap-1">
                                    • Age {calculateAge(resident.birthdate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {residents.length > 5 && (
                            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 text-center">
                              +{residents.length - 5} more results
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )}

                    {/* Camera capture for registration */}
                    {selectedType === 'register' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-foreground">
                          Photo <span className="text-red-500">*</span>
                        </label>
                        
                        {!capturedPhoto && !isCameraOpen && (
                          <div 
                            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={openCamera}
                          >
                            <Camera className="h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600">Click to take a photo of the resident</p>
                          </div>
                        )}

                        {isCameraOpen && (
                          <div className="space-y-3">
                            <div className="relative rounded-lg overflow-hidden bg-black">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-auto"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={capturePhoto}
                                className="flex-1"
                              >
                                <Camera className="h-4 w-4 mr-2" />
                                Capture Photo
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={closeCamera}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {capturedPhoto && (
                          <div className="space-y-3">
                            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
                              <img
                                src={capturedPhoto}
                                alt="Captured resident photo"
                                className="w-full h-auto"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={retakePhoto}
                                className="flex-1"
                              >
                                <Camera className="h-4 w-4 mr-2" />
                                Retake Photo
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={removePhoto}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                      </div>
                    )}

                    {/* Dynamic form fields based on selected type */}
                    {formFields.map((field, fieldIndex) => (
                      <div key={field.id} className="space-y-2" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <label htmlFor={field.id} className="block text-sm font-semibold text-foreground">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            id={field.id}
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            rows={4}
                            maxLength={2000}
                            autoFocus={fieldIndex === 0}
                            className="w-full max-w-full px-4 py-2.5 border border-border rounded-md text-sm bg-background resize-vertical focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                            style={{ boxSizing: 'border-box', wordWrap: 'break-word', overflowWrap: 'break-word' }}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        ) : field.type === 'select' ? (
                          <>
                          {field.id === 'specialBody' || field.id === 'advocacy' || field.id === 'requestedItems' || field.id === 'vegetableSeeds' ? (
                            <>
                            <MultiSelectCheckboxes
                              id={field.id}
                              value={formData[field.id] || ''}
                              options={field.options || []}
                              onChange={(value) => handleInputChange(field.id, value)}
                              required={field.required}
                            />
                            {/* Vegetable seeds sub-selection within the same box */}
                            {field.id === 'requestedItems' && formData.requestedItems && formData.requestedItems.includes('Vegetable seeds') && (
                              <div className="mt-3 pl-6 border-l-2 border-primary/30">
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                  Select Vegetable Seeds:
                                  <span className="text-red-500 ml-1">*</span>
                                </label>
                                <MultiSelectCheckboxes
                                  id="vegetableSeeds"
                                  value={formData.vegetableSeeds || ''}
                                  options={['Pechay', 'Kangkong', 'Eggplant', 'Tomato', 'Others']}
                                  onChange={(value) => handleInputChange('vegetableSeeds', value)}
                                  required={false}
                                />
                                {formData.vegetableSeeds && formData.vegetableSeeds.includes('Others') && (
                                  <>
                                    <label htmlFor="vegetableSeedsDetails" className="block text-sm font-semibold text-foreground mt-2 mb-1">
                                      Please specify other vegetable seeds:
                                      <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <textarea
                                      id="vegetableSeedsDetails"
                                      required
                                      value={formData.vegetableSeedsDetails || ''}
                                      onChange={(e) => handleInputChange('vegetableSeedsDetails', e.target.value)}
                                      rows={2}
                                      maxLength={2000}
                                      className="w-full max-w-full px-4 py-2.5 border border-border rounded-md text-sm bg-background resize-vertical focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                                      style={{ boxSizing: 'border-box', wordWrap: 'break-word', overflowWrap: 'break-word' }}
                                      placeholder="Please specify other vegetable seeds..."
                                    />
                                  </>
                                )}
                              </div>
                            )}
                            </>
                          ) : (
                            <select
                              id={field.id}
                              required={field.required}
                              value={formData[field.id] || (field.id === 'suffix' ? 'None' : '')}
                              onChange={(e) => handleInputChange(field.id, e.target.value === 'None' ? '' : e.target.value)}
                              className="w-full max-w-full px-4 py-2.5 pr-10 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                              style={{ boxSizing: 'border-box' }}
                            >
                              {field.id === 'suffix' ? null : <option value="">Select an option</option>}
                              {field.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          )}
                          {(formData[field.id] === 'Other' || formData[field.id] === 'Others' || (formData[field.id] && formData[field.id].includes('Others'))) && (
                            <>
                              <label htmlFor={`${field.id}Details`} className="block text-sm font-semibold text-foreground mt-2 mb-1">
                                Please specify:
                                <span className="text-red-500 ml-1">*</span>
                              </label>
                              <textarea
                                id={`${field.id}Details`}
                                required
                                value={formData[`${field.id}Details`] || ''}
                                onChange={(e) => handleInputChange(`${field.id}Details`, e.target.value)}
                                rows={3}
                                maxLength={2000}
                                className="w-full max-w-full px-4 py-2.5 border border-border rounded-md text-sm bg-background resize-vertical focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                                style={{ boxSizing: 'border-box', wordWrap: 'break-word', overflowWrap: 'break-word' }}
                                placeholder="Please specify..."
                              />
                            </>
                          )}
                          </>
                        ) : field.type === 'checkbox' ? (
                          <div className="flex items-center gap-2">
                            <input
                              id={field.id}
                              type="checkbox"
                              checked={formData[field.id] === 'true'}
                              onChange={(e) => handleInputChange(field.id, e.target.checked.toString())}
                              className="w-4 h-4 border border-border rounded focus:ring-2 focus:ring-primary"
                            />
                            <label htmlFor={field.id} className="text-sm">{'checkboxLabel' in field ? String(field.checkboxLabel) : field.label}</label>
                          </div>
                        ) : field.type === 'time' && selectedType === 'facility' ? (
                          <div className="flex gap-2">
                            <select
                              required={field.required}
                              value={(() => {
                                const hour24 = parseInt(formData[field.id]?.split(':')[0] || '0')
                                if (hour24 === 0) return '12'
                                if (hour24 > 12) return (hour24 - 12).toString()
                                return hour24.toString()
                              })()}
                              onChange={(e) => {
                                const hour12 = parseInt(e.target.value)
                                const minutes = formData[field.id]?.split(':')[1] || '00'
                                const currentHour24 = parseInt(formData[field.id]?.split(':')[0] || '0')
                                const isPM = currentHour24 >= 12
                                
                                let hour24 = hour12
                                if (isPM) {
                                  hour24 = hour12 === 12 ? 12 : hour12 + 12
                                } else {
                                  hour24 = hour12 === 12 ? 0 : hour12
                                }
                                
                                handleInputChange(field.id, `${hour24.toString().padStart(2, '0')}:${minutes}`)
                              }}
                              className="w-20 px-3 py-2.5 pr-8 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer appearance-none bg-no-repeat bg-right"
                              style={{ 
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundSize: '1.5em 1.5em'
                              }}
                            >
                              <option value="">Hr</option>
                              {Array.from({ length: 12 }, (_, i) => {
                                const hour = i + 1
                                return <option key={hour} value={hour.toString()}>{hour}</option>
                              })}
                            </select>
                            <select
                              required={field.required}
                              value={formData[field.id]?.split(':')[1] || ''}
                              onChange={(e) => {
                                const hours = formData[field.id]?.split(':')[0] || '00'
                                const minutes = e.target.value
                                handleInputChange(field.id, `${hours}:${minutes}`)
                              }}
                              className="w-20 px-3 py-2.5 pr-8 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer appearance-none bg-no-repeat bg-right"
                              style={{ 
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundSize: '1.5em 1.5em'
                              }}
                            >
                              <option value="">Min</option>
                              <option value="00">00</option>
                              <option value="15">15</option>
                              <option value="30">30</option>
                              <option value="45">45</option>
                            </select>
                            <select
                              required={field.required}
                              value={(() => {
                                const hour = parseInt(formData[field.id]?.split(':')[0] || '0')
                                return hour >= 12 ? 'PM' : 'AM'
                              })()}
                              onChange={(e) => {
                                const hour12 = parseInt((() => {
                                  const hour24 = parseInt(formData[field.id]?.split(':')[0] || '0')
                                  if (hour24 === 0) return '12'
                                  if (hour24 > 12) return (hour24 - 12).toString()
                                  return hour24.toString()
                                })())
                                const minutes = formData[field.id]?.split(':')[1] || '00'
                                const isPM = e.target.value === 'PM'
                                
                                let hour24 = hour12
                                if (isPM) {
                                  hour24 = hour12 === 12 ? 12 : hour12 + 12
                                } else {
                                  hour24 = hour12 === 12 ? 0 : hour12
                                }
                                
                                handleInputChange(field.id, `${hour24.toString().padStart(2, '0')}:${minutes}`)
                              }}
                              className="w-20 px-3 py-2.5 pr-8 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer appearance-none bg-no-repeat bg-right"
                              style={{ 
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundSize: '1.5em 1.5em'
                              }}
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        ) : (
                          <input
                            id={field.id}
                            type={field.type}
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            onClick={(e) => {
                              if (field.type === 'date' && (e.target as HTMLInputElement).showPicker) {
                                (e.target as HTMLInputElement).showPicker()
                              }
                            }}
                            autoFocus={fieldIndex === 0}
                            className="w-full max-w-full px-4 py-2.5 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer"
                            style={{ boxSizing: 'border-box' }}
                            placeholder={'placeholder' in field ? field.placeholder : `Enter ${field.label.toLowerCase()}`}
                            autoComplete={selectedType === 'register' ? 'off' : undefined}
                          />
                        )}
                      </div>
                    ))}

                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                      <Button
                        type="submit"
                        disabled={
                          isSubmitting || 
                          (selectedType === 'register' && !capturedPhoto) ||
                          (selectedType !== 'register' && selectedType !== 'cso-accreditation' && selectedType !== 'luntian' && selectedType !== 'barangay-id' && selectedResidentId !== null && (!residentPhotoUrl || imageError) && !capturedPhoto)
                        }
                        className="flex-1 min-h-[44px]"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </>
                        ) : (
                          'Submit Form'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData({ name: '' })
                          setNameQuery('')
                          setResidents([])
                          setShowSuggestions(false)
                          setNameWasSelected(false)
                          setSelectedResidentId(null)
                          setSelectedResident(null)
                          setResidentPhotoUrl(null)
                          setSelectedResidentIndex(-1)
                          setCapturedPhoto(null)
                          closeCamera()
                        }}
                        disabled={isSubmitting}
                        className="min-h-[44px]"
                      >
                        Clear Form
                      </Button>
                    </div>
                  </form>
                )}
                  </CardContent>
                </Card>
                </div>

                {/* Resident Photo & Details Panel - Slides in from right */}
                <div 
                  className="hidden lg:block transition-all duration-500 ease-in-out flex-shrink-0"
                  style={{
                    width: selectedResident && selectedType !== 'register' && selectedType !== 'cso-accreditation' && !submitted ? '400px' : '0px',
                    opacity: selectedResident && selectedType !== 'register' && selectedType !== 'cso-accreditation' && !submitted ? 1 : 0,
                    overflow: 'hidden'
                  }}
                >
                  {selectedResident && selectedType !== 'register' && selectedType !== 'cso-accreditation' && !submitted && (
                    <div className="w-[400px] h-full">
                      <Card className="bg-white/95 backdrop-blur-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/98 h-full flex flex-col">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold">Resident Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1 flex flex-col">
                        <div className="flex justify-center relative w-48 h-48 mx-auto">
                          {capturedPhoto ? (
                            <img 
                              src={capturedPhoto} 
                              alt="Captured photo"
                              className="w-48 h-48 object-cover rounded-lg border-2 border-gray-200"
                            />
                          ) : residentPhotoUrl && !imageError ? (
                            <>
                              {!imageLoaded && (
                                <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-100 rounded-lg border-2 border-gray-200">
                                  <User className="w-16 h-16 text-gray-400 mb-2" />
                                  <span className="text-gray-400 text-sm">Loading...</span>
                                </div>
                              )}
                              <Image
                                src={residentPhotoUrl}
                                alt={`${selectedResident.first_name} ${selectedResident.last_name}`}
                                className={`object-cover rounded-lg border-2 border-gray-200 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                                width={192}
                                height={192}
                                quality={75}
                                loading="eager"
                                onLoad={() => setImageLoaded(true)}
                                onError={() => setImageError(true)}
                              />
                            </>
                          ) : selectedType !== 'barangay-id' ? (
                            <div 
                              className="flex flex-col justify-center items-center w-48 h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={openCamera}
                            >
                              <Camera className="w-12 h-12 text-gray-400 mb-2" />
                              <span className="text-gray-500 text-sm font-medium">Take Photo</span>
                              <span className="text-gray-400 text-xs mt-1">Click to open camera</span>
                            </div>
                          ) : (
                            <div className="flex flex-col justify-center items-center w-48 h-48 bg-gray-100 rounded-lg border-2 border-gray-200">
                              <User className="w-16 h-16 text-gray-400 mb-2" />
                              <span className="text-gray-400 text-sm">No photo available</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-semibold">Name:</span>{' '}
                            {selectedResident.first_name} {selectedResident.middle_name} {selectedResident.last_name} {selectedResident.suffix || ''}
                          </div>
                          {selectedResident.birthdate && (
                            <div>
                              <span className="font-semibold">Birthdate:</span>{' '}
                              {new Date(selectedResident.birthdate).toLocaleDateString()} 
                              {selectedResident.age && ` (Age: ${selectedResident.age})`}
                            </div>
                          )}
                          {selectedResident.gender && (
                            <div>
                              <span className="font-semibold">Gender:</span> {selectedResident.gender}
                            </div>
                          )}
                          {selectedResident.civil_status && (
                            <div>
                              <span className="font-semibold">Civil Status:</span> {selectedResident.civil_status}
                            </div>
                          )}
                          {selectedResident.citizenship && (
                            <div>
                              <span className="font-semibold">Citizenship:</span> {selectedResident.citizenship}
                            </div>
                          )}
                          {selectedResident.purok && (
                            <div>
                              <span className="font-semibold">Purok:</span> {selectedResident.purok}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                </div>
              </div>
              </div>
              
              {/* Mobile: Resident info card below form */}
              {selectedResident && selectedType !== 'register' && selectedType !== 'cso-accreditation' && !submitted && (
                <div className="lg:hidden mt-6 mb-8">
                  <div className="flex justify-center">
                    <Card className="bg-white/95 backdrop-blur-lg shadow-2xl w-full max-w-full flex flex-col">
                    <CardHeader className="pb-2 px-4">
                      <CardTitle className="text-base font-semibold">Resident Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 flex flex-col px-4 pb-4">
                      <div className="flex justify-center relative mx-auto flex-shrink-0" style={{ width: '128px', height: '128px', minWidth: '128px', minHeight: '128px' }}>
                        {capturedPhoto ? (
                          <img 
                            src={capturedPhoto} 
                            alt="Captured photo"
                            className="object-cover rounded-lg border-2 border-gray-200 flex-shrink-0"
                            style={{ width: '128px', height: '128px', minWidth: '128px', minHeight: '128px', maxWidth: '128px', maxHeight: '128px' }}
                          />
                        ) : residentPhotoUrl && !imageError ? (
                          <>
                            {!imageLoaded && (
                              <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-100 rounded-lg border-2 border-gray-200 flex-shrink-0" style={{ width: '128px', height: '128px', minWidth: '128px', minHeight: '128px' }}>
                                <User className="w-10 h-10 text-gray-400 mb-1" />
                                <span className="text-gray-400 text-xs">Loading...</span>
                              </div>
                            )}
                            <Image
                              src={residentPhotoUrl}
                              alt={`${selectedResident.first_name} ${selectedResident.last_name}`}
                              className={`object-cover rounded-lg border-2 border-gray-200 flex-shrink-0 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                              style={{ minWidth: '128px', minHeight: '128px', maxWidth: '128px', maxHeight: '128px' }}
                              width={128}
                              height={128}
                              quality={75}
                              loading="eager"
                              onLoad={() => setImageLoaded(true)}
                              onError={() => setImageError(true)}
                            />
                          </>
                        ) : selectedType !== 'barangay-id' ? (
                          <div 
                            className="flex flex-col justify-center items-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex-shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ width: '128px', height: '128px', minWidth: '128px', minHeight: '128px' }}
                            onClick={openCamera}
                          >
                            <Camera className="w-8 h-8 text-gray-400 mb-1" />
                            <span className="text-gray-500 text-xs font-medium">Take Photo</span>
                          </div>
                        ) : (
                          <div className="flex flex-col justify-center items-center bg-gray-100 rounded-lg border-2 border-gray-200 flex-shrink-0" style={{ width: '128px', height: '128px', minWidth: '128px', minHeight: '128px' }}>
                            <User className="w-10 h-10 text-gray-400 mb-1" />
                            <span className="text-gray-400 text-xs">No photo available</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs w-full">
                        <div className="break-words">
                          <span className="font-semibold">Name:</span>{' '}
                          {selectedResident.first_name} {selectedResident.middle_name} {selectedResident.last_name} {selectedResident.suffix || ''}
                        </div>
                        {selectedResident.birthdate && (
                          <div className="break-words">
                            <span className="font-semibold">Birthdate:</span>{' '}
                            {new Date(selectedResident.birthdate).toLocaleDateString()} 
                            {selectedResident.age && ` (Age: ${selectedResident.age})`}
                          </div>
                        )}
                        {selectedResident.gender && (
                          <div className="break-words">
                            <span className="font-semibold">Gender:</span> {selectedResident.gender}
                          </div>
                        )}
                        {selectedResident.civil_status && (
                          <div className="break-words">
                            <span className="font-semibold">Civil Status:</span> {selectedResident.civil_status}
                          </div>
                        )}
                        {selectedResident.citizenship && (
                          <div className="break-words">
                            <span className="font-semibold">Citizenship:</span> {selectedResident.citizenship}
                          </div>
                        )}
                        {selectedResident.purok && (
                          <div className="break-words">
                            <span className="font-semibold">Purok:</span> {selectedResident.purok}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera Modal */}
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closeCamera} style={{ alignItems: 'flex-start', paddingTop: '20vh' }}>
            <div className="relative bg-white rounded-lg p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold">Take Photo</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeCamera}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1"
                  size="sm"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCamera}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}
      </main>
    </>
  )
}
