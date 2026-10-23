import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MenuPage } from './MenuPage';

describe('MenuPage', () => {
  it('renders every published category', () => {
    render(<MenuPage />);

    for (const name of [
      'Cafés',
      'Chocolats',
      'Thés & Infusions',
      'Jus & Sodas',
      'Smoothies & Milkshakes',
      'Cocktails',
      'Eaux',
      'Douceurs',
    ]) {
      expect(screen.getByRole('heading', { name, level: 2 })).toBeInTheDocument();
    }
  });

  it('lists every category in the navigation strip', () => {
    render(<MenuPage />);

    const nav = screen.getByRole('navigation', { name: 'Catégories du menu' });
    expect(within(nav).getAllByRole('link')).toHaveLength(8);
  });

  it('hides the items whose price is still unresolved', () => {
    render(<MenuPage />);

    expect(screen.queryByText('Thé')).not.toBeInTheDocument();
    expect(screen.queryByText('Citronnade')).not.toBeInTheDocument();
    expect(screen.queryByText('Cheesecake')).not.toBeInTheDocument();
    expect(screen.queryByText('À confirmer')).not.toBeInTheDocument();
  });

  it('prints the owner-updated prices', () => {
    render(<MenuPage />);

    for (const price of ['6.000', '3.000', '8.500', '3.500', '4.000', '7.000']) {
      expect(screen.getAllByText(new RegExp(`^${price.replace('.', '\\.')}`)).length).toBeGreaterThan(0);
    }
  });

  it('prints the coffee prices with the increase applied once', () => {
    render(<MenuPage />);

    const coffees = screen.getByRole('region', { name: 'Cafés' });
    expect(within(coffees).getAllByText(/^3\.500/).length).toBeGreaterThan(0);
    expect(within(coffees).getAllByText(/^4\.000/)).toHaveLength(2); // Cappucin + Américain
    expect(within(coffees).getAllByText(/^4\.500/).length).toBeGreaterThan(0);
    expect(within(coffees).getAllByText(/^2\.000/).length).toBeGreaterThan(0);
  });

  it('does not print the original coffee prices', () => {
    render(<MenuPage />);

    const coffees = screen.getByRole('region', { name: 'Cafés' });
    expect(within(coffees).queryByText(/^2\.500/)).not.toBeInTheDocument();
    expect(within(coffees).queryByText(/^3\.000/)).not.toBeInTheDocument();
    expect(within(coffees).queryByText(/^1\.000/)).not.toBeInTheDocument();
  });

  it('offers a skip link to the menu', () => {
    render(<MenuPage />);

    const skip = screen.getByRole('link', { name: 'Aller directement au menu' });
    expect(skip).toHaveAttribute('href', '#menu');
  });
});
