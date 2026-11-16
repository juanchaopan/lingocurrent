import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WelcomePanel } from './WelcomePanel';

describe('workspace shell', () => {
  it('identifies the workspace and its purpose', () => {
    render(<WelcomePanel />);
    expect(screen.getByRole('heading', { name: 'LingoCurrent' })).toBeVisible();
    expect(screen.getByText('Read. Collect vocabulary. Practice.')).toBeVisible();
  });

  it('announces a failed load', () => {
    render(<WelcomePanel state="error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again.');
  });
});
