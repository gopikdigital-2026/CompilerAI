export interface GitHubUser {
  readonly id: number;
  readonly login: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly avatarUrl: string;
  readonly profileUrl: string;
  readonly accountType: 'User' | 'Organization' | 'Bot';
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GitHubUserResponse {
  readonly id: number;
  readonly login: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly avatar_url: string;
  readonly html_url: string;
  readonly type: 'User' | 'Organization' | 'Bot';
}
