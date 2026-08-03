import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeSwitcher } from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  it('exposes an accessible pressed state and changes theme', () => {
    const onChange = vi.fn();
    render(<ThemeSwitcher value="dark" onChange={onChange}/>);
    expect(screen.getByRole('button', { name: /Sombre/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Clair/i }));
    expect(onChange).toHaveBeenCalledWith('light');
  });
});
