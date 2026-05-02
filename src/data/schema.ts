import { z } from 'zod';

const socialLinkSchema = z.object({
    name: z.string().min(1),
    url: z.string().min(1),
    icon: z.string().min(1).optional(),
    color: z.string().min(1).optional()
});

const dockItemSchema = z.union([
    z.object({
        type: z.literal('action'),
        action: z.string().min(1),
        display: z.object({
            icon: z.string().min(1),
            iconActive: z.string().min(1).optional(),
            text: z.string().min(1).optional(),
            i18nKey: z.string().optional()
        })
    }),
    z.object({
        type: z.literal('panel'),
        panel: z.string().min(1),
        display: z.object({
            icon: z.string().min(1),
            iconActive: z.string().min(1).optional(),
            text: z.string().min(1).optional(),
            i18nKey: z.string().optional()
        })
    }),
    z.object({
        type: z.literal('link'),
        href: z.string().min(1),
        openInNewTab: z.boolean().optional(),
        display: z.object({
            icon: z.string().min(1),
            iconActive: z.string().min(1).optional(),
            text: z.string().min(1).optional(),
            i18nKey: z.string().optional()
        })
    }),
    z.object({
        type: z.literal('divider')
    })
]);

const dockSchema = z.object({
    items: z.array(dockItemSchema)
});

const i18nSchema = z.object({
    defaultLocale: z.enum(['zh-CN', 'en', 'ja']),
    locales: z.array(z.enum(['zh-CN', 'en', 'ja'])).min(1)
});

export const siteConfigSchema = z.object({
    version: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    lang: z.string().min(1),
    themeColor: z.string().min(1),
    profile: z.object({
        name: z.string().min(1),
        status: z.string().min(1),
        avatar: z.string().min(1)
    }),
    socialLinks: z.object({
        colorScheme: z.enum(['cycle', 'same']),
        links: z.array(socialLinkSchema).min(1)
    }),
    footer: z.object({
        text: z.string().min(1)
    }),
    slogans: z.object({
        list: z.array(z.string().min(1)).min(1),
        mode: z.enum(['random', 'sequence']),
        typeSpeed: z.number().positive(),
        pauseDuration: z.number().positive(),
        loop: z.boolean()
    }),
    time: z.object({
        format: z.enum(['12h', '24h']),
        showWeekday: z.boolean(),
        showDate: z.boolean(),
        updateInterval: z.number().positive()
    }),
    loading: z.object({
        texts: z.array(z.string().min(1)).min(1),
        textSwitchInterval: z.number().positive()
    }),
    wallpaper: z.object({
        apis: z.array(z.string().min(1)).min(1),
        raceTimeout: z.number().positive(),
        maxRetries: z.number().positive(),
        preloadCount: z.number().positive(),
        infiniteScroll: z.object({
            enabled: z.boolean(),
            speed: z.number().positive(),
            batchSize: z.number().positive(),
            maxImages: z.number().positive()
        })
    }),
    animation: z.object({
        cursorStyle: z.enum(['block', 'line'])
    }),
    contentProtection: z.object({
        preventCopyAndDrag: z.boolean()
    }),
    debug: z.object({
        consoleLog: z.boolean()
    }),
    effects: z.object({
        scrollReveal: z.object({
            enabled: z.boolean(),
            offset: z.number().nonnegative(),
            delay: z.number().nonnegative()
        })
    }),
    i18n: i18nSchema,
    dock: dockSchema
});

export type ParsedSiteConfig = z.infer<typeof siteConfigSchema>;

export function parseSiteConfig(value: unknown): ParsedSiteConfig {
    const result = siteConfigSchema.safeParse(value);
    if (!result.success) {
        const issues = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
        throw new Error(`Site config validation failed:\n${issues}`);
    }
    return result.data;
}
