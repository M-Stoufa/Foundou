import { useRef, useState } from 'react';
import { ArrowLeft, Lock, Mail, TriangleAlert } from 'lucide-react';
import { publishedCategories, allItems } from '../data/menu';
import { currentMenu } from '../data/menuStorage';
import { Brand } from '../components/Brand';

interface AdminLoginProps {
  onEnter: () => void;
}

const DEMO_EMAIL = 'demo@cafefoundou.tn';
const DEMO_PASSWORD = 'demo-foundou';

/**
 * The sign-in screen is a DESIGN PROTOTYPE.
 *
 * The two inputs are intentionally uncontrolled: their values are never read
 * into React state, never validated, never stored and never sent anywhere.
 * Submitting only moves to the dashboard. The screen says so, twice, because
 * a login form that looks secure but checks nothing must not pretend otherwise.
 */
export function AdminLogin({ onEnter }: AdminLoginProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const menu = currentMenu();
  const categories = publishedCategories(menu);
  const published = categories.reduce((total, category) => total + category.items.length, 0);
  const pending = allItems(menu).filter((item) => item.status === 'pending').length;

  const fillDemo = () => {
    if (emailRef.current) emailRef.current.value = DEMO_EMAIL;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    // No credential is inspected. This is a timed transition, not an auth call.
    window.setTimeout(() => {
      setBusy(false);
      onEnter();
    }, 650);
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
              <p className="login__notice-title">Prototype de démonstration</p>
              <p className="login__notice-text">
                N’utilisez pas de vrais identifiants. Ce formulaire n’est relié à aucun serveur :
                aucune vérification n’est faite et les identifiants ne sont ni envoyés ni
                conservés. Les modifications de la carte restent dans ce navigateur.
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
                  autoComplete="off"
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
                  autoComplete="off"
                  required
                  disabled={busy}
                />
              </div>
            </div>

            <button type="submit" className="button login__submit" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="login__demo">
            <p>Pas envie de taper quoi que ce soit ?</p>
            <button type="button" className="login__demo-btn" onClick={fillDemo} disabled={busy}>
              Remplir le compte de démonstration
            </button>
          </div>

          <a className="login__back" href="#/">
            <ArrowLeft size={15} aria-hidden="true" />
            Retour au menu
          </a>
        </div>
      </main>
    </div>
  );
}
