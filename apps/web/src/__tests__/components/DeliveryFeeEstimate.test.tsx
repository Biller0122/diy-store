import { render, screen, waitFor } from '@testing-library/react';
import { DeliveryFeeEstimate } from '@/components/delivery/DeliveryFeeEstimate';

describe('DeliveryFeeEstimate Component', () => {
  test('shows loading state while calculating', () => {
    render(<DeliveryFeeEstimate customerDistrict="Баянзүрх" supplierIds={['sup1']} totalWeightKg={5} />);
    expect(screen.getByText(/тооцоолж байна/i)).toBeInTheDocument();
  });

  test('shows calculated fee', async () => {
    render(<DeliveryFeeEstimate customerDistrict="Баянзүрх" supplierIds={['sup1']} totalWeightKg={5} />);
    await waitFor(() => {
      expect(screen.getByText(/₮/)).toBeInTheDocument();
    });
  });

  test('updates when district changes', async () => {
    const { rerender } = render(
      <DeliveryFeeEstimate customerDistrict="Баянзүрх" supplierIds={['sup1']} totalWeightKg={5} />,
    );
    rerender(<DeliveryFeeEstimate customerDistrict="Налайх" supplierIds={['sup1']} totalWeightKg={5} />);
    await waitFor(() => {
      expect(screen.getByText('₮9,000')).toBeInTheDocument();
    });
  });
});
