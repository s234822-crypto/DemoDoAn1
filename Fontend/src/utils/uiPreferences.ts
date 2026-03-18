export const UI_PREFS_STORAGE_KEY = 'daivid_ui_prefs';
export const UI_PREFS_UPDATED_EVENT = 'daivid:prefs-updated';

export type AppPageKey = 'dashboard' | 'patients' | 'reports' | 'analytics' | 'personalization';

export interface UiPreferences {
    displayName: string;
    defaultPage: AppPageKey;
    autoScrollPrediction: boolean;
    reducedMotion: boolean;
    fontScalePercent: 90 | 100 | 110;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
    displayName: '',
    defaultPage: 'dashboard',
    autoScrollPrediction: true,
    reducedMotion: false,
    fontScalePercent: 100,
};

function asPageKey(value: string | undefined): AppPageKey {
    const valid: AppPageKey[] = ['dashboard', 'patients', 'reports', 'analytics', 'personalization'];
    return valid.includes(value as AppPageKey) ? (value as AppPageKey) : 'dashboard';
}

export function readUiPreferences(): UiPreferences {
    try {
        const raw = localStorage.getItem(UI_PREFS_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_UI_PREFERENCES };
        const parsed = JSON.parse(raw) || {};
        return {
            displayName: String(parsed.displayName || ''),
            defaultPage: asPageKey(parsed.defaultPage),
            autoScrollPrediction: parsed.autoScrollPrediction !== false,
            reducedMotion: Boolean(parsed.reducedMotion),
            fontScalePercent: parsed.fontScalePercent === 90 || parsed.fontScalePercent === 110 ? parsed.fontScalePercent : 100,
        };
    } catch {
        return { ...DEFAULT_UI_PREFERENCES };
    }
}

export function saveUiPreferences(next: UiPreferences): UiPreferences {
    const normalized: UiPreferences = {
        displayName: next.displayName.trim(),
        defaultPage: asPageKey(next.defaultPage),
        autoScrollPrediction: Boolean(next.autoScrollPrediction),
        reducedMotion: Boolean(next.reducedMotion),
        fontScalePercent: next.fontScalePercent === 90 || next.fontScalePercent === 110 ? next.fontScalePercent : 100,
    };

    localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(UI_PREFS_UPDATED_EVENT, { detail: normalized }));
    return normalized;
}

export function applyUiPreferences(prefs: UiPreferences): void {
    document.documentElement.style.fontSize = `${prefs.fontScalePercent}%`;

    const styleId = 'daivid-reduced-motion-style';
    const existing = document.getElementById(styleId);
    if (prefs.reducedMotion) {
        if (!existing) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
            document.head.appendChild(style);
        }
    } else if (existing) {
        existing.remove();
    }
}
