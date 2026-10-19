/** Client-side guard before calling Supabase to reject a work order. */
export function rejectionReasonBlock(note?: string): string | null {
  if (!(note?.trim())) {
    return "A rejection reason is required"
  }
  return null
}
