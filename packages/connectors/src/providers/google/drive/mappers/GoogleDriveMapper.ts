import type { GoogleDriveFile, GoogleDriveFileResponse, GoogleDriveFileListResponse, GoogleDriveOwner } from '../types/GoogleDriveTypes';

export class GoogleDriveMapper {
  static mapFile(raw: GoogleDriveFileResponse): GoogleDriveFile {
    const owners: GoogleDriveOwner[] = (raw.owners ?? []).map((o) => ({
      id: o.permissionId ?? o.emailAddress ?? o.displayName,
      displayName: o.displayName,
      emailAddress: o.emailAddress ?? null,
    }));

    return {
      id: raw.id,
      name: raw.name,
      mimeType: raw.mimeType,
      size: raw.size ? parseInt(raw.size, 10) : null,
      createdAt: raw.createdTime ?? '',
      modifiedAt: raw.modifiedTime ?? '',
      owners,
      parents: raw.parents ? [...raw.parents] : [],
      webViewLink: raw.webViewLink ?? null,
      trashed: raw.trashed ?? false,
    };
  }

  static mapFileList(raw: GoogleDriveFileListResponse): {
    readonly files: readonly GoogleDriveFile[];
    readonly nextPageToken?: string;
    readonly incompleteSearch: boolean;
  } {
    return {
      files: raw.files.map((f) => GoogleDriveMapper.mapFile(f)),
      nextPageToken: raw.nextPageToken,
      incompleteSearch: raw.incompleteSearch ?? false,
    };
  }
}
