export async function shareUrl(input: { title?: string; text?: string; path: string }): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof window === 'undefined') return 'failed'

  const url = input.path.startsWith('http') ? input.path : window.location.origin + input.path

  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
  }
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title: input.title, text: input.text, url })
      return 'shared'
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'failed'
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch {
    /* fall through */
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = url
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return 'copied'
  } catch {
    return 'failed'
  }
}
