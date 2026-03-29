// src/components/ui/SectionRule.tsx
export default function SectionRule({ label }: { label: string }) {
  return (
    <div className="section-rule">
      <span className="section-rule-label">{label}</span>
      <div className="section-rule-line" />
    </div>
  )
}
