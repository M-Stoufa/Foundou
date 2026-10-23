import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MenuPage } from './MenuPage';

describe('MenuPage', () => {
  it('renders every published category', () => {
    render(<MenuPage />);

    for (const name of ['CAFÉ', 'THÉ', 'EAU', 'JUS', 'MILK SHAKE', 'SMOOTHIE', 'MOJITO', 'GÂTEAUX']) {
      expect(screen.getByRole('heading', { name, level: 2 })).toBeInTheDocument();
    }
  });

  it('lists every category in the navigation strip', () => {
    render(<MenuPage />);

    const nav = screen.getByRole('navigation', { name: 'Catégories du menu' });
    expect(within(nav).getAllByRole('link')).toHaveLength(8);
  });

  it('shows all specified products and prices', () => {
    render(<MenuPage />);

    expect(screen.getByText('Lait au chocolat')).toBeInTheDocument();
    expect(screen.getByText('Chocolat chaud')).toBeInTheDocument();
    expect(screen.getByText('Jus banane')).toBeInTheDocument();
    expect(screen.getByText('Citronnade')).toBeInTheDocument();
    expect(screen.getByText('Milk Shake Vanille')).toBeInTheDocument();
    expect(screen.getByText('Smoothie Café')).toBeInTheDocument();
    expect(screen.getByText('Gâteaux chocolat')).toBeInTheDocument();
    expect(screen.getByText('Gâteaux noisettes')).toBeInTheDocument();
    expect(screen.getByText('Cheese Cake')).toBeInTheDocument();
    expect(screen.getAllByText(/^8\.500/)).toHaveLength(3);
  });

  it('prints the owner prices', () => {
    render(<MenuPage />);

    for (const price of ['3.000', '6.000', '7.000', '4.000', '5.000', '1.200', '2.500']) {
      expect(screen.getAllByText(new RegExp(`^${price.replace('.', '\\.')}`)).length).toBeGreaterThan(0);
    }
  });

  it('prints the coffee prices with the increase applied once', () => {
    render(<MenuPage />);

    const cafes = screen.getByRole('region', { name: 'CAFÉ' });
    expect(within(cafes).getAllByText(/^3\.500/).length).toBeGreaterThan(0);
    expect(within(cafes).getAllByText(/^4\.000/)).toHaveLength(2); // Cappucin + Américain
    expect(within(cafes).getAllByText(/^4\.500/).length).toBeGreaterThan(0);
    expect(within(cafes).getAllByText(/^2\.000/).length).toBeGreaterThan(0);
  });

  it('does not print the original coffee prices', () => {
    render(<MenuPage />);

    const cafes = screen.getByRole('region', { name: 'CAFÉ' });
    expect(within(cafes).queryByText(/^2\.500/)).not.toBeInTheDocument();
    expect(within(cafes).queryByText(/^1\.000/)).not.toBeInTheDocument();
  });

  it('offers a skip link to the menu', () => {
    render(<MenuPage />);

    const skip = screen.getByRole('link', { name: 'Aller directement au menu' });
    expect(skip).toHaveAttribute('href', '#menu');
  });
});
