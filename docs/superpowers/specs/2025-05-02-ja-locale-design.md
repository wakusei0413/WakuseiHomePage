# Design: Add Japanese (ja) Locale

Date: 2025-05-02
Version: 1.8.5+

## Goal
Add full Japanese locale support (`ja`) with native date formatting style: `5月2日（土）`.

## Translation Content

### Dock labels (ja)
- `dock.theme`: テーマ
- `dock.language`: 言語
- `dock.settings`: 設定
- `dock.theme.light`: ライト
- `dock.theme.dark`: ダーク
- `dock.lang.zh-CN`: 中文
- `dock.lang.en`: English
- `dock.lang.ja`: 日本語
- `dock.settings.coming-soon`: 近日公開

### Time format (ja)
- Weekdays: 日, 月, 火, 水, 木, 金, 土
- Months: 1月 … 12月
- Date display: `{month}{day}日` → `5月2日`
- Weekday display: `{weekday}` → `土`

## Type & Schema Changes
- `Locale` union: `'zh-CN' | 'en' | 'ja'`
- `i18nSchema` Zod enum: `['zh-CN', 'en', 'ja']`

## Files to Modify
1. `src/types/site.ts`
2. `src/data/schema.ts`
3. `src/data/i18n.ts`
4. `src/data/customize.ts`
5. `src/lib/time.ts`
6. `src/components/NavigationDock.tsx`
7. `tests/*.test.ts`

## Fallback Strategy
If a translation key is missing in `ja`, fallback to `config.defaultLocale` (`zh-CN` by default).

## Test Plan
- Schema test: validate `locales` accepts `ja`
- Time test: verify `ja` weekday and date parts
- i18n test: verify `t()` lookup for `ja` keys
