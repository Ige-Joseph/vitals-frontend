import React from 'react'

function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    )
}

/** Small editor-compatible Markdown subset. Content remains escaped React text. */
export function ArticleContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }
    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      const level = line.match(/^#+/)![0].length
      blocks.push(
        level <= 2 ? <h2 key={i}>{inline(heading[1])}</h2> : <h3 key={i}>{inline(heading[1])}</h3>
      )
      i++
      continue
    }
    const listPattern = /^([-*+]\s+|\d+\.\s+)/
    if (listPattern.test(line)) {
      const start = i
      const ordered = /^\d+\./.test(line)
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*+]\s+/
      const items: React.ReactNode[] = []
      while (i < lines.length && pattern.test(lines[i].trim())) {
        items.push(<li key={i}>{inline(lines[i].trim().replace(pattern, ''))}</li>)
        i++
      }
      const firstNumber = Number(line.match(/^\d+/)?.[0] ?? 1)
      blocks.push(
        ordered ? (
          <ol key={start} start={firstNumber}>
            {items}
          </ol>
        ) : (
          <ul key={start}>{items}</ul>
        )
      )
      continue
    }
    const start = i
    const paragraph: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s+/.test(lines[i].trim()) &&
      !listPattern.test(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim())
      i++
    }
    blocks.push(<p key={start}>{inline(paragraph.join(' '))}</p>)
  }
  return <div className="article-prose">{blocks}</div>
}
