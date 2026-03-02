import "./marketing.css"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-theme="dracula">
      {children}
    </div>
  )
}
