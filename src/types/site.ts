export type SocialColorScheme = 'cycle' | 'same';
export type SloganMode = 'random' | 'sequence';
export type ClockFormat = '12h' | '24h';
export type CursorStyle = 'block' | 'line';
export type Locale = 'zh-CN' | 'en' | 'ja';
export type DockLayoutMode = 'icon' | 'icon-text';

export interface DockDisplayConfig {
    icon: string;
    iconActive?: string;
    text?: string;
    i18nKey?: string;
}

export interface DockActionItem {
    type: 'action';
    action: string;
    display: DockDisplayConfig;
}

export interface DockPanelItem {
    type: 'panel';
    panel: string;
    display: DockDisplayConfig;
}

export interface DockLinkItem {
    type: 'link';
    href: string;
    openInNewTab?: boolean;
    display: DockDisplayConfig;
}

export interface DockDividerItem {
    type: 'divider';
}

export type DockItem = DockActionItem | DockPanelItem | DockLinkItem | DockDividerItem;

export interface DockConfig {
    items: DockItem[];
}

export interface ProfileConfig {
    name: string;
    status: string;
    avatar: string;
}

export interface SocialLink {
    name: string;
    url: string;
    icon?: string;
    color?: string;
}

export interface SocialLinksConfig {
    colorScheme: SocialColorScheme;
    links: SocialLink[];
}

export interface FooterConfig {
    text: string;
}

export interface SlogansConfig {
    list: string[];
    mode: SloganMode;
    typeSpeed: number;
    pauseDuration: number;
    loop: boolean;
}

export interface TimeConfig {
    format: ClockFormat;
    showWeekday: boolean;
    showDate: boolean;
    updateInterval: number;
}

export interface LoadingConfig {
    texts: string[];
    textSwitchInterval: number;
}

export interface WallpaperInfiniteScrollConfig {
    enabled: boolean;
    speed: number;
    batchSize: number;
    maxImages: number;
}

export interface WallpaperConfig {
    apis: string[];
    raceTimeout: number;
    maxRetries: number;
    preloadCount: number;
    infiniteScroll: WallpaperInfiniteScrollConfig;
}

export interface AnimationConfig {
    cursorStyle: CursorStyle;
}

export interface ContentProtectionConfig {
    preventCopyAndDrag: boolean;
}

export interface DebugConfig {
    consoleLog: boolean;
}

export interface ScrollRevealConfig {
    enabled: boolean;
    offset: number;
    delay: number;
}

export interface EffectsConfig {
    scrollReveal: ScrollRevealConfig;
}

export interface I18nConfig {
    defaultLocale: Locale;
    locales: Locale[];
}

export interface SiteConfig {
    version: string;
    title: string;
    description: string;
    lang: string;
    themeColor: string;
    profile: ProfileConfig;
    socialLinks: SocialLinksConfig;
    footer: FooterConfig;
    slogans: SlogansConfig;
    time: TimeConfig;
    loading: LoadingConfig;
    wallpaper: WallpaperConfig;
    animation: AnimationConfig;
    contentProtection: ContentProtectionConfig;
    debug: DebugConfig;
    effects: EffectsConfig;
    i18n: I18nConfig;
    dock: DockConfig;
}
