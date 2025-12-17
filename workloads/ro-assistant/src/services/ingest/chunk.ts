const CHUNK_SIZE = 800;

export type Chunk = {
  id: string;
  text: string;
  index: number;
};

export const chunkText = (text: string): Chunk[] => {
  const chunks: Chunk[] = [];
  let idx = 0;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const slice = text.slice(i, i + CHUNK_SIZE);
    if (!slice.trim()) continue;
    chunks.push({
      id: `${idx}`,
      text: slice,
      index: idx
    });
    idx += 1;
  }
  return chunks;
};
