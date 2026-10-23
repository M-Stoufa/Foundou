import { useRef, useState } from 'react';
import { ArrowLeft, Lock, Mail, TriangleAlert } from 'lucide-react';
import { publishedCategories, allItems } from '../data/menu';
import { currentMenu } from '../data/menuStorage';
import { Brand } from '../components/Brand';
import { supabase, supabaseConfigured } from '../lib/supabase';

interface AdminLoginProps {
  onEnter: () => void;
}

export function AdminLogin({ onEnter }: AdminLoginProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menu = currentMenu();
  const categories = publishedCategories(menu);
  const published = categories.reduce((total, category) => total + category.items.length, 0);
  const pending = allItems(menu).filter((item) => item.status === 'pending').length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    const email = emailRef.current?.value.trim() ?? '';
    const password = passwordRef.current?.value ?? '';

    if (!supabase) {
      setError(
        'Connexion indisponible : la configuration Supabase est absente de ce déploiement.',
      );
      setBusy(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Identifiants incorrects.");
        setBusy(false);
        return;
      }

      const user = data.user;
      if (!user) {
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
        setError("Vérification des droits impossible.");
        setBusy(false);
        return;
      }

      if (!ownerRow) {
        await supabase.auth.signOut();
        setError("Ce compte n'est pas autorisé à accéder à l'espace propriétaire.");
        setBusy(false);
        return;
      }

      onEnter();
    } catch {
      setError("Une erreur est survenue lors de la connexion.");
      setBusy(false);
    }
  };

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
                  ? 'Seul le compte présent dans la liste autorisée peut se connecter. Les identifiants sont vérifiés par Supabase Auth.'
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
                  disabled={busy}
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
                  disabled={busy}
                />
              </div>
            </div>

            {error ? <p className="login__error">{error}</p> : null}

            <button type="submit" className="button login__submit" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
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
