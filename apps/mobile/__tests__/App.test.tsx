import { render } from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  it('renders the brand and tagline', () => {
    const { getByText } = render(<App />);
    expect(getByText('CurateDS')).toBeTruthy();
    expect(getByText('Mobile companion')).toBeTruthy();
  });
});
