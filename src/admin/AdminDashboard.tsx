import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  Layers,
  Pencil,
  Plus,
  ShieldCheck,
  TriangleAlert,
  Trash,
} from 'lucide-react';
import { type MenuCategory, type MenuItem } from '../data/menu';
import { isDefaultMenu } from '../data/menuStorage';
import { formatPriceWithUnit } from '../lib/price';
import { findItem, uniqueItemId, type DraftAction, type DraftState } from './draftStore';
import { publishMenuToSupabase } from '../lib/supabaseMenu';
import { Brand } from '../components/Brand';
import { CategoryManager } from './CategoryManager';
import { ConfirmDialog } from './ConfirmDialog';
import { ItemEditor, type ItemDraft } from './ItemEditor';
import { Modal } from './Modal';
import type { NotifyFn } from './Toasts';

interface AdminDashboardProps {
  state: DraftState;
  dispatch: React.Dispatch<DraftAction>;
  notify: NotifyFn;
  /** True when the browser refused the last localStorage write. */
  storageFailed: boolean;
  onLogout: () => void;
}

type EditorState = { mode: 'add'; categoryId: string } | { mode: 'edit'; itemId: string };

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  busyLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

function itemState(item: MenuItem): { key: 'live' | 'hidden' | 'pending'; label: string } {
  if (item.status === 'pending' || item.price === null)
    return { key: 'pending', label: 'À confirmer' };
  if (!item.visible) return { key: 'hidden', label: 'Masqué' };
  return { key: 'live', label: 'Publié' };
}

export function AdminDashboard({
  state,
  dispatch,
  notify,
  storageFailed,
  onLogout,
}: AdminDashboardProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const items = useMemo(
    () => state.categories.flatMap((category) => category.items),
    [state.categories],
  );
  const live = items.filter((item) => itemState(item).key === 'live').length;
  const hidden = items.filter((item) => !item.visible).length;
  const pending = items.filter((item) => item.status === 'pending').length;
  const dirty = !isDefaultMenu(state.categories);

  const categoryOf = (itemId: string): MenuCategory | null => {
    const found = findItem(state.categories, itemId);
    if (!found) return null;
    return state.categories.find((category) => category.id === found.categoryId) ?? null;
  };

  const editorCategory =
    editor === null
      ? null
      : editor.mode === 'add'
        ? (state.categories.find((category) => category.id === editor.categoryId) ?? null)
        : categoryOf(editor.itemId);

  const editorItem =
    editor?.mode === 'edit' ? (findItem(state.categories, editor.itemId)?.item ?? null) : undefined;

  const saveItem = (values: ItemDraft) => {
    if (!editor || !editorCategory) return;

    if (editor.mode === 'add') {
      const item: MenuItem = {
        id: uniqueItemId(state.categories, values.name),
        name: values.name,
        price: values.price,
        status: values.price === null ? 'pending' : 'confirmed',
        visible: true,
        source: 'owner-update',
        ...(values.note ? { note: values.note } : {}),
      };
      dispatch({ type: 'add-item', categoryId: values.categoryId, item });
      notify(`« ${values.name} » ajouté · brouillon local`);
    } else {
      dispatch({
        type: 'update-item',
        itemId: editor.itemId,
        patch: {
          name: values.name,
          price: values.price,
          status: values.price === null ? 'pending' : 'confirmed',
          note: values.note,
          categoryId: values.categoryId,
        },
      });
      const moved = values.categoryId !== editorCategory.id;
      notify(
        moved
          ? `« ${values.name} » déplacé vers « ${state.categories.find((c) => c.id === values.categoryId)?.name ?? ''} » · brouillon local`
          : `« ${values.name} » mis à jour · brouillon local`,
      );
    }
    setEditor(null);
  };

  const askDelete = (item: MenuItem) => {
    setConfirm({
      title: 'Supprimer cet article ?',
      body: `« ${item.name} » sera retiré du brouillon local de ce navigateur. La modification est immédiate ; « Réinitialiser » permet de revenir à la carte d’origine.`,
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: () => {
        dispatch({ type: 'remove-item', itemId: item.id });
        setConfirm(null);
        notify(`« ${item.name} » supprimé · brouillon local`, 'warn');
      },
    });
  };

  const askReset = () => {
    setConfirm({
      title: 'Réinitialiser la carte ?',
      body: 'Toutes les modifications enregistrées dans ce navigateur seront perdues et la carte d’origine à huit catégories sera restaurée. Les autres appareils ne sont pas concernés.',
      confirmLabel: 'Réinitialiser',
      busyLabel: 'Réinitialisation…',
      danger: true,
      onConfirm: () => {
        dispatch({ type: 'reset' });
        setConfirm(null);
        notify('Carte d’origine restaurée', 'info');
      },
    });
  };

  return (
    <div className="admin">
      <header className="admin__bar tone-espresso">
        <div className="admin__bar-inner">
          <div className="admin__identity">
            <Brand variant="mark" className="admin__mark" onDark />
            <div className="admin__identity-text">
              <p className="admin__shop">Café Foundou</p>
              <p className="admin__role">Espace propriétaire</p>
            </div>
          </div>

          <div className="admin__bar-actions">
            <a className="admin__bar-link" href="#/" onClick={() => undefined}>
              <ArrowLeft size={15} aria-hidden="true" />
              Voir le menu
            </a>
            <button type="button" className="admin__logout" onClick={onLogout}>
              Quitter
            </button>
          </div>
        </div>
      </header>

      <div className="admin__notice" role="note">
        <TriangleAlert size={17} aria-hidden="true" className="admin__notice-icon" />
        <p>
          <strong>Prototype local.</strong> La connexion est vérifiée par Supabase Auth, mais cette
          page n’écrit rien sur un serveur. Les modifications restent{' '}
          <strong>dans ce navigateur</strong> : les visiteurs d’un autre appareil voient toujours la
          carte d’origine.
        </p>
      </div>

      {storageFailed ? (
        <div className="admin__storage-alert" role="alert">
          <TriangleAlert size={17} aria-hidden="true" className="admin__storage-alert-icon" />
          <p>
            <strong>Stockage local indisponible.</strong> Les modifications restent actives dans cet
            onglet, mais elles seront perdues au rechargement. Autorisez le stockage du site ou
            libérez de l’espace, puis recommencez.
          </p>
        </div>
      ) : null}

      <main className="admin__main">
        <header className="admin-head">
          <div className="admin-head__text">
            <p className="eyebrow">Carte</p>
            <h1 className="admin-title">Le menu</h1>
            <p className="admin-sub">
              {live} article{live > 1 ? 's' : ''} publié{live > 1 ? 's' : ''} sur {items.length}
              {dirty ? <span className="admin-dirty">Brouillon local</span> : null}
            </p>
          </div>
          <div className="admin-head__actions">
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => setCategoriesOpen(true)}
            >
              <Layers size={15} aria-hidden="true" />
              Catégories
            </button>
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={askReset}
              disabled={!dirty}
            >
              Réinitialiser
            </button>
            <button
              type="button"
              className="button button--sm"
              onClick={() => setPublishOpen(true)}
              disabled={publishing}
            >
              Publier
            </button>
          </div>
        </header>

        <ul className="astats">
          <li className="astat">
            <p className="astat__value">{live}</p>
            <p className="astat__label">Publiés</p>
          </li>
          <li className="astat">
            <p className="astat__value">{hidden}</p>
            <p className="astat__label">Masqués</p>
          </li>
          <li className="astat astat--warn">
            <p className="astat__value">{pending}</p>
            <p className="astat__label">À confirmer</p>
          </li>
        </ul>

        <div className="acats">
          {state.categories.map((category, index) => {
            const canUp = index > 0;
            const canDown = index < state.categories.length - 1;
            return (
              <section className="acat" key={category.id} aria-labelledby={`acat-${category.id}`}>
                <header className="acat__head">
                  <div className="acat__id">
                    <span className="acat__num" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 className="acat__name" id={`acat-${category.id}`}>
                      {category.name}
                    </h2>
                    {category.isDefault ? (
                      <span
                        className="acat__default"
                        title="Catégorie d’origine — suppression protégée"
                      >
                        <ShieldCheck size={11} aria-hidden="true" />
                        D’origine
                      </span>
                    ) : null}
                    <span className="acat__count">
                      {category.items.length} article{category.items.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="acat__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Monter la catégorie ${category.name}`}
                      title="Monter la catégorie"
                      disabled={!canUp}
                      onClick={() =>
                        dispatch({
                          type: 'move-category',
                          categoryId: category.id,
                          direction: 'up',
                        })
                      }
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Descendre la catégorie ${category.name}`}
                      title="Descendre la catégorie"
                      disabled={!canDown}
                      onClick={() =>
                        dispatch({
                          type: 'move-category',
                          categoryId: category.id,
                          direction: 'down',
                        })
                      }
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--sm acat__add"
                      onClick={() => setEditor({ mode: 'add', categoryId: category.id })}
                    >
                      <Plus size={14} aria-hidden="true" />
                      Ajouter
                    </button>
                  </div>
                </header>

                {category.items.length === 0 ? (
                  <p className="acat__empty">
                    Aucun article dans cette catégorie. Elle n’apparaît pas sur le menu public.
                  </p>
                ) : (
                  <ul className="aitems">
                    {category.items.map((item, itemIndex) => {
                      const status = itemState(item);
                      const canMoveUp = itemIndex > 0;
                      const canMoveDown = itemIndex < category.items.length - 1;
                      return (
                        <li
                          className={`aitem${item.visible ? '' : ' is-hidden'}${
                            status.key === 'pending' ? ' is-pending' : ''
                          }`}
                          key={item.id}
                        >
                          <div className="aitem__main">
                            <p className="aitem__name">
                              {item.name}
                              {item.note ? <span className="aitem__note"> {item.note}</span> : null}
                            </p>
                            <div className="aitem__meta">
                              <span className="aitem__price tnum">
                                {item.price === null ? '—' : formatPriceWithUnit(item.price)}
                              </span>
                              <span className={`chip chip--${status.key}`}>{status.label}</span>
                            </div>
                          </div>

                          <div className="aitem__actions">
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Monter ${item.name}`}
                              title="Monter"
                              disabled={!canMoveUp}
                              onClick={() =>
                                dispatch({ type: 'move-item', itemId: item.id, direction: 'up' })
                              }
                            >
                              <ArrowUp size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Descendre ${item.name}`}
                              title="Descendre"
                              disabled={!canMoveDown}
                              onClick={() =>
                                dispatch({ type: 'move-item', itemId: item.id, direction: 'down' })
                              }
                            >
                              <ArrowDown size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Modifier ${item.name}`}
                              title="Modifier"
                              onClick={() => setEditor({ mode: 'edit', itemId: item.id })}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`${item.visible ? 'Masquer' : 'Afficher'} ${item.name}`}
                              title={item.visible ? 'Masquer' : 'Afficher'}
                              onClick={() => {
                                dispatch({ type: 'toggle-item', itemId: item.id });
                                notify(
                                  `« ${item.name} » ${item.visible ? 'masqué' : 'réaffiché'} · brouillon local`,
                                  item.visible ? 'info' : 'success',
                                );
                              }}
                            >
                              {item.visible ? (
                                <EyeOff size={15} aria-hidden="true" />
                              ) : (
                                <Eye size={15} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              aria-label={`Supprimer ${item.name}`}
                              title="Supprimer"
                              onClick={() => askDelete(item)}
                            >
                              <Trash size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <footer className="admin__foot">
          <p>
            Les prix sont en dinars tunisiens. Les articles « à confirmer » n’apparaissent jamais
            sur le menu public. Les modifications sont enregistrées dans ce navigateur uniquement.
          </p>
        </footer>
      </main>

      {editor && editorCategory ? (
        <ItemEditor
          mode={editor.mode}
          categories={state.categories}
          category={editorCategory}
          item={editorItem ?? undefined}
          onClose={() => setEditor(null)}
          onSave={saveItem}
        />
      ) : null}

      {categoriesOpen ? (
        <CategoryManager
          categories={state.categories}
          dispatch={dispatch}
          notify={notify}
          onClose={() => setCategoriesOpen(false)}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          busyLabel={confirm.busyLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      ) : null}

      {publishOpen ? (
        <Modal
          title="Publier la carte"
          description="Publier vers le menu public partagé."
          onClose={() => {
            if (publishing) return;
            setPublishOpen(false);
          }}
          footer={
            <>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setPublishOpen(false)}
                disabled={publishing}
              >
                Annuler
              </button>
              <button
                type="button"
                className="button"
                disabled={publishing}
                onClick={async () => {
                  setPublishing(true);
                  const result = await publishMenuToSupabase();
                  setPublishing(false);
                  if (result.ok) {
                    notify('Carte publiée avec succès', 'success');
                    setPublishOpen(false);
                  } else {
                    notify(
                      "Échec de la publication. Vérifiez qu'il y a au moins un article publié avec un prix.",
                      'warn',
                    );
                  }
                }}
              >
                {publishing ? 'Publication…' : 'Publier maintenant'}
              </button>
            </>
          }
        >
          <p className="modal__paragraph">
            Cela enverra une copie figée du brouillon actuel vers le site public. Seuls les articles{' '}
            <strong>confirmés</strong>, <strong>visibles</strong> et avec un <strong>prix</strong>{' '}
            seront publiés. Les catégories sans article publiable sont automatiquement masquées.
          </p>
          <p className="modal__paragraph">Les visiteurs verront cette version après publication.</p>
        </Modal>
      ) : null}
    </div>
  );
}
