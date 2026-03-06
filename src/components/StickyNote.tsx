interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
}

export default function StickyNote({ children, style }: Props) {
  return (
    <div
      className="sticky-note"
      style={style}
    >
      {children}
    </div>
  )
}
