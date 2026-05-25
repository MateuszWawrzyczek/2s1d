import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';

describe('Komponent HomePage', () => {
  it('powinien wyrenderować główny nagłówek poprawnie', () => {
    render(<HomePage />);

    const headingElement = screen.getByRole('heading', { level: 1 });

    expect(headingElement).toHaveTextContent('Home Page');
    expect(headingElement).toBeInTheDocument();
  });
});
