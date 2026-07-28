'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useTranslations, useLocale } from 'next-intl';
import { CookieBanner } from '@/components/CookieBanner';
import { CookiePreferencesDialog } from '@/components/CookiePreferencesDialog';
import {
  type ConsentCategory,
  type ConsentRecord,
  type OptionalSelection,
  buildConsentRecord,
  canRun as canRunGate,
  clearLocalePreference,
  defaultCategories,
  persistLocalePreference,
  readStoredConsent,
  writeStoredConsent,
} from '@/lib/consent';

type ToastKind = 'acceptedAll' | 'rejectedAll' | 'saved' | 'revoked' | 'error';

const TOASTS: Record<ToastKind, { key: string; severity: 'success' | 'error' }> = {
  acceptedAll: { key: 'toasts.acceptedAll', severity: 'success' },
  rejectedAll: { key: 'toasts.rejectedAll', severity: 'success' },
  saved: { key: 'toasts.saved', severity: 'success' },
  revoked: { key: 'toasts.revoked', severity: 'success' },
  error: { key: 'toasts.error', severity: 'error' },
};

interface ConsentContextValue {
  /** Current (non-expired) consent, or null when the banner is due. */
  consent: ConsentRecord | null;
  /** True once localStorage has been read (avoids SSR/first-paint banner flash). */
  hydrated: boolean;
  /** True when the first-visit banner should be shown. */
  bannerVisible: boolean;
  /** True while the Tercih Merkezi dialog is open. */
  preferencesOpen: boolean;
  /** The default-deny gate — optional scripts call this before running. */
  canRun: (category: ConsentCategory) => boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (selection: OptionalSelection) => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('cookieConsent');
  const locale = useLocale();
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [toast, setToast] = useState<ToastKind | null>(null);

  // Hydrate the stored decision after mount. The server renders nothing (banner
  // hidden), so this cannot cause a hydration mismatch and no optional cookie or
  // script can be gated-in before this runs (default-deny until hydrated).
  useEffect(() => {
    const now = Date.now();
    const stored = readStoredConsent(now);
    // KVKK: NEXT_LOCALE is a functional cookie — it must never linger without a
    // *current* İşlevsel grant. Expired / version-mismatched / legacy (pre-FBG-395)
    // state leaves `stored` without that grant (readStoredConsent already drops
    // stale records), so evict any orphan cookie on load — not only on an explicit
    // reject/withdraw. Without this, a re-prompt shows the banner while an optional
    // cookie is still in effect (and read server-side).
    if (!canRunGate('functional', stored, now)) {
      clearLocalePreference();
    }
    setConsent(stored);
    setHydrated(true);
  }, []);

  const bannerVisible = hydrated && consent === null;

  const canRun = useCallback(
    (category: ConsentCategory) => canRunGate(category, consent, Date.now()),
    [consent],
  );

  /**
   * Commit a decision: persist it, sync NEXT_LOCALE to the new functional state,
   * update React state and toast. If storage fails nothing is committed — the
   * error toast shows and the banner stays up.
   */
  const applyDecision = useCallback(
    (record: ConsentRecord, kind: ToastKind) => {
      try {
        writeStoredConsent(record);
      } catch {
        setToast('error');
        return;
      }
      // İşlevsel side-effects: remember the current language, or drop it on withdrawal.
      if (record.categories.functional) {
        persistLocalePreference(locale);
      } else {
        clearLocalePreference();
      }
      setConsent(record);
      setPreferencesOpen(false);
      setToast(kind);
    },
    [locale],
  );

  const acceptAll = useCallback(() => {
    applyDecision(
      buildConsentRecord('accepted_all', { functional: true, analytics: true, marketing: true }),
      'acceptedAll',
    );
  }, [applyDecision]);

  const rejectAll = useCallback(() => {
    applyDecision(
      buildConsentRecord('rejected_all', { functional: false, analytics: false, marketing: false }),
      'rejectedAll',
    );
  }, [applyDecision]);

  const savePreferences = useCallback(
    (selection: OptionalSelection) => {
      const prev = consent ? consent.categories : defaultCategories();
      const allOn = selection.functional && selection.analytics && selection.marketing;
      const allOff = !selection.functional && !selection.analytics && !selection.marketing;
      const status = allOn ? 'accepted_all' : allOff ? 'rejected_all' : 'custom';
      // The "Onayınız geri alındı. İsteğe bağlı çerezler devre dışı bırakıldı."
      // toast asserts that ALL optional cookies are now off, so it may only fire on
      // a *full* withdrawal: there was some optional grant before and every optional
      // category is now off. A partial change (one category off while others stay
      // on) is a neutral update ("…başarıyla güncellendi.").
      const prevHadOptional = prev.functional || prev.analytics || prev.marketing;
      const toast = prevHadOptional && allOff ? 'revoked' : 'saved';
      applyDecision(buildConsentRecord(status, selection), toast);
    },
    [applyDecision, consent],
  );

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hydrated,
      bannerVisible,
      preferencesOpen,
      canRun,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectAll,
      savePreferences,
    }),
    [
      consent,
      hydrated,
      bannerVisible,
      preferencesOpen,
      canRun,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectAll,
      savePreferences,
    ],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <CookieBanner />
      <CookiePreferencesDialog />
      {toast && (
        <Snackbar
          open
          autoHideDuration={3000}
          onClose={() => setToast(null)}
          // The error toast coincides with an open banner (nothing was saved), so
          // anchor it at the top to avoid overlapping the bottom banner; the rest
          // fire after the banner has closed and sit at the bottom as usual.
          anchorOrigin={{
            vertical: toast === 'error' ? 'top' : 'bottom',
            horizontal: 'center',
          }}
          // Keep the toast above the fixed banner (zIndex 1250).
          sx={{ zIndex: (theme) => theme.zIndex.snackbar + 2 }}
        >
          <Alert
            severity={TOASTS[toast].severity}
            variant="filled"
            onClose={() => setToast(null)}
          >
            {t(TOASTS[toast].key)}
          </Alert>
        </Snackbar>
      )}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within CookieConsentProvider');
  return ctx;
}
