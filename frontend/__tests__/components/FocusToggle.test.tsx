import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FocusToggle from '@/components/FocusToggle';
import { useAppStore } from '@/lib/store';

describe('FocusToggle Component', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { isFocusMode } = useAppStore.getState();
    if (isFocusMode) {
      useAppStore.getState().toggleFocusMode();
    }
  });

  it('should render in planning mode by default', () => {
    render(<FocusToggle />);
    expect(screen.getByRole('button', { name: /Planning Mode/i })).toBeInTheDocument();
  });

  it('should display Planning Mode icon and text when not in focus mode', () => {
    render(<FocusToggle />);
    const button = screen.getByRole('button');

    expect(button).toHaveTextContent('Planning Mode');
    expect(button).not.toHaveClass('bg-primary');
  });

  it('should toggle to focus mode when clicked', async () => {
    const user = userEvent.setup();
    render(<FocusToggle />);

    const button = screen.getByRole('button', { name: /Planning Mode/i });
    await user.click(button);

    expect(screen.getByRole('button', { name: /Focus Mode On/i })).toBeInTheDocument();
  });

  it('should display Focus Mode icon and text when in focus mode', async () => {
    const user = userEvent.setup();
    render(<FocusToggle />);

    await user.click(screen.getByRole('button'));

    const button = screen.getByRole('button', { name: /Focus Mode On/i });
    expect(button).toHaveTextContent('Focus Mode On');
    expect(button).toHaveClass('bg-primary');
  });

  it('should toggle back to planning mode', async () => {
    const user = userEvent.setup();
    render(<FocusToggle />);

    const button = screen.getByRole('button');

    // Toggle to focus mode
    await user.click(button);
    expect(screen.getByRole('button', { name: /Focus Mode On/i })).toBeInTheDocument();

    // Toggle back to planning mode
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: /Planning Mode/i })).toBeInTheDocument();
  });

  it('should apply correct styles in planning mode', () => {
    render(<FocusToggle />);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('bg-white');
    expect(button).toHaveClass('border-gray-200');
  });

  it('should apply correct styles in focus mode', async () => {
    const user = userEvent.setup();
    render(<FocusToggle />);

    await user.click(screen.getByRole('button'));

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-white');
  });

  it('should have proper title attribute in planning mode', () => {
    render(<FocusToggle />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('title', 'Switch to Focus Mode');
  });

  it('should have proper title attribute in focus mode', async () => {
    const user = userEvent.setup();
    render(<FocusToggle />);

    await user.click(screen.getByRole('button'));

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Switch to Planning Mode');
  });

  it('should update global state when toggled', async () => {
    const user = userEvent.setup();
    render(<FocusToggle />);

    const initialState = useAppStore.getState().isFocusMode;
    expect(initialState).toBe(false);

    await user.click(screen.getByRole('button'));

    const updatedState = useAppStore.getState().isFocusMode;
    expect(updatedState).toBe(true);
  });

  it('should render with rounded-full styling', () => {
    render(<FocusToggle />);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('rounded-full');
  });
});
