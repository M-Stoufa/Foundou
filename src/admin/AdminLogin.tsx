import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, Mail, TriangleAlert } from 'lucide-react';
import { publishedCategories, allItems } from '../data/menu';
import { currentMenu } from '../data/menuStorage';
import { Brand } from '../components/Brand';
import { supabase, supabaseConfigured } from '../lib/supabase';
import {
  formatTimeLeft,
  getLoginRateLimitStatus,
  recordLoginFailure,
  recordLoginSuccess,
  type LoginRateLimitStatus,
} from '../lib/loginRateLimit';

interface AdminLoginProps {
  onEnter: () => void;
}

export function AdminLogin({ onEnter }: AdminLoginProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateStatus, setRateStatus] = useState<LoginRateLimitStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const menu = currentMenu();
  const categories = publishedCategories(menu);
  const published = categories.reduce((total, category) => total + category.items.length, 0);
  const pending = allItems(menu).filter((item) => item.status === 'pending').length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshRateStatus = () => {
    const email = emailRef.current?.value.trim() ?? '';
    if (!email) {
      setRateStatus(null);
      return;
    }
    setRateStatus(getLoginRateLimitStatus(email));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const email = emailRef.current?.value.trim() ?? '';
    const password = passwordRef.current?.value ?? '';

    if (!email) {
      setError('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    const status = getLoginRateLimitStatus(email);
    setRateStatus(status);

    if (status.blocked && status.blockedUntil && status.blockedUntil > Date.now()) {
      setError(
        `Trop de tentatives échouées. Accès à l'espace propriétaire bloqué pendant ${formatTimeLeft(
          status.blockedUntil - Date.now(),
        )}.`,
      );
      return;
    }

    if (!supabaseConfigured || !supabase) {
      setError(
        'Connexion indisponible : la configuration Supabase est absente de ce déploiement.',
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const failure = recordLoginFailure(email);
        setRateStatus(failure);
        if (failure.blocked && failure.blockedUntil) {
          setError(
            `Trop de tentatives échouées. Accès à l'espace propriétaire bloqué pendant ${formatTimeLeft(
              failure.blockedUntil - Date.now(),
            )}.`,
          );
        } else {
          setError(
            `Identifiants incorrects. Il vous reste ${failure.remaining} tentative${
              failure.remaining > 1 ? 's' : ''
            } sur ${failure.maxAttempts} avant blocage d'1 heure.`,
          );
        }
        setBusy(false);
        return;
      }

      const user = data.user;
      if (!user) {
        const failure = recordLoginFailure(email);
        setRateStatus(failure);
        setError("Impossible de se connecter.");
        setBusy(false);
        return;
      }

      const { data: ownerRow, error: ownerError } = await supabase
        .from('owners')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownerError) {
        await supabase.auth.signOut();
        const failure = recordLoginFailure(email);
        setRateStatus(failure);
        setError("Vérification des droits impossible.");
        setBusy(false);
        return;
      }

      if (!ownerRow) {
        await supabase.auth.signOut();
        const failure = recordLoginFailure(email);
        setRateStatus(failure);
        setError("Ce compte n'est pas autorisé à accéder à l'espace propriétaire.");
        setBusy(false);
        return;
      }

      recordLoginSuccess(email);
      setRateStatus(null);
      onEnter();
    } catch {
      const failure = recordLoginFailure(email);
      setRateStatus(failure);
      setError("Une erreur est survenue lors de la connexion.");
      setBusy(false);
    }
  };

  const blockedNow =
    rateStatus?.blocked && rateStatus.blockedUntil && rateStatus.blockedUntil > now
      ? rateStatus.blockedUntil
      : null;
  const isBlocked = Boolean(blockedNow);

  return (
    <div className="login">
      <aside className="login__aside tone-espresso">
        <div className="login__aside-top">
          <Brand variant="mark" className="login__mark" />
          <p className="eyebrow login__eyebrow">Espace propriétaire</p>
          <h1 className="login__wordmark">Café Foundou</h1>
        </div>

        <dl className="login__facts">
          <div>
            <dt>Articles publiés</dt>
            <dd>{published}</dd>
          </div>
          <div>
            <dt>Catégories</dt>
            <dd>{categories.length}</dd>
          </div>
          <div>
            <dt>Prix à confirmer</dt>
            <dd>{pending}</dd>
          </div>
        </dl>

        <p className="login__aside-note">Gestion de la carte et des prix, en dinars tunisiens.</p>
      </aside>

      <main className="login__main">
        <div className="login__card">
          <p className="login__kicker">
            <Lock size={14} aria-hidden="true" />
            Connexion
          </p>
          <h2 className="login__title">Accéder à la carte</h2>
          <p className="login__lede">
            Un seul compte propriétaire. Modifiez les prix, masquez un article et réorganisez
            les catégories.
          </p>

          <div className="login__notice" role="note">
            <TriangleAlert size={18} aria-hidden="true" className="login__notice-icon" />
            <div>
              <p className="login__notice-title">
                {supabaseConfigured ? 'Accès restreint' : 'Configuration manquante'}
              </p>
              <p className="login__notice-text">
                {supabaseConfigured
                  ? "Seul le compte présent dans la liste autorisée peut se connecter. Après 5 tentatives incorrectes consécutives pour le même e-mail, l'accès est temporairement bloqué pendant 1 heure."
                  : 'Ce déploiement ne contient pas les variables Supabase. La connexion est désactivée ; le menu public reste disponible.'}
              </p>
            </div>
          </div>

          <form className="login__form" onSubmit={submit}>
            <div className="field">
              <label className="field__label" htmlFor="admin-email">
                Adresse e-mail
              </label>
              <div className="field__row">
                <Mail size={16} aria-hidden="true" className="field__icon" />
                <input
                  className="field__input field__input--icon"
                  id="admin-email"
                  name="owner-email"
                  type="email"
                  ref={emailRef}
                  placeholder="vous@exemple.tn"
                  autoComplete="email"
                  required
                  disabled={busy || isBlocked}
                  onBlur={refreshRateStatus}
                  onChange={() => {
                    setError(null);
                    refreshRateStatus();
                  }}
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="admin-password">
                Mot de passe
              </label>
              <div className="field__row">
                <Lock size={16} aria-hidden="true" className="field__icon" />
                <input
                  className="field__input field__input--icon"
                  id="admin-password"
                  name="owner-password"
                  type="password"
                  ref={passwordRef}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={busy || isBlocked}
                />
              </div>
            </div>

            {rateStatus && !isBlocked && rateStatus.attemptsUsed > 0 ? (
              <p className="login__hint">
                Tentatives utilisées : {rateStatus.attemptsUsed}/{rateStatus.maxAttempts} — Il vous
                reste {rateStatus.remaining} tentative{rateStatus.remaining > 1 ? 's' : ''}.
              </p>
            ) : null}

            {isBlocked && blockedNow ? (
              <p className="login__hint login__hint--warn">
                Blocage actif — Réessai possible dans {formatTimeLeft(blockedNow - now)}
              </p>
            ) : null}

            {error ? <p className="login__error">{error}</p> : null}

            <button type="submit" className="button login__submit" disabled={busy || isBlocked}>
              {isBlocked ? 'Accès temporairement bloqué' : busy ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <a className="login__back" href="#/">
            <ArrowLeft size={15} aria-hidden="true" />
            Retour au menu
          </a>
        </div>
      </main>
    </div>
  );
}
