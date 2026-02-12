import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-base-200 bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <span>Node Banana</span>
            <span>&middot;</span>
            <span>AI Workflow Automation</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-base-content/60 hover:text-base-content transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-base-content/60 hover:text-base-content transition-colors">
              Terms
            </Link>
            <a
              href="https://github.com/etailup/node-banana"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base-content/60 hover:text-base-content transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
