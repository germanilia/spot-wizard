import { Button } from "@/components/ui/button";

interface OSSelectorProps {
  activeOS: 'Linux' | 'Windows' | 'Both';
  onChange: (os: 'Linux' | 'Windows' | 'Both') => void;
}

export function OSSelector({ activeOS, onChange }: OSSelectorProps) {
  return (
    <div className="flex space-x-1 bg-background/80 p-1 rounded-md border">
      <Button 
        variant={activeOS === 'Linux' ? "default" : "ghost"} 
        size="sm" 
        onClick={() => onChange('Linux')}
        className="px-3"
      >
        Linux
      </Button>
      <Button 
        variant={activeOS === 'Windows' ? "default" : "ghost"} 
        size="sm" 
        onClick={() => onChange('Windows')}
        className="px-3"
      >
        Windows
      </Button>
      <Button 
        variant={activeOS === 'Both' ? "default" : "ghost"} 
        size="sm" 
        onClick={() => onChange('Both')}
        className="px-3"
      >
        Both
      </Button>
    </div>
  );
} 