"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@barangay/ui"
import { Calendar, Users } from "lucide-react"

export interface Project {
  id?: number
  title: string
  subtitle?: string
  description: string
  image?: string
  image_path?: string
  date: string
  beneficiaries?: string
  url?: string
}

export function ProjectCard({ project }: { project: Project }) {
  const handleCardClick = () => {
    if (project.url) {
      window.open(project.url, '_blank');
    }
  };

  return (
    <Card 
      className="bg-white/95 backdrop-blur-lg border-0 shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden p-0 group hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative h-48 sm:h-56 lg:h-64">
        <Image
          src={project.image_path || project.image || "/placeholder.svg"}
          alt={project.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
      </div>
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="font-bold text-primary leading-tight text-center" style={{fontSize: 'clamp(1rem, 1.5vw, 1.25rem)'}}>{project.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col px-4 sm:px-6 pb-4">
        {project.subtitle && (
          <h3 className="font-semibold text-gray-800 leading-tight mb-3" style={{fontSize: 'clamp(0.9rem, 1.2vw, 1rem)'}}>{project.subtitle}</h3>
        )}
        <p className="text-gray-600 font-medium text-pretty leading-relaxed flex-1 text-justify" style={{fontSize: 'clamp(0.8rem, 1.1vw, 0.9rem)'}}>{project.description}</p>

        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">{project.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">{project.beneficiaries}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
