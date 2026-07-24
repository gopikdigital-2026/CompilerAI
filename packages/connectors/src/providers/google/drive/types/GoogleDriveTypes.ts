import type { Metadata } from '../../../../types/index';

export interface GoogleDriveFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly owners: readonly GoogleDriveOwner[];
  readonly parents: readonly string[];
  readonly webViewLink: string | null;
  readonly trashed: boolean;
  readonly metadata?: Metadata;
}

export interface GoogleDriveOwner {
  readonly id: string;
  readonly displayName: string;
  readonly emailAddress: string | null;
}

export interface GoogleDriveFolder {
  readonly id: string;
  readonly name: string;
  readonly parentFolderId: string | null;
  readonly webViewLink: string | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
}

export interface GoogleDriveFileResponse {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size?: string;
  readonly createdTime?: string;
  readonly modifiedTime?: string;
  readonly owners?: readonly { readonly displayName: string; readonly emailAddress?: string; readonly permissionId?: string }[];
  readonly parents?: readonly string[];
  readonly webViewLink?: string;
  readonly trashed?: boolean;
}

export interface GoogleDriveFileListResponse {
  readonly files: readonly GoogleDriveFileResponse[];
  readonly nextPageToken?: string;
  readonly incompleteSearch?: boolean;
}
