export function JsonLd<T extends Record<string, unknown>>({
  data,
}: {
  data: T & { "@context": string; "@type": string }
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
