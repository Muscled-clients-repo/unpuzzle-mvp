import { NextResponse } from 'next/server';
import { backblazeService } from '@/services/video/backblaze-service';

export async function GET() {
  try {
    console.log('Checking Backblaze bucket contents...');
    
    const files = await backblazeService.listVideos();
    
    const fileStats = files.map((file: any) => ({
      fileName: file.fileName,
      sizeMB: (file.contentLength / 1024 / 1024).toFixed(2),
      uploaded: new Date(file.uploadTimestamp).toLocaleString()
    }));
    
    const totalSizeMB = files.reduce((sum: number, file: any) => sum + file.contentLength, 0) / 1024 / 1024;
    
    return NextResponse.json({
      totalFiles: files.length,
      totalSizeMB: totalSizeMB.toFixed(2),
      files: fileStats
    });
    
  } catch (error: any) {
    console.error('Error checking bucket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}