import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

const lowlight = createLowlight(common)

/**
 * Convert Tiptap JSON content to HTML string
 * Uses the same extensions as the editor to ensure compatibility
 */
export function tiptapToHtml(content: any): string {
  // Handle empty or invalid content
  if (!content) {
    return ''
  }

  // If already a string, return as-is
  if (typeof content === 'string') {
    return content
  }

  try {
    // Generate HTML using the same extensions as the editor
    const html = generateHTML(content, [
      StarterKit.configure({
        link: false, // We use custom Link extension
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-muted rounded-lg p-4 overflow-x-auto',
        },
      }),
    ])

    return html
  } catch (error) {
    console.error('Error converting Tiptap JSON to HTML:', error)
    return ''
  }
}
