export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB limit (2,147,483,648 bytes)

export async function uploadMediaFile(
  file: Blob | File,
  key: string,
  token: string,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File size (${sizeInMB} MB) exceeds maximum allowed limit of 2 GB.`);
  }

  const baseContentType = contentType.split(';')[0].trim() || 'application/octet-stream';
  const CHUNK_SIZE = 15 * 1024 * 1024; // 15MB chunks to avoid Cloudflare payload limits

  if (file.size <= CHUNK_SIZE) {
    // Single request upload for smaller files
    const uploadRes = await fetch(`/api/media/upload?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': baseContentType
      },
      body: file
    });

    if (!uploadRes.ok) {
      let errMsg = 'Media upload failed';
      try {
        const errData = await uploadRes.json();
        if (errData.error) errMsg = errData.error;
      } catch {}
      throw new Error(errMsg);
    }
    if (onProgress) onProgress(100);
  } else {
    // Chunked upload for files up to 2 GB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const url = `/api/media/upload?key=${encodeURIComponent(key)}&chunkIndex=${i}&totalChunks=${totalChunks}&totalSize=${file.size}`;
      const uploadRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': baseContentType
        },
        body: chunk
      });

      if (!uploadRes.ok) {
        let errMsg = `Chunk ${i + 1}/${totalChunks} upload failed`;
        try {
          const errData = await uploadRes.json();
          if (errData.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      if (onProgress) {
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(percent);
      }
    }
  }
}
