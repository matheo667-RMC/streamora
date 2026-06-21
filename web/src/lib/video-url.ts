/**
 * Extracts Google Drive file ID from various URL formats.
 */
export function extractDriveFileId(url: string): string | null {
  // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const match1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // Format: https://drive.google.com/open?id=FILE_ID
  const match2 = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  // Format: https://drive.google.com/uc?id=FILE_ID
  const match3 = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (match3) return match3[1];

  return null;
}

/**
 * Converts a video URL to a streamable format.
 * For Google Drive links, uses the direct content URL.
 */
export function getStreamableUrl(url: string): { directUrl: string; driveFileId: string | null } {
  const fileId = extractDriveFileId(url);

  if (fileId) {
    return {
      directUrl: `/api/video-proxy?id=${fileId}`,
      driveFileId: fileId,
    };
  }

  return { directUrl: url, driveFileId: null };
}

export function getDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
