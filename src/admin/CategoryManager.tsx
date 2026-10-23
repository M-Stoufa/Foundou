import { useId, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  ShieldCheck,
  Trash,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { MenuCategory } from '../data/menu';
import {
  MAX_CATEGORY_NAME,
  categoryNameExists,
  normalizeCategoryName,
  type DraftAction,
} from './draftStore';
import { Modal } from './Modal';
import type { NotifyFn } from './Toasts';

interface CategoryManagerProps {
  categories: MenuCategory[];
  dispatch: React.Dispatch<DraftAction>;
  notify: NotifyFn;
  onClose: () => void;
}

interface RenameState {
  id: string;
  value: string;
  error: string;
}

/**
 * Dedicated category management inside the admin.
 *
 * Deletion is a two-step flow: choose a reassignment category for any articles,
 * then confirm. Default categories also require typing their name. Nothing is
 * ever deleted together with its products.
 */
export function CategoryManager({ categories, dispatch, notify, onClose }: CategoryManagerProps) {
  const nameId = useId();
  const renameId = useId();
  const targetId = useId();
  const confirmId = useId();

  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [typedName, setTypedName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const deleting = categories.find((category) => category.id === deletingId) ?? null;
  const others = categories.filter((category) => category.id !== deletingId);
  const requiresReassignment = (deleting?.items.length ?? 0) > 0;
  const requiresTypedName = deleting?.isDefault === true;
  const nameMatches =
    !requiresTypedName ||
    (deleting !== null &&
      normalizeCategoryName(typedName).toLocaleLowerCase('fr') ===
        deleting.name.toLocaleLowerCase('fr'));
  const canDelete =
    deleting !== null &&
    categories.length > 1 &&
    (!requiresReassignment || others.some((entry) => entry.id === targetCategoryId)) &&
    nameMatches;

  const validate = (raw: string, exceptId?: string): { name: string; error: string } => {
    const name = normalizeCategoryName(raw);
    if (name === '') return { name, error: 'Le nom de la catégorie est obligatoire.' };
    if (name.length > MAX_CATEGORY_NAME) {
      return { name, error: `Le nom ne peut pas dépasser ${MAX_CATEGORY_NAME} caractères.` };
    }
    if (categoryNameExists(categories, name, exceptId)) {
      return { name, error: 'Une catégorie porte déjà ce nom.' };
    }
    return { name, error: '' };
  };

  const create = (event: React.FormEvent) => {
    event.preventDefault();
    const { name, error } = validate(newName);
    if (error) {
      setCreateError(error);
      return;
    }
    dispatch({ type: 'add-category', name });
    setNewName('');
    setCreateError('');
    notify(`Catégorie « ${name} » créée · brouillon local`);
  };

  const startRename = (category: MenuCategory) => {
    setRenaming({ id: category.id, value: category.name, error: '' });
  };

  const commitRename = (event: React.FormEvent) => {
    event.preventDefault();
    if (!renaming) return;
    const { name, error } = validate(renaming.value, renaming.id);
    if (error) {
      setRenaming({ ...renaming, error });
      return;
    }
    dispatch({ type: 'rename-category', categoryId: renaming.id, name });
    notify(`Catégorie renommée « ${name} » · brouillon local`);
    setRenaming(null);
  };

  const startDelete = (category: MenuCategory) => {
    setDeletingId(category.id);
    setTargetCategoryId(
      categories.find((entry) => entry.id !== category.id)?.id ?? '',
    );
    setTypedName('');
    setDeleteError('');
  };

  const confirmDelete = () => {
    if (!deleting || !canDelete) return;
    dispatch({
      type: 'delete-category',
      categoryId: deleting.id,
      ...(requiresReassignment ? { targetCategoryId } : {}),
    });
    const target = others.find((entry) => entry.id === targetCategoryId);
    notify(
      requiresReassignment
        ? `« ${deleting.name} » supprimée · ${deleting.items.length} article${deleting.items.length > 1 ? 's' : ''} déplacé${deleting.items.length > 1 ? 's' : ''} vers « ${target?.name ?? ''} »`
        : `Catégorie « ${deleting.name} » supprimée · brouillon local`,
      'warn',
    );
    setDeletingId(null);
  };

  const listFooter = (
    <button type="button" className="button" onClick={onClose}>
      Fermer
    </button>
  );

  const deleteFooter = (
    <>
      <button type="button" className="button button--ghost" onClick={() => setDeletingId(null)}>
        Retour
      </button>
      <button
        type="button"
        className="button button--danger"
        onClick={confirmDelete}
        disabled={!canDelete}
      >
        Supprimer la catégorie
      </button>
    </>
  );

  return (
    <Modal
      title={deleting ? `Supprimer « ${deleting.name} » ?` : 'Catégories'}
      description={
        deleting
          ? 'La catégorie disparaîtra du menu public et de l’admin.'
          : 'Créez, renommez et réordonnez les catégories de la carte.'
      }
      onClose={onClose}
      wide
      footer={deleting ? deleteFooter : listFooter}
    >
      {deleting ? (
        <div className="catdelete">
          <div className="catdelete__icon" aria-hidden="true">
            <TriangleAlert size={20} />
          </div>

          {requiresReassignment ? (
            <>
              <p className="catdelete__lead">
                Cette catégorie contient{' '}
                <strong>
                  {deleting.items.length} article{deleting.items.length > 1 ? 's' : ''}
                </strong>
                . Ils ne seront pas supprimés : choisissez la catégorie qui les accueillera.
              </p>

              <div className="field">
                <label className="field__label" htmlFor={targetId}>
                  Déplacer les articles vers
                </label>
                <select
                  className="field__input field__select"
                  id={targetId}
                  value={targetCategoryId}
                  onChange={(event) => {
                    setTargetCategoryId(event.target.value);
                    setDeleteError('');
                  }}
                >
                  {others.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name} ({category.items.length} article
                      {category.items.length > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <p className="catdelete__lead">
              Cette catégorie ne contient aucun article. Aucun produit ne sera supprimé.
            </p>
          )}

          {requiresTypedName ? (
            <div className="catdelete__guard">
              <p className="catdelete__guard-title">
                <ShieldCheck size={16} aria-hidden="true" />
                Catégorie d’origine
              </p>
              <p className="catdelete__guard-text">
                Pour confirmer, tapez le nom de la catégorie :{' '}
                <strong>{deleting.name}</strong>
              </p>
              <label className="field__label" htmlFor={confirmId}>
                Nom de la catégorie
              </label>
              <input
                className="field__input"
                id={confirmId}
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                placeholder={deleting.name}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : null}

          {categories.length <= 1 ? (
            <p className="field__error" role="alert">
              La carte doit conserver au moins une catégorie.
            </p>
          ) : null}
          {deleteError ? (
            <p className="field__error" role="alert">
              {deleteError}
            </p>
          ) : null}
          {requiresReassignment && others.length === 0 ? (
            <p className="field__error" role="alert">
              Créez d’abord une autre catégorie pour accueillir ces articles.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="catman">
          <form className="catman__create" onSubmit={create} noValidate>
            <label className="field__label" htmlFor={nameId}>
              Nouvelle catégorie
            </label>
            <div className="catman__create-row">
              <input
                className={`field__input${createError ? ' is-invalid' : ''}`}
                id={nameId}
                name="category-name"
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value);
                  setCreateError('');
                }}
                placeholder="DESSERTS"
                autoComplete="off"
                maxLength={MAX_CATEGORY_NAME}
                aria-invalid={createError ? true : undefined}
                aria-describedby={createError ? `${nameId}-error` : undefined}
              />
              <button type="submit" className="button">
                <Plus size={15} aria-hidden="true" />
                Créer
              </button>
            </div>
            {createError ? (
              <p className="field__error" id={`${nameId}-error`}>
                {createError}
              </p>
            ) : (
              <p className="field__hint">
                Ajoutée à la fin de la carte. Utilisez les flèches pour la déplacer.
              </p>
            )}
          </form>

          <ol className="catlist">
            {categories.map((category, index) => {
              const isRenaming = renaming?.id === category.id;
              return (
                <li className="catlist__row" key={category.id}>
                  <span className="catlist__num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="catlist__main">
                    {isRenaming && renaming ? (
                      <form className="catlist__rename" onSubmit={commitRename} noValidate>
                        <label className="visually-hidden" htmlFor={`${renameId}-${category.id}`}>
                          Nom de la catégorie {category.name}
                        </label>
                        <input
                          className={`field__input${renaming.error ? ' is-invalid' : ''}`}
                          id={`${renameId}-${category.id}`}
                          value={renaming.value}
                          onChange={(event) =>
                            setRenaming({ ...renaming, value: event.target.value, error: '' })
                          }
                          autoFocus
                          maxLength={MAX_CATEGORY_NAME}
                          aria-invalid={renaming.error ? true : undefined}
                        />
                        <div className="catlist__rename-actions">
                          <button
                            type="submit"
                            className="button button--sm"
                            aria-label={`Enregistrer le nom de ${category.name}`}
                          >
                            <Check size={15} aria-hidden="true" />
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            className="button button--ghost button--sm"
                            onClick={() => setRenaming(null)}
                          >
                            Annuler
                          </button>
                        </div>
                        {renaming.error ? (
                          <p className="field__error" role="alert">
                            {renaming.error}
                          </p>
                        ) : null}
                      </form>
                    ) : (
                      <>
                        <div className="catlist__title">
                          <h3 className="catlist__name">{category.name}</h3>
                          {category.isDefault ? (
                            <span
                              className="catlist__badge"
                              title="Catégorie d’origine — suppression protégée"
                            >
                              <ShieldCheck size={12} aria-hidden="true" />
                              D’origine
                            </span>
                          ) : null}
                        </div>
                        <p className="catlist__meta">
                          {category.items.length} article
                          {category.items.length > 1 ? 's' : ''} ·{' '}
                          {category.id}
                        </p>
                      </>
                    )}
                  </div>

                  {!isRenaming ? (
                    <div className="catlist__actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Monter la catégorie ${category.name}`}
                        title="Monter"
                        disabled={index === 0}
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
                        title="Descendre"
                        disabled={index === categories.length - 1}
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
                        className="icon-btn"
                        aria-label={`Renommer la catégorie ${category.name}`}
                        title="Renommer"
                        onClick={() => startRename(category)}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        aria-label={`Supprimer la catégorie ${category.name}`}
                        title="Supprimer"
                        onClick={() => startDelete(category)}
                      >
                        <Trash size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Fermer le renommage de ${category.name}`}
                      onClick={() => setRenaming(null)}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          <p className="catman__note">
            Les huit catégories d’origine peuvent être renommées, réordonnées et supprimées.
            Leur suppression demande une confirmation supplémentaire et le déplacement des
            articles.
          </p>
        </div>
      )}
    </Modal>
  );
}
