import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner = ({ text = 'Loading...' }: LoadingSpinnerProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
