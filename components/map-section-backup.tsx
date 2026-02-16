"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"

interface Establishment {
  id: string
  name: string
  image: string
  x: number
  y: number
  color: string
}

export function MapSection() {
  const [hoveredEstablishment, setHoveredEstablishment] = useState<Establishment | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Define establishments with their coordinates and images
  const establishments: Establishment[] = [
    { id: "rect1", name: "AGO Medical Hospital", image: "/establishments/ago.webp", x: 737.67, y: 514.66, color: "#EF4444" }, // Red
    { id: "rect2", name: "Basketball Court", image: "/placeholder.svg", x: 1487.54, y: 1924.16, color: "#F97316" }, // Orange
    { id: "rect3", name: "Water Refilling Station", image: "/placeholder.svg", x: 974.99, y: 927.58, color: "#3B82F6" }, // Blue
    { id: "rect4", name: "Basketball Court", image: "/placeholder.svg", x: 2858.44, y: 944, color: "#F97316" }, // Orange
    { id: "rect5", name: "Barangay Hall", image: "/placeholder.svg", x: 864.56, y: 748.56, color: "#10B981" }, // Green
  ]

  // Legend items - unique establishments
  const legendItems = [
    { name: "AGO Medical Hospital", color: "#EF4444" },
    { name: "Basketball Court", color: "#F97316" },
    { name: "Water Refilling Station", color: "#3B82F6" },
    { name: "Barangay Hall", color: "#10B981" },
  ]

  // Function to darken a hex color
  const darkenColor = (hex: string, percent: number = 20): string => {
    const num = parseInt(hex.replace("#", ""), 16)
    const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)))
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - percent / 100)))
    const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - percent / 100)))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  const getScaledPosition = (clientX: number, clientY: number) => {
    // Get the page wrapper to check for scaling
    const wrapper = document.getElementById('page-wrapper')
    if (wrapper) {
      const transform = window.getComputedStyle(wrapper).transform
      if (transform && transform !== 'none') {
        // Extract scale from transform matrix
        const matrix = transform.match(/matrix\(([^)]+)\)/)
        if (matrix) {
          const values = matrix[1].split(',')
          const scale = parseFloat(values[0]) // First value is scaleX
          
          // Get wrapper's bounding rect to account for transform origin
          const rect = wrapper.getBoundingClientRect()
          
          // Adjust position based on scale
          return {
            x: clientX,
            y: clientY
          }
        }
      }
    }
    return { x: clientX, y: clientY }
  }

  const handleRectHover = (establishment: Establishment, event: React.MouseEvent<SVGRectElement | SVGPolygonElement>) => {
    const pos = getScaledPosition(event.clientX, event.clientY)
    setPopupPosition(pos)
    setHoveredEstablishment(establishment)
    // Darken color on hover
    if (event.currentTarget) {
      const darkerColor = darkenColor(establishment.color, 25)
      event.currentTarget.setAttribute('fill', darkerColor)
      event.currentTarget.setAttribute('fillOpacity', '0.5')
    }
  }

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement | SVGPolygonElement>) => {
    if (hoveredEstablishment) {
      const pos = getScaledPosition(event.clientX, event.clientY)
      setPopupPosition(pos)
    }
  }

  const handleRectLeave = (event: React.MouseEvent<SVGRectElement | SVGPolygonElement>) => {
    setHoveredEstablishment(null)
    // Reset to original color
    if (event.currentTarget) {
      const dataId = event.currentTarget.getAttribute('data-id')
      const establishment = establishments.find(e => e.id === dataId)
      if (establishment) {
        event.currentTarget.setAttribute('fill', establishment.color)
        event.currentTarget.setAttribute('fillOpacity', '0.3')
      }
    }
  }

  return (
    <section 
      className="w-full relative"
      style={{ paddingTop: 'clamp(3rem, 6vh, 5rem)', paddingBottom: 'clamp(2rem, 4vh, 3rem)' }}
    >
      <div className="w-full max-w-[1300px] mx-auto">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h2 className="font-black text-primary leading-none tracking-tight" style={{fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: 'clamp(0.5rem, 1vh, 0.75rem)'}}>
            Barangay Map
          </h2>
        </div>
        
        <Card className="bg-white/95 backdrop-blur-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-0">
            <div className="w-full flex items-center justify-center relative">
              <svg 
                viewBox="380 240 2850 2100"
                className="w-full h-auto"
                style={{ maxHeight: "62vh", display: "block" }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <style>{`
                    .cls-1 {
                      fill: #fff;
                    }
                    .cls-1, .cls-2 {
                      stroke: #000;
                      stroke-miterlimit: 10;
                      stroke-width: 4px;
                    }
                    .cls-2 {
                      fill: none;
                    }
                    .hoverable-rect {
                      stroke: #000;
                      stroke-miterlimit: 10;
                      stroke-width: 4px;
                      transition: fill 0.2s, fill-opacity 0.2s;
                      pointer-events: all;
                    }
                    .hoverable-rect:hover {
                      fill-opacity: 0.6 !important;
                    }
                  `}</style>
                </defs>
                <path className="cls-1" d="M575.06,1314.27l6.32-320.74c-.67,3.38-1.05,5.34-1.05,5.34l-6.42,344.13c1.32,0,.95-28.77,1.15-28.72Z"/>
                <path className="cls-1" d="M573.93,1341.49l-18.89,1012.18,19.48-1012.2c-.2,0-.39,0-.59.01Z"/>
                <path className="cls-2" d="M698.07,1758.05c.18,197.75,2.18,396.75,3.32,594.76"/>
                <path className="cls-2" d="M696.03,1338.32c.17,132.25,1.17,264.25,1.93,395.99"/>
                <path className="cls-2" d="M626.45,1338.85c1.45-93.88,2.76-210.27,3.76-304.27,21,1,43-2,64,1,1,93,1,210.67,1.73,304.07"/>
                <path className="cls-2" d="M621,1735.12c.2-132.54,4.2-264.54,5.44-397.73"/>
                <path className="cls-2" d="M620.7,1757.3c-.44,51.5-6.9,543.52-7.61,595.51"/>
                <path className="cls-2" d="M894.51,1030.49c259.7-7.92,519.7-13.92,779.7-22.92,14,5,27,10,41,14,273-10,545-23,818-33,3-8,6-17,9.36-25.45"/>
                <path className="cls-2" d="M725.71,1035.41c48.5-1.84,95.5-2.84,143.92-4.19"/>
                <path className="cls-2" d="M696.45,994.96c-7.83.23-15.76.4-23.78.51-10.64.15-21.12.2-31.43.14,1.16-6.63,0,0,0,0,11.96-67.04,23.96-133.04,34.92-199.8,2.38,25.74-.02.09,0,0,2.78,27.06,5.46,54.31,8.04,81.76,3.67,38.94,7.07,77.54,10.21,115.8"/>
                <path className="cls-2" d="M878.93,992.17c-51.73.41-103.73,1.41-156.07,2.28"/>
                <path className="cls-2" d="M2539.02,973.11c-273.81,7.46-546.81,18.46-820.81,26.46-3,0-5-1-8-2-14-6-27-13-41-17-259,3-517,9-775.57,11.38"/>
                <polyline className="cls-2" points="641.24 756.02 676.17 617.14 668.04 304.45"/>
                <line className="cls-2" x1="628.25" y1="304.45" x2="641.24" y2="751.15"/>
                <path className="cls-2" d="M735.5,2273.93c.24,26.58.47,53.16.71,79.74"/>
                <path className="cls-2" d="M727.45,1339.65c2.75,306.57,4.75,612.2,7.9,918.51,0,.36.14,17.23.14,17.59"/>
                <path className="cls-2" d="M725.16,1034.02c.05,92.55,2.25,215.1,2.31,307.62"/>
                <path className="cls-2" d="M719.08,304.54c2.24,231.13,3.24,461.13,5.77,691.84"/>
                <line className="cls-2" x1="621.01" y1="1760.05" x2="697.89" y2="1760.05"/>
                <line className="cls-2" x1="621.01" y1="1733.55" x2="697.89" y2="1733.55"/>
                <polyline className="cls-1" points="595.29 304.54 602.2 888.71 581.37 993.53"/>
                <path className="cls-2" d="M871.69,1338.89c2.52,131.69,2.52,264.69,5.06,396.62-4.82,0,0-.08,0,0-48.54.06-96.54.06-145.97,0"/>
                <path className="cls-2" d="M867.77,1031.27c.44,95.3,3.76,213.94,3.95,309.08"/>
                <polyline className="cls-2" points="730.78 1758.12 921.97 1758.12 942.87 1785.85 988.95 1785.85 1003.46 1771.99 1166.86 1771.99 1166.86 1792.25 1225.31 1875.45 1472.75 1875.45 1533.76 1910.43"/>
                <path className="cls-2" d="M900.19,1340.29c.09,99.19,3.09,206.28,3.45,305.27"/>
                <path className="cls-2" d="M895.94,1031.27c1.34,94.21,1.74,215.38,4.25,309.02"/>
                <line className="cls-2" x1="950.98" y1="1173.56" x2="897.35" y2="1141.64"/>
                <polyline className="cls-2" points="950.98 1173.56 1064.46 1240.19 1169.59 1165.72 1169.59 1022.08"/>
                <path className="cls-2" d="M1186.02,1341.17c1.26,97.31-1.74,194.31,4.26,291.31,3,53,7,105,12,158,4,7,10,12,16,18,2,3,4,6,6,8s5,4,7,6,3,5,5,7c2,1,4,4,5,4,79,3,157,1,236,1,25,16,51,32,76.1,48.64"/>
                <path className="cls-2" d="M1183.48,1022.08c1.81,97.41,1.03,223.11,2.55,319.87"/>
                <polyline className="cls-2" points="1070.44 1312.72 1070.44 1295.65 1051.67 1278.59 1051.67 1260.67 897.76 1173.65"/>
                <polyline className="cls-2" points="895.94 991.92 892.93 833.69 917.67 833.69 917.67 748.56 864.56 748.56 864.56 833.32 872.2 833.43 891.12 833.69"/>
                <line className="cls-2" x1="876.75" y1="991.92" x2="874.02" y2="835.14"/>
                <rect 
                  className="hoverable-rect" 
                  x="864.56" 
                  y="748.56" 
                  width="53.11" 
                  height="84.76"
                  fill={establishments[4].color}
                  fillOpacity="0.3"
                  data-id={establishments[4].id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleRectHover(establishments[4], e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={(e) => handleRectLeave(e)}
                />
                <polyline className="cls-2" points="1105.36 1313.87 1173.03 1530.54 1170.89 1339.12"/>
                <polyline className="cls-2" points="1170.91 1313.95 1169.62 1183.3 1097.21 1237.71 1089.39 1269.36 1105.39 1313.95"/>
                <rect 
                  className="hoverable-rect" 
                  x="737.67" 
                  y="514.66" 
                  width="79.6" 
                  height="122.69"
                  fill={establishments[0].color}
                  fillOpacity="0.3"
                  data-id={establishments[0].id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleRectHover(establishments[0], e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={(e) => handleRectLeave(e)}
                />
                <rect 
                  className="hoverable-rect" 
                  x="1487.54" 
                  y="1924.16" 
                  width="119.44" 
                  height="50.77"
                  fill={establishments[1].color}
                  fillOpacity="0.3"
                  data-id={establishments[1].id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleRectHover(establishments[1], e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={(e) => handleRectLeave(e)}
                />
                <polygon 
                  className="hoverable-rect" 
                  points="974.99 968.18 917.67 968.63 917.67 927.58 974.99 927.58 974.99 968.18"
                  fill={establishments[2].color}
                  fillOpacity="0.3"
                  data-id={establishments[2].id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleRectHover(establishments[2], e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={(e) => handleRectLeave(e)}
                />
                <rect 
                  className="hoverable-rect" 
                  x="2858.44" 
                  y="944" 
                  width="99.41" 
                  height="42.34" 
                  transform="translate(-92.97 1583.38) rotate(-30)"
                  fill={establishments[3].color}
                  fillOpacity="0.3"
                  data-id={establishments[3].id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleRectHover(establishments[3], e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={(e) => handleRectLeave(e)}
                />
                <polyline className="cls-2" points="719.96 398.65 1320.21 781.69 1863.21 897.32 2396.98 809.38 2564.73 942.71 2813.14 935.71 3034.9 797.44 3189.5 402.83"/>
                <path className="cls-2" d="M720.2,425.67c186.08,121.81,363.08,237.81,558.08,365.81,9,7,19,12,27,19,87,16,170,36,261,55,33,6,63,11,95,20,34,8,66,12,100,21,30,7,59,10,88,18,177-28,349-56,530-86,2,0,5-1,7,1l5,5c10,9,21,15,31,24,21,17,41,31,63,47,3,2,4,5,7,7,8,6,15,11,24,17,13,10,24,19,36,28,89-3,178-5,267.22-8.24l236.56-144.18,160.8-415.4"/>
                <polyline className="cls-2" points="903.64 1644.93 903.64 1735.56 927.89 1735.56 950.84 1765.94 988.1 1765.94 1002.1 1752.53 1167.83 1752.83 1155.97 1563.22 1081.38 1338.89"/>
                <line className="cls-2" x1="1070.44" y1="1311.83" x2="1082.14" y2="1341.17"/>
                <line className="cls-2" x1="1170.91" y1="1313.06" x2="1170.91" y2="1341.17"/>
              </svg>
              
              {/* Legend */}
              <div className="absolute bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200" style={{ bottom: '1rem', right: 'calc(1rem + 1.5%)' }}>
                <h3 className="text-sm font-bold text-primary mb-3">Legend</h3>
                <div className="space-y-2">
                  {legendItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: item.color, opacity: 0.3 }}
                      ></div>
                      <span className="text-xs text-gray-700 font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popup for establishment info - Google Maps style */}
        {mounted && hoveredEstablishment && createPortal(
          <div
            className="fixed z-[99999] pointer-events-none"
            style={{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`,
              transform: 'translate(15px, -50%)',
            }}
          >
            <div className="rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden relative animate-in fade-in zoom-in duration-200">
              {/* Image fills entire card */}
              <div className="relative w-[420px] h-[270px]">
                <img
                  src={hoveredEstablishment.image}
                  alt={hoveredEstablishment.name}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
                
                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-white font-bold text-2xl drop-shadow-lg">
                    {hoveredEstablishment.name}
                  </h3>
                </div>
              </div>

              {/* Arrow pointing down */}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-white drop-shadow-md"></div>
              </div>
            </div>
          </div>,
          document.getElementById('modal-root')!
        )}
      </div>
    </section>
  )
}
