import { useId, useState } from 'react';
import type { MenuCategory, MenuItem } from '../data/menu';
import { formatPrice, parsePrice } from '../lib/price';
import { itemNameExists } from './draftStore';
import { Modal } from './Modal';

export interface ItemDraft {
  name: string;
  price: number | null;
  note?: string;
  categoryId: string;
}

interface ItemEditorProps {
  mode: 'add' | 'edit';
  categories: MenuCategory[];
  category: MenuCategory;
  item?: MenuItem;
  onClose: () => void;
  onSave: (values: ItemDraft) => void;
}

const MAX_PRICE = 200_000; // 200.000 DT — far above any café item, a typo guard

/**
 * Add / edit form. A product can be moved to another category here; the
 * reducer removes it from its old category and appends it to the new one, so
 * it is never duplicated. The write is stored in this browser only.
 */
export function ItemEditor({ mode, categories, category, item, onClose, onSave }: ItemEditorProps) {
  const nameId = useId();
  const categoryFieldId = useId();
  const priceId = useId();
  const noteId = useId();
  const nameErrorId = useId();
  const priceErrorId = useId();
  const priceHintId = useId();

  const [name, setName] = useState(item?.name ?? '');
  const [categoryId, setCategoryId] = useState(category.id);
  const [price, setPrice] = useState(item?.price != null ? formatPrice(item.price) : '');
  const [note, setNote] = useState(item?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const parsedPrice = price.trim() === '' ? null : parsePrice(price);
  const categoryValid = categories.some((entry) => entry.id === categoryId);
  const moved = item ? categoryId !== category.id : false;

  const nameError =
    trimmedName === ''
      ? 'Le nom de l’article est obligatoire.'
      : itemNameExists(categories, trimmedName, item?.id)
        ? 'Un article porte déjà ce nom.'
        : '';
  const priceError =
    price.trim() === ''
      ? ''
      : parsedPrice === null
        ? 'Format attendu : 3.500 (point ou virgule, sans espace).'
        : parsedPrice <= 0 || parsedPrice > MAX_PRICE
          ? 'Le prix doit être compris entre 0.100 et 200.000 DT.'
          : '';
  const priceHint =
    parsedPrice !== null && priceError === '' ? `Aperçu : ${formatPrice(parsedPrice)} DT` : '';

  const valid = nameError === '' && priceError === '' && categoryValid;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || saving) return;

    setSaving(true);
    try {
      // Stand-in for the network round-trip the real version will make.
      await new Promise((resolve) => setTimeout(resolve, 420));
      onSave({
        name: trimmedName,
        price: parsedPrice,
        categoryId,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((entry) => entry.id === categoryId) ?? category;

  return (
    <Modal
      title={mode === 'add' ? 'Nouvel article' : 'Modifier l’article'}
      description={
        moved ? `Déplacé vers : ${selectedCategory.name}` : `Catégorie : ${selectedCategory.name}`
      }
      onClose={onClose}
      dismissible={!saving}
      wide
      footer={
        <>
          <button type="button" className="button button--ghost" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="submit" form="item-editor" className="button" disabled={saving}>
            {saving ? 'Enregistrement…' : mode === 'add' ? 'Ajouter' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form className="form" id="item-editor" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor={nameId}>
            Nom de l’article
          </label>
          <input
            className={`field__input${submitted && nameError ? ' is-invalid' : ''}`}
            id={nameId}
            name="item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Express"
            autoComplete="off"
            data-autofocus
            aria-invalid={submitted && nameError ? true : undefined}
            aria-describedby={submitted && nameError ? nameErrorId : undefined}
            disabled={saving}
          />
          {submitted && nameError ? (
            <p className="field__error" id={nameErrorId}>
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={categoryFieldId}>
            Catégorie
          </label>
          <select
            className="field__input field__select"
            id={categoryFieldId}
            name="item-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={saving}
          >
            {categories.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <p className="field__hint">
            {moved
              ? 'L’article sera déplacé vers cette catégorie, sans être dupliqué.'
              : 'Changer de catégorie déplace l’article, sans le dupliquer.'}
          </p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={priceId}>
            Prix
          </label>
          <div className="field__row">
            <input
              className={`field__input tnum${submitted && priceError ? ' is-invalid' : ''}`}
              id={priceId}
              name="item-price"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="3.500"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={submitted && priceError ? true : undefined}
              aria-describedby={priceError ? priceErrorId : priceHint ? priceHintId : undefined}
              disabled={saving}
            />
            <span className="field__unit" aria-hidden="true">
              DT
            </span>
          </div>
          {priceError ? (
            <p className="field__error" id={priceErrorId}>
              {priceError}
            </p>
          ) : priceHint ? (
            <p className="field__hint" id={priceHintId}>
              {priceHint}
            </p>
          ) : (
            <p className="field__hint">
              Laissez vide si le prix reste à confirmer : l’article ne sera pas publié.
            </p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={noteId}>
            Précision <span className="field__optional">(facultatif)</span>
          </label>
          <input
            className="field__input"
            id={noteId}
            name="item-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="1,5 L"
            autoComplete="off"
            disabled={saving}
          />
        </div>

        <p className="form__note">
          Enregistré dans ce navigateur uniquement. Les visiteurs ne voient pas ces
          modifications.
        </p>
      </form>
    </Modal>
  );
}
