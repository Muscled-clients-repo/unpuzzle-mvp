"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CourseFilters } from '@/services/public-course-service'
import { Search, Filter, X } from 'lucide-react'

interface CourseFiltersProps {
  filters: CourseFilters
  onFiltersChange: (filters: Partial<CourseFilters>) => void
  onClearFilters: () => void
  totalCount: number
}

export function CourseFiltersComponent({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  totalCount 
}: CourseFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFiltersChange({ search: searchInput, page: 1 })
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onFiltersChange({ search: searchInput, page: 1 })
    }
  }

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (key === 'page' || key === 'limit') return false
      if (value === undefined || value === null || value === '' || value === 'all') return false
      return true
    }
  ).length

  const removeFilter = (filterKey: keyof CourseFilters) => {
    const updates: Partial<CourseFilters> = { page: 1 }
    
    switch (filterKey) {
      case 'search':
        updates.search = ''
        setSearchInput('')
        break
      case 'difficulty':
        updates.difficulty = 'all'
        break
      case 'priceRange':
        updates.priceRange = 'all'
        break
      case 'category':
        updates.category = ''
        break
      case 'instructor':
        updates.instructor = ''
        break
      case 'minRating':
        updates.minRating = undefined
        break
    }
    
    onFiltersChange(updates)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Courses
          </div>
          <div className="text-sm text-muted-foreground">
            {totalCount.toLocaleString()} courses found
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search">Search courses</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by title, description, or instructor..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="mt-6">Search</Button>
        </form>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Difficulty */}
          <div>
            <Label>Difficulty</Label>
            <Select 
              value={filters.difficulty || 'all'} 
              onValueChange={(value: 'all' | 'beginner' | 'intermediate' | 'advanced') => onFiltersChange({ difficulty: value, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <Label>Price</Label>
            <Select 
              value={filters.priceRange || 'all'} 
              onValueChange={(value: 'all' | 'free' | 'paid') => onFiltersChange({ priceRange: value, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label>Sort By</Label>
            <Select 
              value={filters.sortBy || 'newest'} 
              onValueChange={(value: 'popular' | 'newest' | 'price-asc' | 'price-desc' | 'rating') => onFiltersChange({ sortBy: value, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              disabled={activeFiltersCount === 0}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Clear {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground mr-2">Active filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                Search: {filters.search}
                <button 
                  onClick={() => removeFilter('search')}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.difficulty && filters.difficulty !== 'all' && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                {filters.difficulty.charAt(0).toUpperCase() + filters.difficulty.slice(1)}
                <button 
                  onClick={() => removeFilter('difficulty')}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.priceRange && filters.priceRange !== 'all' && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                {filters.priceRange.charAt(0).toUpperCase() + filters.priceRange.slice(1)}
                <button 
                  onClick={() => removeFilter('priceRange')}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                Category: {filters.category}
                <button 
                  onClick={() => removeFilter('category')}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.instructor && (
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                Instructor: {filters.instructor}
                <button 
                  onClick={() => removeFilter('instructor')}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}