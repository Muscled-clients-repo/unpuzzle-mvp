"use client"

import { BlogPost } from "@/types/blog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Linkedin, Twitter, Github, ExternalLink } from "lucide-react"

interface EnhancedAuthorBioProps {
  author: BlogPost['author']
}

export function EnhancedAuthorBio({ author }: EnhancedAuthorBioProps) {
  if (!author.bio && !author.credentials) {
    return null
  }

  return (
    <Card className="mt-12">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Author Avatar */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {author.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          </div>

          {/* Author Info */}
          <div className="flex-1">
            <div className="mb-2">
              <h3 className="text-xl font-semibold">About {author.name}</h3>
              <p className="text-sm text-muted-foreground">{author.role}</p>
            </div>

            {/* Bio */}
            {author.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {author.bio}
              </p>
            )}

            {/* Credentials */}
            {author.credentials && author.credentials.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {author.credentials.map((credential, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {credential}
                  </Badge>
                ))}
              </div>
            )}

            {/* Social Links */}
            {author.social && (
              <div className="flex gap-2">
                {author.social.linkedin && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a
                      href={author.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  </Button>
                )}

                {author.social.twitter && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a
                      href={author.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </a>
                  </Button>
                )}

                {author.social.github && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a
                      href={author.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
