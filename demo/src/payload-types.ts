




export type SupportedTimezones =
  | 'Pacific/Midway'
  | 'Pacific/Niue'
  | 'Pacific/Honolulu'
  | 'Pacific/Rarotonga'
  | 'America/Anchorage'
  | 'Pacific/Gambier'
  | 'America/Los_Angeles'
  | 'America/Tijuana'
  | 'America/Denver'
  | 'America/Phoenix'
  | 'America/Chicago'
  | 'America/Guatemala'
  | 'America/New_York'
  | 'America/Bogota'
  | 'America/Caracas'
  | 'America/Santiago'
  | 'America/Buenos_Aires'
  | 'America/Sao_Paulo'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/Azores'
  | 'Atlantic/Cape_Verde'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Africa/Lagos'
  | 'Europe/Athens'
  | 'Africa/Cairo'
  | 'Europe/Moscow'
  | 'Asia/Riyadh'
  | 'Asia/Dubai'
  | 'Asia/Baku'
  | 'Asia/Karachi'
  | 'Asia/Tashkent'
  | 'Asia/Calcutta'
  | 'Asia/Dhaka'
  | 'Asia/Almaty'
  | 'Asia/Jakarta'
  | 'Asia/Bangkok'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'Asia/Seoul'
  | 'Australia/Brisbane'
  | 'Australia/Sydney'
  | 'Pacific/Guam'
  | 'Pacific/Noumea'
  | 'Pacific/Auckland'
  | 'Pacific/Fiji';

export interface Config {
  auth: {
    users: UserAuthOperations;
  };
  blocks: {};
  collections: {
    pages: Page;
    posts: Post;
    media: Media;
    categories: Category;
    users: User;
    'payload-kv': PayloadKv;
    'payload-folders': FolderInterface;
    'payload-locked-documents': PayloadLockedDocument;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  collectionsJoins: {
    'payload-folders': {
      documentsAndFolders: 'payload-folders' | 'media';
    };
  };
  collectionsSelect: {
    pages: PagesSelect<false> | PagesSelect<true>;
    posts: PostsSelect<false> | PostsSelect<true>;
    media: MediaSelect<false> | MediaSelect<true>;
    categories: CategoriesSelect<false> | CategoriesSelect<true>;
    users: UsersSelect<false> | UsersSelect<true>;
    'payload-kv': PayloadKvSelect<false> | PayloadKvSelect<true>;
    'payload-folders': PayloadFoldersSelect<false> | PayloadFoldersSelect<true>;
    'payload-locked-documents': PayloadLockedDocumentsSelect<false> | PayloadLockedDocumentsSelect<true>;
    'payload-preferences': PayloadPreferencesSelect<false> | PayloadPreferencesSelect<true>;
    'payload-migrations': PayloadMigrationsSelect<false> | PayloadMigrationsSelect<true>;
  };
  db: {
    defaultIDType: number;
  };
  fallbackLocale: ('false' | 'none' | 'null') | false | null | ('en' | 'uk') | ('en' | 'uk')[];
  globals: {
    header: Header;
    footer: Footer;
  };
  globalsSelect: {
    header: HeaderSelect<false> | HeaderSelect<true>;
    footer: FooterSelect<false> | FooterSelect<true>;
  };
  locale: 'en' | 'uk';
  widgets: {
    collections: CollectionsWidget;
  };
  user: User;
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface UserAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}

export interface Page {
  id: number;
  title: string;
  blocks: ContentBlock[];
  publishedAt?: string | null;
  slug: string;
  
  meta?: {
    content?: {
      
      title?: string | null;
      
      description?: string | null;
      
      keywords?: string | null;
      
      image?: string | null;
    };
    social?: {
      
      social?: {
        
        ogTitle?: string | null;
        
        ogDescription?: string | null;
        
        ogImage?: string | null;
        
        ogType?: ('website' | 'article' | 'profile' | 'book' | 'music' | 'video') | null;
        
        ogUrl?: string | null;
        ogSiteName?: string | null;
        
        ogLocale?: string | null;
        twitterCard?: ('summary' | 'summary_large_image' | 'app' | 'player') | null;
        
        twitterTitle?: string | null;
        twitterDescription?: string | null;
        
        twitterImage?: string | null;
        
        twitterSite?: string | null;
        
        twitterCreator?: string | null;
      };
    };
    advanced?: {
      
      advanced?: {
        
        canonicalUrl?: string | null;
        
        robots?: string | null;
        
        noindex?: boolean | null;
        author?: string | null;
        publishedAt?: string | null;
        modifiedAt?: string | null;
      };
    };
    preview?: {};
  };
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}

export interface ContentBlock {
  columns?:
    | {
        text: string;
        enableLink?: boolean | null;
        linkUrl?: string | null;
        linkLabel?: string | null;
        id?: string | null;
      }[]
    | null;
  id?: string | null;
  blockName?: string | null;
  blockType: 'content';
}

export interface Post {
  id: number;
  title: string;
  excerpt?: string | null;
  content?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  publishedAt?: string | null;
  slug: string;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}

export interface Media {
  id: number;
  alt?: string | null;
  caption?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  'lqip-modernHash'?: string | null;
  'lqip-modernDataUrl'?: string | null;
  folder?: (number | null) | FolderInterface;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: {
    thumbnail?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    square?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    small?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    medium?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    large?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    xlarge?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    og?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
  };
}

export interface FolderInterface {
  id: number;
  name: string;
  folder?: (number | null) | FolderInterface;
  documentsAndFolders?: {
    docs?: (
      | {
          relationTo?: 'payload-folders';
          value: number | FolderInterface;
        }
      | {
          relationTo?: 'media';
          value: number | Media;
        }
    )[];
    hasNextPage?: boolean;
    totalDocs?: number;
  };
  folderType?: 'media'[] | null;
  updatedAt: string;
  createdAt: string;
}

export interface Category {
  id: number;
  title: string;
  
  generateSlug?: boolean | null;
  slug: string;
  updatedAt: string;
  createdAt: string;
}

export interface User {
  id: number;
  name?: string | null;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  sessions?:
    | {
        id: string;
        createdAt?: string | null;
        expiresAt: string;
      }[]
    | null;
  password?: string | null;
  collection: 'users';
}

export interface PayloadKv {
  id: number;
  key: string;
  data:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
}

export interface PayloadLockedDocument {
  id: number;
  document?:
    | ({
        relationTo: 'pages';
        value: number | Page;
      } | null)
    | ({
        relationTo: 'posts';
        value: number | Post;
      } | null)
    | ({
        relationTo: 'media';
        value: number | Media;
      } | null)
    | ({
        relationTo: 'categories';
        value: number | Category;
      } | null)
    | ({
        relationTo: 'users';
        value: number | User;
      } | null)
    | ({
        relationTo: 'payload-folders';
        value: number | FolderInterface;
      } | null);
  globalSlug?: string | null;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  updatedAt: string;
  createdAt: string;
}

export interface PayloadPreference {
  id: number;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}

export interface PayloadMigration {
  id: number;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}

export interface PagesSelect<T extends boolean = true> {
  title?: T;
  blocks?:
    | T
    | {
        content?: T | ContentBlockSelect<T>;
      };
  publishedAt?: T;
  slug?: T;
  meta?:
    | T
    | {
        content?:
          | T
          | {
              title?: T;
              description?: T;
              keywords?: T;
              image?: T;
            };
        social?:
          | T
          | {
              social?:
                | T
                | {
                    ogTitle?: T;
                    ogDescription?: T;
                    ogImage?: T;
                    ogType?: T;
                    ogUrl?: T;
                    ogSiteName?: T;
                    ogLocale?: T;
                    twitterCard?: T;
                    twitterTitle?: T;
                    twitterDescription?: T;
                    twitterImage?: T;
                    twitterSite?: T;
                    twitterCreator?: T;
                  };
            };
        advanced?:
          | T
          | {
              advanced?:
                | T
                | {
                    canonicalUrl?: T;
                    robots?: T;
                    noindex?: T;
                    author?: T;
                    publishedAt?: T;
                    modifiedAt?: T;
                  };
            };
        preview?: T | {};
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}

export interface ContentBlockSelect<T extends boolean = true> {
  columns?:
    | T
    | {
        text?: T;
        enableLink?: T;
        linkUrl?: T;
        linkLabel?: T;
        id?: T;
      };
  id?: T;
  blockName?: T;
}

export interface PostsSelect<T extends boolean = true> {
  title?: T;
  excerpt?: T;
  content?: T;
  publishedAt?: T;
  slug?: T;
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}

export interface MediaSelect<T extends boolean = true> {
  alt?: T;
  caption?: T;
  'lqip-modernHash'?: T;
  'lqip-modernDataUrl'?: T;
  folder?: T;
  updatedAt?: T;
  createdAt?: T;
  url?: T;
  thumbnailURL?: T;
  filename?: T;
  mimeType?: T;
  filesize?: T;
  width?: T;
  height?: T;
  focalX?: T;
  focalY?: T;
  sizes?:
    | T
    | {
        thumbnail?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        square?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        small?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        medium?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        large?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        xlarge?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        og?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
      };
}

export interface CategoriesSelect<T extends boolean = true> {
  title?: T;
  generateSlug?: T;
  slug?: T;
  updatedAt?: T;
  createdAt?: T;
}

export interface UsersSelect<T extends boolean = true> {
  name?: T;
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  loginAttempts?: T;
  lockUntil?: T;
  sessions?:
    | T
    | {
        id?: T;
        createdAt?: T;
        expiresAt?: T;
      };
}

export interface PayloadKvSelect<T extends boolean = true> {
  key?: T;
  data?: T;
}

export interface PayloadFoldersSelect<T extends boolean = true> {
  name?: T;
  folder?: T;
  documentsAndFolders?: T;
  folderType?: T;
  updatedAt?: T;
  createdAt?: T;
}

export interface PayloadLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}

export interface PayloadPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}

export interface PayloadMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}

export interface Header {
  id: number;
  nav: (
    | {
        title: string;
        links?:
          | {
              link: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?:
                  | ({
                      relationTo: 'pages';
                      value: number | Page;
                    } | null)
                  | ({
                      relationTo: 'posts';
                      value: number | Post;
                    } | null);
                url?: string | null;
                label: string;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'navColumn';
      }
    | {
        link: {
          type?: ('reference' | 'custom') | null;
          newTab?: boolean | null;
          reference?:
            | ({
                relationTo: 'pages';
                value: number | Page;
              } | null)
            | ({
                relationTo: 'posts';
                value: number | Post;
              } | null);
          url?: string | null;
          label: string;
        };
        id?: string | null;
        blockName?: string | null;
        blockType: 'navItem';
      }
  )[];
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface Footer {
  id: number;
  nav: (
    | {
        title: string;
        links?:
          | {
              link: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?:
                  | ({
                      relationTo: 'pages';
                      value: number | Page;
                    } | null)
                  | ({
                      relationTo: 'posts';
                      value: number | Post;
                    } | null);
                url?: string | null;
                label: string;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'navColumn';
      }
    | {
        link: {
          type?: ('reference' | 'custom') | null;
          newTab?: boolean | null;
          reference?:
            | ({
                relationTo: 'pages';
                value: number | Page;
              } | null)
            | ({
                relationTo: 'posts';
                value: number | Post;
              } | null);
          url?: string | null;
          label: string;
        };
        id?: string | null;
        blockName?: string | null;
        blockType: 'navItem';
      }
  )[];
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface HeaderSelect<T extends boolean = true> {
  nav?:
    | T
    | {
        navColumn?:
          | T
          | {
              title?: T;
              links?:
                | T
                | {
                    link?:
                      | T
                      | {
                          type?: T;
                          newTab?: T;
                          reference?: T;
                          url?: T;
                          label?: T;
                        };
                    id?: T;
                  };
              id?: T;
              blockName?: T;
            };
        navItem?:
          | T
          | {
              link?:
                | T
                | {
                    type?: T;
                    newTab?: T;
                    reference?: T;
                    url?: T;
                    label?: T;
                  };
              id?: T;
              blockName?: T;
            };
      };
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}

export interface FooterSelect<T extends boolean = true> {
  nav?:
    | T
    | {
        navColumn?:
          | T
          | {
              title?: T;
              links?:
                | T
                | {
                    link?:
                      | T
                      | {
                          type?: T;
                          newTab?: T;
                          reference?: T;
                          url?: T;
                          label?: T;
                        };
                    id?: T;
                  };
              id?: T;
              blockName?: T;
            };
        navItem?:
          | T
          | {
              link?:
                | T
                | {
                    type?: T;
                    newTab?: T;
                    reference?: T;
                    url?: T;
                    label?: T;
                  };
              id?: T;
              blockName?: T;
            };
      };
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}

export interface CollectionsWidget {
  data?: {
    [k: string]: unknown;
  };
  width: 'full';
}

export interface Auth {
  [k: string]: unknown;
}


declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}