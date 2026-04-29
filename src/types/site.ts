export type SocialColorScheme = 'cycle' | 'same';
export type SloganMode = 'random' | 'sequence';
export type ClockFormat = '12h' | '24h';
export type CursorStyle = 'block' | 'line';

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
}
