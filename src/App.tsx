import { useBill } from './context/BillContext';
import Stepper from './components/ui/Stepper';
import Step1Entry from './components/steps/Step1Entry';
import Step2Review from './components/steps/Step2Review';
import Step3People from './components/steps/Step3People';
import Step4Assign from './components/steps/Step4Assign';
import Step5TaxTip from './components/steps/Step5TaxTip';
import Step6Result from './components/steps/Step6Result';

function StepContent() {
  const { state } = useBill();
  switch (state.step) {
    case 1: return <Step1Entry />;
    case 2: return <Step2Review />;
    case 3: return <Step3People />;
    case 4: return <Step4Assign />;
    case 5: return <Step5TaxTip />;
    case 6: return <Step6Result />;
  }
}

export default function App() {
  const { state } = useBill();
  return (
    <div className={`min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900 ${state.darkMode ? 'dark' : ''}`}>
      <div className="w-full max-w-[430px] min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Stepper />
        <main className="flex-1 flex flex-col overflow-hidden">
          <StepContent />
        </main>
      </div>
    </div>
  );
}
