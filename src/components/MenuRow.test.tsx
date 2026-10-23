import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../data/menu';
import { MenuRow } from './MenuRow';

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'express',
    name: 'Express',
    price: 3500,
    status: 'confirmed',
    visible: true,
    source: 'board',
    ...overrides,
  };
}

describe('MenuRow', () => {
  it('prints the price with the DT unit', () => {
    render(
      <ul>
        <MenuRow item={makeItem()} />
      </ul>,
    );

    expect(screen.getByText(/3\.500/)).toBeInTheDocument();
    expect(screen.getByText('DT')).toBeInTheDocument();
  });

  it('never prints a price for an unresolved item', () => {
    render(
      <ul>
        <MenuRow item={makeItem({ id: 'the-simple', name: 'Thé', price: null, status: 'pending' })} />
      </ul>,
    );

    expect(screen.getByText('À confirmer')).toBeInTheDocument();
    expect(screen.queryByText(/DT/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d/)).not.toBeInTheDocument();
  });

  it('prints the qualifier next to the name when the board states one', () => {
    render(
      <ul>
        <MenuRow item={makeItem({ name: 'Eau', note: '1,5 L' })} />
      </ul>,
    );

    expect(screen.getByText('1,5 L')).toBeInTheDocument();
  });

  it('hides the decorative leader from assistive technology', () => {
    const { container } = render(
      <ul>
        <MenuRow item={makeItem()} />
      </ul>,
    );

    const leader = container.querySelector('.row__leader');
    expect(leader).toHaveAttribute('aria-hidden', 'true');
  });
});
