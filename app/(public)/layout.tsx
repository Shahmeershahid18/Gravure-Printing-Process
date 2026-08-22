import { PublicHeader, PublicFooter } from "@/components/landing/Chrome"

/**
 * The shell for everything a signed-out visitor can reach: the landing page,
 * the guides and the policies.
 *
 * Its own density, not the app's. These pages are read on a phone or a laptop
 * by somebody deciding whether to bother, not scanned for one figure among
 * eight -- so the type is larger and the touch targets are phone-sized.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-shell="public" className="flex min-h-screen flex-col bg-paper-100">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  )
}
