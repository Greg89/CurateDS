import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CameraScreen from '../../src/screens/CameraScreen';

const mockOnPhotoCaptured = jest.fn();
const mockOnCancel = jest.fn();

const mockRequestPermission = jest.fn();
// Variable name starts with 'mock' so Jest allows it in the hoisted factory
let mockTakePictureAsync = jest.fn();

// Mock CameraView as a forwardRef component that exposes takePictureAsync on its ref.
// This avoids the need to mock React.useRef globally (which breaks Pressable).
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CameraView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: (...args: any[]) => mockTakePictureAsync(...args),
    }), []);
    return React.createElement(View, { testID: props.testID });
  });

  return { CameraView, useCameraPermissions: jest.fn() };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

import * as ExpoCamera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
const mockUseCameraPermissions = ExpoCamera.useCameraPermissions as jest.MockedFunction<
  typeof ExpoCamera.useCameraPermissions
>;
const mockLaunchGallery = ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
  typeof ImagePicker.launchImageLibraryAsync
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockTakePictureAsync = jest.fn();
  mockRequestPermission.mockResolvedValue({ granted: true, expires: 'never', canAskAgain: true, status: 'granted' });
});

function renderCamera() {
  return render(
    <CameraScreen onPhotoCaptured={mockOnPhotoCaptured} onCancel={mockOnCancel} />,
  );
}

describe('CameraScreen', () => {
  it('shows loading indicator while permissions are loading', () => {
    mockUseCameraPermissions.mockReturnValue([null, mockRequestPermission, jest.fn()]);
    const { getByTestId } = renderCamera();
    expect(getByTestId('camera-permission-loading')).toBeTruthy();
  });

  it('shows permission request UI when camera access is denied', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, expires: 'never', canAskAgain: true, status: 'denied' },
      mockRequestPermission,
      jest.fn(),
    ]);
    const { getByTestId } = renderCamera();
    expect(getByTestId('request-permission-button')).toBeTruthy();
    expect(getByTestId('gallery-fallback-button')).toBeTruthy();
  });

  it('calls requestPermission when Allow Camera is pressed', async () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, expires: 'never', canAskAgain: true, status: 'denied' },
      mockRequestPermission,
      jest.fn(),
    ]);
    const { getByTestId } = renderCamera();
    fireEvent.press(getByTestId('request-permission-button'));
    await waitFor(() => expect(mockRequestPermission).toHaveBeenCalled());
  });

  it('calls onCancel when cancel is pressed on permission screen', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, expires: 'never', canAskAgain: true, status: 'denied' },
      mockRequestPermission,
      jest.fn(),
    ]);
    const { getByTestId } = renderCamera();
    fireEvent.press(getByTestId('cancel-button'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows camera view when permission is granted', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, expires: 'never', canAskAgain: true, status: 'granted' },
      mockRequestPermission,
      jest.fn(),
    ]);
    const { getByTestId } = renderCamera();
    expect(getByTestId('camera-view')).toBeTruthy();
    expect(getByTestId('capture-button')).toBeTruthy();
    expect(getByTestId('flash-toggle-button')).toBeTruthy();
  });

  it('toggles flash label when flash button is pressed', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, expires: 'never', canAskAgain: true, status: 'granted' },
      mockRequestPermission,
      jest.fn(),
    ]);
    const { getByTestId, getByText } = renderCamera();
    expect(getByText('⚡ Off')).toBeTruthy();
    fireEvent.press(getByTestId('flash-toggle-button'));
    expect(getByText('⚡ On')).toBeTruthy();
  });

  it('calls onPhotoCaptured with the photo uri after capture', async () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, expires: 'never', canAskAgain: true, status: 'granted' },
      mockRequestPermission,
      jest.fn(),
    ]);
    mockTakePictureAsync.mockResolvedValueOnce({ uri: 'file:///tmp/snap.jpg' });
    const { getByTestId } = renderCamera();
    fireEvent.press(getByTestId('capture-button'));
    await waitFor(() =>
      expect(mockOnPhotoCaptured).toHaveBeenCalledWith(
        expect.objectContaining({ uri: 'file:///tmp/snap.jpg', contentType: 'image/jpeg' }),
      ),
    );
  });

  it('opens gallery picker and calls onPhotoCaptured with selected asset', async () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, expires: 'never', canAskAgain: true, status: 'granted' },
      mockRequestPermission,
      jest.fn(),
    ]);
    mockLaunchGallery.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///gallery/img.jpg', fileName: 'img.jpg', mimeType: 'image/jpeg', width: 100, height: 100, assetId: null, base64: null, duration: null, exif: null, type: 'image' }],
    });
    const { getByTestId } = renderCamera();
    fireEvent.press(getByTestId('gallery-fallback-button'));
    await waitFor(() =>
      expect(mockOnPhotoCaptured).toHaveBeenCalledWith(
        expect.objectContaining({ uri: 'file:///gallery/img.jpg', fileName: 'img.jpg' }),
      ),
    );
  });

  it('does not call onPhotoCaptured when gallery is cancelled', async () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, expires: 'never', canAskAgain: true, status: 'granted' },
      mockRequestPermission,
      jest.fn(),
    ]);
    mockLaunchGallery.mockResolvedValueOnce({ canceled: true, assets: [] });
    const { getByTestId } = renderCamera();
    fireEvent.press(getByTestId('gallery-fallback-button'));
    await waitFor(() => expect(mockLaunchGallery).toHaveBeenCalled());
    expect(mockOnPhotoCaptured).not.toHaveBeenCalled();
  });
});
