export function shouldClosePaneForOpenedFile(
  trackedFilePath: string | null,
  openedFilePath: string | null | undefined
): boolean {
  if (!trackedFilePath || !openedFilePath) {
    return false;
  }

  return trackedFilePath !== openedFilePath;
}

export function resolveTrackedFilePathOnRename(
  trackedFilePath: string | null,
  oldPath: string,
  newPath: string
): string | null {
  if (!trackedFilePath) {
    return null;
  }

  return trackedFilePath === oldPath ? newPath : trackedFilePath;
}
