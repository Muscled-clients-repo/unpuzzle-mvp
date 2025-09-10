'use server'

import { createClient } from '@/lib/supabase/server'
import { backblazeService } from '@/services/video/backblaze-service'

export interface CleanupReport {
  totalMediaFiles: number
  totalVideos: number
  orphanedMediaFiles: string[]
  orphanedVideos: string[]
  backblazeErrors: string[]
  summary: string
}

/**
 * Scan database records and check if corresponding files exist in Backblaze
 * Returns a report of orphaned records that need to be cleaned up
 */
export async function scanOrphanedFilesAction(): Promise<CleanupReport> {
  try {
    const supabase = await createClient()
    
    console.log('🔍 Starting orphaned files scan...')
    
    // Initialize report
    const report: CleanupReport = {
      totalMediaFiles: 0,
      totalVideos: 0,
      orphanedMediaFiles: [],
      orphanedVideos: [],
      backblazeErrors: [],
      summary: ''
    }

    // 1. Check media_files table
    console.log('📁 Scanning media_files table...')
    const { data: mediaFiles, error: mediaError } = await supabase
      .from('media_files')
      .select('id, name, backblaze_file_id, status')
      .eq('status', 'active')
      .not('backblaze_file_id', 'is', null)

    if (mediaError) throw mediaError
    
    report.totalMediaFiles = mediaFiles?.length || 0
    console.log(`📁 Found ${report.totalMediaFiles} active media files to check`)

    // Check each media file in Backblaze
    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        try {
          console.log(`🔍 Checking media file: ${file.name} (ID: ${file.backblaze_file_id})`)
          await backblazeService.getFileInfo(file.backblaze_file_id)
          console.log(`✅ File exists: ${file.name}`)
        } catch (error: any) {
          if (error.response?.data?.code === 'file_not_present' || 
              error.message?.includes('file_not_present') ||
              error.response?.status === 400) {
            console.log(`❌ Orphaned media file: ${file.name} (${file.id})`)
            report.orphanedMediaFiles.push(file.id)
          } else {
            console.error(`⚠️ Backblaze error for ${file.name}:`, error.message)
            report.backblazeErrors.push(`Media file ${file.name}: ${error.message}`)
          }
        }
      }
    }

    // 2. Check videos table (only direct uploads, not media library references)
    console.log('🎥 Scanning videos table...')
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, filename, backblaze_file_id, media_file_id')
      .is('media_file_id', null) // Only direct uploads
      .not('backblaze_file_id', 'is', null)

    if (videosError) throw videosError
    
    report.totalVideos = videos?.length || 0
    console.log(`🎥 Found ${report.totalVideos} direct upload videos to check`)

    // Check each video file in Backblaze
    if (videos && videos.length > 0) {
      for (const video of videos) {
        try {
          console.log(`🔍 Checking video: ${video.filename} (ID: ${video.backblaze_file_id})`)
          await backblazeService.getFileInfo(video.backblaze_file_id)
          console.log(`✅ File exists: ${video.filename}`)
        } catch (error: any) {
          if (error.response?.data?.code === 'file_not_present' || 
              error.message?.includes('file_not_present') ||
              error.response?.status === 400) {
            console.log(`❌ Orphaned video: ${video.filename} (${video.id})`)
            report.orphanedVideos.push(video.id)
          } else {
            console.error(`⚠️ Backblaze error for ${video.filename}:`, error.message)
            report.backblazeErrors.push(`Video ${video.filename}: ${error.message}`)
          }
        }
      }
    }

    // Generate summary
    const totalOrphaned = report.orphanedMediaFiles.length + report.orphanedVideos.length
    report.summary = `
📊 CLEANUP SCAN RESULTS:
• Total media files scanned: ${report.totalMediaFiles}
• Total videos scanned: ${report.totalVideos}
• Orphaned media files: ${report.orphanedMediaFiles.length}
• Orphaned videos: ${report.orphanedVideos.length}
• Total orphaned records: ${totalOrphaned}
• Backblaze API errors: ${report.backblazeErrors.length}

${totalOrphaned > 0 ? '⚠️ Found orphaned records that need cleanup!' : '✅ No orphaned records found!'}
    `.trim()

    console.log(report.summary)
    
    return report

  } catch (error) {
    console.error('❌ Cleanup scan failed:', error)
    throw error
  }
}

/**
 * Generate SQL DELETE statements for orphaned records
 * Use this output in Supabase SQL editor
 */
export async function generateCleanupSQLAction(): Promise<string> {
  try {
    const report = await scanOrphanedFilesAction()
    
    let sql = `-- ORPHANED FILES CLEANUP SQL
-- Generated on: ${new Date().toISOString()}
-- Run this in Supabase SQL Editor

BEGIN;

`

    if (report.orphanedMediaFiles.length > 0) {
      sql += `-- Delete orphaned media files (${report.orphanedMediaFiles.length} records)
DELETE FROM media_files 
WHERE id IN (${report.orphanedMediaFiles.map(id => `'${id}'`).join(', ')});

`
    }

    if (report.orphanedVideos.length > 0) {
      sql += `-- Delete orphaned videos (${report.orphanedVideos.length} records)
DELETE FROM videos 
WHERE id IN (${report.orphanedVideos.map(id => `'${id}'`).join(', ')});

`
    }

    if (report.orphanedMediaFiles.length === 0 && report.orphanedVideos.length === 0) {
      sql += `-- No orphaned records found - no cleanup needed!
SELECT 'No orphaned records to clean up' as result;

`
    }

    sql += `COMMIT;

-- Summary:
-- Media files to delete: ${report.orphanedMediaFiles.length}
-- Videos to delete: ${report.orphanedVideos.length}
-- Total records to delete: ${report.orphanedMediaFiles.length + report.orphanedVideos.length}`

    console.log('📝 Generated cleanup SQL:')
    console.log(sql)
    
    return sql

  } catch (error) {
    console.error('❌ Failed to generate cleanup SQL:', error)
    throw error
  }
}