import { useEffect } from 'react';
import { useKioskStore } from './store/kioskStore';
import { DeviceLoginScreen } from './components/DeviceLoginScreen';
import { AttractScreen } from './components/AttractScreen';
import { SelectFrameScreen } from './components/SelectFrameScreen';
import { SelectDesignScreen } from './components/SelectDesignScreen';
import { PaymentScreen } from './components/PaymentScreen';
import { CameraCaptureScreen } from './components/CameraCaptureScreen';
import { ResultScreen } from './components/ResultScreen';

function App() {
  const { currentStep, initDevice } = useKioskStore();

  useEffect(() => {
    initDevice();
  }, [initDevice]);

  // Router sederhana berdasarkan state kiosk
  switch (currentStep) {
    case 'DEVICE_LOGIN':
      return <DeviceLoginScreen />;
    case 'STANDBY':
      return <AttractScreen />;
    case 'SELECT_FRAME':
      return <SelectFrameScreen />;
    case 'SELECT_DESIGN':
      return <SelectDesignScreen />;
    case 'PAYMENT':
      return <PaymentScreen />;
    case 'CAPTURE':
      return <CameraCaptureScreen />;
    case 'RESULT':
      return <ResultScreen />;
    default:
      return <AttractScreen />;
  }
}

export default App;
