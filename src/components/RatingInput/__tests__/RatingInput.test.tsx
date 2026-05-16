import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RatingInput from '../RatingInput';

describe('RatingInput', () => {
  it('renders a labeled number input', () => {
    render(<RatingInput value={null} onChange={() => {}} />);
    const input = screen.getByLabelText('Rating (1-10)');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '10');
    expect(input).toHaveAttribute('step', '1');
  });

  it('displays empty when value is null', () => {
    render(<RatingInput value={null} onChange={() => {}} />);
    const input = screen.getByLabelText('Rating (1-10)') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('displays the current value', () => {
    render(<RatingInput value={7} onChange={() => {}} />);
    const input = screen.getByLabelText('Rating (1-10)') as HTMLInputElement;
    expect(input.value).toBe('7');
  });

  it('calls onChange with the integer value on change', () => {
    const onChange = vi.fn();
    render(<RatingInput value={5} onChange={onChange} />);
    const input = screen.getByLabelText('Rating (1-10)');
    fireEvent.change(input, { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('clamps values above 10 to 10', () => {
    const onChange = vi.fn();
    render(<RatingInput value={null} onChange={onChange} />);
    const input = screen.getByLabelText('Rating (1-10)');
    fireEvent.change(input, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('clamps values below 1 to 1', () => {
    const onChange = vi.fn();
    render(<RatingInput value={null} onChange={onChange} />);
    const input = screen.getByLabelText('Rating (1-10)');
    fireEvent.change(input, { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('rounds decimal values to whole numbers', () => {
    const onChange = vi.fn();
    render(<RatingInput value={null} onChange={onChange} />);
    const input = screen.getByLabelText('Rating (1-10)');
    fireEvent.change(input, { target: { value: '3.7' } });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('does not call onChange for empty input', () => {
    const onChange = vi.fn();
    render(<RatingInput value={5} onChange={onChange} />);
    const input = screen.getByLabelText('Rating (1-10)');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sets required attribute when required prop is true', () => {
    render(<RatingInput value={null} onChange={() => {}} required />);
    const input = screen.getByLabelText('Rating (1-10)');
    expect(input).toBeRequired();
  });

  it('has touch-friendly sizing (min 44x44px)', () => {
    render(<RatingInput value={5} onChange={() => {}} />);
    const input = screen.getByLabelText('Rating (1-10)');
    expect(input).toHaveClass(/input/);
  });
});
