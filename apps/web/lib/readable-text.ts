export function readableParagraphs(text: string): string[] {
  const result: string[] = [];
  const sentences = new Intl.Segmenter("id", { granularity: "sentence" });
  for (const block of text.split(/\n\s*\n|\n/).filter(value => value.trim())) {
    let paragraph = "";
    for (const { segment } of sentences.segment(block.trim())) {
      if (paragraph && paragraph.length + segment.length > 450) {
        result.push(paragraph.trim());
        paragraph = "";
      }
      paragraph += segment;
    }
    if (paragraph.trim()) result.push(paragraph.trim());
  }
  return result;
}
