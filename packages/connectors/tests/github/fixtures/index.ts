// Re-export mock helpers
export { createMockFetch, createRateLimitHeaders, createErrorConfig } from '../mocks/MockFetch';
export type { MockResponseConfig, MockRoute } from '../mocks/MockFetch';

// --- Fixtures ---

export const WEBHOOK_SECRET = 'my_webhook_secret';

export const FIXTURE_USER = {
  login: 'octocat',
  id: 1,
  node_id: 'MDQ6VXNlcjE=',
  avatar_url: 'https://github.com/images/error/octocat_happy.gif',
  gravatar_id: '',
  url: 'https://api.github.com/users/octocat',
  html_url: 'https://github.com/octocat',
  followers_url: 'https://api.github.com/users/octocat/followers',
  following_url: 'https://api.github.com/users/octocat/following{/other_user}',
  gists_url: 'https://api.github.com/users/octocat/gists{/gist_id}',
  starred_url: 'https://api.github.com/users/octocat/starred{/owner}{/repo}',
  subscriptions_url: 'https://api.github.com/users/octocat/subscriptions',
  organizations_url: 'https://api.github.com/users/octocat/orgs',
  repos_url: 'https://api.github.com/users/octocat/repos',
  events_url: 'https://api.github.com/users/octocat/events{/privacy}',
  received_events_url: 'https://api.github.com/users/octocat/received_events',
  type: 'User',
  site_admin: false,
  name: 'monalisa octocat',
  company: 'GitHub',
  blog: 'https://github.com/blog',
  location: 'San Francisco',
  email: 'octocat@github.com',
  hireable: false,
  bio: 'There once was...',
  twitter_username: 'monatheoctocat',
  public_repos: 2,
  public_gists: 1,
  followers: 20,
  following: 0,
  created_at: '2008-01-14T04:33:35Z',
  updated_at: '2008-01-14T04:33:35Z',
};

export const FIXTURE_REPOSITORY = {
  id: 1296269,
  node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
  name: 'Hello-World',
  full_name: 'octocat/Hello-World',
  owner: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
  private: false,
  html_url: 'https://github.com/octocat/Hello-World',
  description: 'My first repository on GitHub!',
  fork: false,
  url: 'https://api.github.com/repos/octocat/Hello-World',
  archive_url: 'https://api.github.com/repos/octocat/Hello-World/{archive_format}{/ref}',
  assignees_url: 'https://api.github.com/repos/octocat/Hello-World/assignees{/user}',
  blobs_url: 'https://api.github.com/repos/octocat/Hello-World/git/blobs{/sha}',
  branches_url: 'https://api.github.com/repos/octocat/Hello-World/branches{/branch}',
  collaborators_url: 'https://api.github.com/repos/octocat/Hello-World/collaborators{/collaborator}',
  comments_url: 'https://api.github.com/repos/octocat/Hello-World/comments{/number}',
  commits_url: 'https://api.github.com/repos/octocat/Hello-World/commits{/sha}',
  compare_url: 'https://api.github.com/repos/octocat/Hello-World/compare/{base}...{head}',
  contents_url: 'https://api.github.com/repos/octocat/Hello-World/contents/{+path}',
  contributors_url: 'https://api.github.com/repos/octocat/Hello-World/contributors',
  deployments_url: 'https://api.github.com/repos/octocat/Hello-World/deployments',
  downloads_url: 'https://api.github.com/repos/octocat/Hello-World/downloads',
  events_url: 'https://api.github.com/repos/octocat/Hello-World/events',
  forks_url: 'https://api.github.com/repos/octocat/Hello-World/forks',
  git_commits_url: 'https://api.github.com/repos/octocat/Hello-World/git/commits{/sha}',
  git_refs_url: 'https://api.github.com/repos/octocat/Hello-World/git/refs{/sha}',
  git_tags_url: 'https://api.github.com/repos/octocat/Hello-World/git/tags{/sha}',
  git_url: 'git:github.com/octocat/Hello-World.git',
  issue_comment_url: 'https://api.github.com/repos/octocat/Hello-World/issues/comments{/number}',
  issue_events_url: 'https://api.github.com/repos/octocat/Hello-World/issues/events{/number}',
  issues_url: 'https://api.github.com/repos/octocat/Hello-World/issues{/number}',
  keys_url: 'https://api.github.com/repos/octocat/Hello-World/keys{/key_id}',
  labels_url: 'https://api.github.com/repos/octocat/Hello-World/labels{/name}',
  languages_url: 'https://api.github.com/repos/octocat/Hello-World/languages',
  merges_url: 'https://api.github.com/repos/octocat/Hello-World/merges',
  milestones_url: 'https://api.github.com/repos/octocat/Hello-World/milestones{/number}',
  notifications_url: 'https://api.github.com/repos/octocat/Hello-World/notifications{?since,all,participating}',
  pulls_url: 'https://api.github.com/repos/octocat/Hello-World/pulls{/number}',
  releases_url: 'https://api.github.com/repos/octocat/Hello-World/releases{/id}',
  ssh_url: 'git@github.com:octocat/Hello-World.git',
  stargazers_url: 'https://api.github.com/repos/octocat/Hello-World/stargazers',
  statuses_url: 'https://api.github.com/repos/octocat/Hello-World/statuses/{sha}',
  subscribers_url: 'https://api.github.com/repos/octocat/Hello-World/subscribers',
  subscription_url: 'https://api.github.com/repos/octocat/Hello-World/subscription',
  tags_url: 'https://api.github.com/repos/octocat/Hello-World/tags',
  teams_url: 'https://api.github.com/repos/octocat/Hello-World/teams',
  trees_url: 'https://api.github.com/repos/octocat/Hello-World/git/trees{/sha}',
  clone_url: 'https://github.com/octocat/Hello-World.git',
  mirror_url: 'git:git.example.com/octocat/Hello-World',
  hooks_url: 'https://api.github.com/repos/octocat/Hello-World/hooks',
  svn_url: 'https://svn.github.com/octocat/Hello-World',
  homepage: 'https://github.com',
  language: 'C',
  forks_count: 9,
  stargazers_count: 80,
  watchers_count: 80,
  size: 108,
  default_branch: 'master',
  open_issues_count: 0,
  is_template: false,
  topics: [],
  has_issues: true,
  has_projects: true,
  has_wiki: true,
  has_pages: true,
  has_downloads: true,
  archived: false,
  disabled: false,
  visibility: 'public',
  pushed_at: '2011-01-26T19:06:43Z',
  created_at: '2011-01-26T19:01:12Z',
  updated_at: '2011-01-26T19:14:43Z',
  permissions: {
    admin: false,
    push: false,
    pull: true,
  },
  template_repository: null,
};

export const FIXTURE_REPOSITORIES_LIST = [FIXTURE_REPOSITORY];

export const FIXTURE_ISSUE = {
  id: 1,
  node_id: 'MDU6SXNzdWUx',
  url: 'https://api.github.com/repos/octocat/Hello-World/issues/1347',
  repository_url: 'https://api.github.com/repos/octocat/Hello-World',
  labels_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1347/labels{/name}',
  comments_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1347/comments',
  events_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1347/events',
  html_url: 'https://github.com/octocat/Hello-World/issues/1347',
  number: 1347,
  state: 'open',
  title: 'Found a bug',
  body: "I'm having a problem with this.",
  user: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
  labels: [
    {
      id: 208045946,
      node_id: 'MDU6TGFiZWwyMDgwNDU5NDY=',
      url: 'https://api.github.com/repos/octocat/Hello-World/labels/bug',
      name: 'bug',
      color: 'f29513',
      description: "Bugs and improvements",
      default: true,
    },
  ],
  assignee: null,
  assignees: [],
  milestone: null,
  locked: false,
  active_lock_reason: null,
  comments: 0,
  pull_request: null,
  closed_at: null,
  created_at: '2011-04-22T13:33:48Z',
  updated_at: '2011-04-22T13:33:48Z',
  author_association: 'OWNER',
};

export const FIXTURE_ISSUES_LIST = [FIXTURE_ISSUE];

export const FIXTURE_ISSUE_COMMENT_RESPONSE = {
  id: 1,
  node_id: 'MDEyOklzc3VlQ29tbWVudDE=',
  url: 'https://api.github.com/repos/octocat/Hello-World/issues/comments/1',
  html_url: 'https://github.com/octocat/Hello-World/issues/1347#issuecomment-1',
  body: 'Test comment',
  user: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
  created_at: '2011-04-14T16:00:49Z',
  updated_at: '2011-04-14T16:00:49Z',
  author_association: 'OWNER',
};

export const FIXTURE_PULL_REQUEST = {
  id: 1,
  node_id: 'MDExOlB1bGxSZXF1ZXN0MQ==',
  number: 1347,
  title: 'new-feature',
  body: 'Please pull these awesome changes',
  state: 'open',
  locked: false,
  user: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
  labels: [],
  draft: false,
  head: {
    ref: 'new-topic',
    sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    label: 'octocat:new-topic',
    repo: {
      id: 1296269,
      node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
      name: 'Hello-World',
      full_name: 'octocat/Hello-World',
      owner: { login: 'octocat', id: 1, type: 'User' },
      private: false,
      html_url: 'https://github.com/octocat/Hello-World',
    },
  },
  base: {
    ref: 'master',
    sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    label: 'octocat:master',
    repo: {
      id: 1296269,
      node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
      name: 'Hello-World',
      full_name: 'octocat/Hello-World',
      owner: { login: 'octocat', id: 1, type: 'User' },
      private: false,
      html_url: 'https://github.com/octocat/Hello-World',
    },
  },
  commits: 3,
  additions: 100,
  deletions: 3,
  changed_files: 2,
  mergeable: true,
  merged: false,
  merged_at: null,
  merged_by: null,
  comments: 0,
  review_comments: 0,
  html_url: 'https://github.com/octocat/Hello-World/pull/1347',
  created_at: '2011-01-26T19:01:12Z',
  updated_at: '2011-01-26T19:01:12Z',
};

export const FIXTURE_PULL_REQUEST_DRAFT = {
  ...FIXTURE_PULL_REQUEST,
  draft: true,
  number: 1348,
  title: 'Draft feature',
};

export const FIXTURE_PULL_REQUEST_MERGED = {
  ...FIXTURE_PULL_REQUEST,
  number: 1349,
  title: 'Merged feature',
  state: 'closed',
  merged: true,
  merged_at: '2011-01-27T19:01:12Z',
  merged_by: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
};

export const FIXTURE_PULL_REQUESTS_LIST = [FIXTURE_PULL_REQUEST];

export const FIXTURE_WORKFLOW_RUN = {
  id: 30433642,
  name: 'Build',
  node_id: 'WFR_kwLOA',
  head_branch: 'main',
  head_sha: 'cb128s7b5b57875f334f61aebed695e2e4193db5e',
  run_number: 56,
  run_attempt: 1,
  event: 'push',
  status: 'completed',
  conclusion: 'success',
  display_title: 'Update README',
  workflow_id: 161335,
  url: 'https://api.github.com/repos/octocat/Hello-World/actions/runs/30433642',
  html_url: 'https://github.com/octocat/Hello-World/actions/runs/30433642',
  actor: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
  created_at: '2020-01-22T19:33:08Z',
  updated_at: '2020-01-22T19:33:08Z',
  run_started_at: '2020-01-22T19:33:08Z',
};

export const FIXTURE_WORKFLOW_RUNS_LIST = {
  total_count: 1,
  workflow_runs: [FIXTURE_WORKFLOW_RUN],
};

export const FIXTURE_LINK_HEADER_PAGE1 =
  '<https://api.github.com/user/repos?page=2&per_page=30>; rel="next", ' +
  '<https://api.github.com/user/repos?page=5&per_page=30>; rel="last"';

export const FIXTURE_LINK_HEADER_PAGE2 =
  '<https://api.github.com/user/repos?page=1&per_page=30>; rel="prev", ' +
  '<https://api.github.com/user/repos?page=3&per_page=30>; rel="next", ' +
  '<https://api.github.com/user/repos?page=5&per_page=30>; rel="last"';

export const FIXTURE_RATE_LIMIT_HEADERS: Record<string, string> = {
  'x-ratelimit-limit': '5000',
  'x-ratelimit-remaining': '4999',
  'x-ratelimit-used': '1',
  'x-ratelimit-reset': '1372700873',
  'x-ratelimit-resource': 'core',
};

export const FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS: Record<string, string> = {
  'x-ratelimit-limit': '5000',
  'x-ratelimit-remaining': '0',
  'x-ratelimit-used': '5000',
  'x-ratelimit-reset': '1372700873',
  'x-ratelimit-resource': 'core',
  'retry-after': '60',
};

export const FIXTURE_RATE_LIMIT_ERROR_BODY = {
  message: 'API rate limit exceeded for user ID.',
  documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
};

export const FIXTURE_ERROR_401 = {
  message: 'Bad credentials',
  documentation_url: 'https://docs.github.com/rest',
};

export const FIXTURE_ERROR_403 = {
  message: 'Resource not accessible by integration',
  documentation_url: 'https://docs.github.com/rest',
};

export const FIXTURE_ERROR_404 = {
  message: 'Not Found',
  documentation_url: 'https://docs.github.com/rest',
};

export const FIXTURE_ERROR_422 = {
  message: 'Validation Failed',
  documentation_url: 'https://docs.github.com/rest',
  errors: [
    {
      resource: 'Issue',
      field: 'title',
      code: 'missing_field',
    },
  ],
};

export const FIXTURE_ERROR_500 = {
  message: 'Server Error',
};

export const WEBHOOK_PAYLOAD_PUSH = JSON.stringify({
  ref: 'refs/heads/main',
  before: 'a10867b14bb761a8138b40b5e77f5b0add0e019',
  after: 'a10867b14bb761a8138b40b5e77f5b0add0e020',
  repository: {
    id: 217732357,
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
    name: 'Hello-World',
    full_name: 'octocat/Hello-World',
    private: false,
    owner: { login: 'octocat', id: 1, type: 'User' },
    html_url: 'https://github.com/octocat/Hello-World',
  },
  sender: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
});

export const WEBHOOK_PAYLOAD_ISSUES = JSON.stringify({
  action: 'opened',
  issue: {
    id: 1,
    number: 1347,
    title: 'Found a bug',
    body: "I'm having a problem with this.",
    state: 'open',
  },
  repository: {
    id: 1296269,
    name: 'Hello-World',
    full_name: 'octocat/Hello-World',
    owner: { login: 'octocat', id: 1, type: 'User' },
    html_url: 'https://github.com/octocat/Hello-World',
  },
  sender: {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
  },
});
