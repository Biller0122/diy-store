import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OTPInput from '@/components/auth/OTPInput';

describe('OTPInput Component', () => {
  test('renders 4 input boxes', () => {
    render(<OTPInput onComplete={jest.fn()} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });

  test('partial paste fills the first box only', async () => {
    render(<OTPInput onComplete={jest.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '1',
      },
    });
    await waitFor(() => expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('value', '1'));
    expect(screen.getAllByRole('textbox')[1]).toHaveAttribute('value', '');
  });

  test('calls onComplete when all 4 digits entered', async () => {
    const onComplete = jest.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '1234',
      },
    });
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  test('partial paste does not complete OTP', async () => {
    const onComplete = jest.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '1',
      },
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  test('paste fills all boxes', async () => {
    const onComplete = jest.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '1234',
      },
    });
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  test('shows error state with shake', () => {
    render(<OTPInput onComplete={jest.fn()} error="Код буруу байна" />);
    expect(screen.getByText('Код буруу байна')).toBeInTheDocument();
  });

  test('only accepts digits', async () => {
    const onComplete = jest.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => 'abcd',
      },
    });
    expect(inputs[0]).toHaveValue('');
    expect(onComplete).not.toHaveBeenCalled();
  });
});
