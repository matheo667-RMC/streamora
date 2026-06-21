/**
 * Converts Google Drive sharing URLs to direct/streamable URLs.
 * Returns the original URL if it's not a Google Drive link.
 */
export function getStreamableUrl(url: string): { directUrl: string; driveFileId: string | null } {
  // Extract Google Drive file ID from various URL formats
  let fileId: string | null = null;

  // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const match1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) fileId = match1[1];

  // Format: https://drive.google.com/open?id=FILE_ID
  const match2 = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (!fileId && match2) fileId = match2[1];

  // Format: https://drive.google.com/uc?id=FILE_ID
  const match3 = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (!fileId && match3) fileId = match3[1];

  if (fileId) {
    return {
      directUrl: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      driveFileId: fileId,
    };
  }

  return { directUrl: url, driveFileId: null };
}

export function getDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
