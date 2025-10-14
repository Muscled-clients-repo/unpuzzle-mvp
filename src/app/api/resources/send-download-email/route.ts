import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getResourceById, getResourceDownloadUrl, recordGuestResourceDownload } from '@/app/actions/resource-actions'

export async function POST(request: NextRequest) {
  // Initialize Resend client inside function to avoid build-time errors when env vars are missing
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email service not configured' },
      { status: 500 }
    )
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { email, resourceId } = await request.json()

    if (!email || !resourceId) {
      return NextResponse.json(
        { error: 'Email and resourceId are required' },
        { status: 400 }
      )
    }

    // Get resource details
    const resourceResult = await getResourceById(resourceId)
    if (resourceResult.error || !resourceResult.resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    const resource = resourceResult.resource

    // Generate CDN download URL
    const downloadResult = await getResourceDownloadUrl(resourceId)
    if (downloadResult.error || !downloadResult.cdnUrl) {
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    const downloadUrl = downloadResult.cdnUrl

    // Send email via Resend
    // Note: Using onboarding@resend.dev for testing. For production, verify your domain at resend.com/domains
    const { data, error } = await resend.emails.send({
      from: 'Unpuzzle Resources <onboarding@resend.dev>',
      to: email,
      subject: `Your ${resource.title} is ready to download!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Your Resource is Ready!</h1>
            </div>

            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">${resource.title}</h2>

              ${resource.description ? `
                <p style="color: #6b7280; margin: 15px 0;">
                  ${resource.description}
                </p>
              ` : ''}

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid #e5e7eb;">
                <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">
                  <strong>📊 ${resource.download_count.toLocaleString()} people</strong> have already downloaded this resource
                </p>
                <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">
                  <strong>⭐ ${resource.rating_average.toFixed(1)}/5.0</strong> average rating
                </p>
                ${resource.format ? `
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    <strong>📄 Format:</strong> ${resource.format}
                  </p>
                ` : ''}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  Download ${resource.title}
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                This download link expires in 6 hours for security
              </p>
            </div>

            <div style="background: white; padding: 30px; margin-top: 20px; border-radius: 10px; border: 1px solid #e5e7eb; text-align: center;">
              <h3 style="color: #1f2937; margin-top: 0;">Want Unlimited Access?</h3>
              <p style="color: #6b7280; margin: 15px 0;">
                Join Unpuzzle to get instant access to all premium resources, courses, and community support.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/signup"
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
                Sign Up Free
              </a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                © ${new Date().getFullYear()} Unpuzzle. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                You received this email because you requested a free resource from Unpuzzle.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Record guest download with email
    await recordGuestResourceDownload(resourceId, email)

    return NextResponse.json({
      success: true,
      emailId: data?.id
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
