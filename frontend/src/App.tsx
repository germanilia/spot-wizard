import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RegionSelector } from './components/RegionSelector';
import { InstanceSelector } from './components/InstanceSelector';
import { InstanceAnalysis } from './components/InstanceAnalysis';
import { AWSIntegration } from './components/AWSIntegration';
import { actions } from './store/spotStore';
import { useSnapshot } from 'valtio';
import { spotStore } from './store/spotStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OSSelector } from './components/OSSelector';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ViewType = 'instance' | 'region' | 'stack';

function App() {
  const { selectedInstances, selectedRegions } = useSnapshot(spotStore);
  const showError = selectedInstances.length === 0 || selectedRegions.length === 0;
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [selectedOS, setSelectedOS] = useState<'Linux' | 'Windows' | 'Both'>('Linux');
  const [isSelectorsCollapsed, setIsSelectorsCollapsed] = useState(false);
  const [selectedView, setSelectedView] = useState<ViewType>('instance');

  useEffect(() => {
    actions.initialize();
  }, []);

  const handleAnalyze = () => {
    actions.analyzeInstances();
  };

  // Convert the OS selection format for InstanceAnalysis
  const getAnalysisOSFormat = (os: 'Linux' | 'Windows' | 'Both'): 'linux' | 'windows' | 'both' => {
    if (os === 'Linux') return 'linux';
    if (os === 'Windows') return 'windows';
    return 'both';
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Logo */}
      <header className="bg-background border-b py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <img 
              src="/logo.svg" 
              alt="Spot Wizard" 
              className="w-12 h-12"
            />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-primary">Spot Wizard</h1>
              <p className="text-sm text-muted-foreground">
                Analyze spot instance availability and ratings across regions
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4">
          {/* Tabs */}
          <Tabs defaultValue="manual" onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="w-full grid grid-cols-2 rounded-lg">
              <TabsTrigger value="manual" className="py-3">Manual Selection</TabsTrigger>
              <TabsTrigger value="aws" className="py-3">AWS Import</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4 mt-6">
              {/* Collapsible header */}
              <div className="flex items-center justify-between border p-3 rounded-lg bg-background cursor-pointer" 
                   onClick={() => setIsSelectorsCollapsed(!isSelectorsCollapsed)}>
                <div className="flex items-center gap-2">
                  {isSelectorsCollapsed ? 
                    <ChevronDown className="h-5 w-5 text-muted-foreground" /> : 
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  }
                  <h3 className="text-lg font-medium">
                    Select Regions and Instance Types
                  </h3>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedRegions.length} regions, {selectedInstances.length} instances selected
                </div>
              </div>
              
              {/* Collapsible content */}
              {!isSelectorsCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RegionSelector />
                  <InstanceSelector />
                </div>
              )}
              
              {showError && activeTab === "manual" && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Please select at least one instance type and one region
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="aws" className="mt-6">
              <AWSIntegration />
            </TabsContent>
          </Tabs>

          {/* Control bar with view selector, OS selector and Analyze button */}
          <div className="flex justify-between items-center gap-4 mt-6 mb-6 border-t pt-4">
            <div>
              <Select value={selectedView} onValueChange={(value: ViewType) => setSelectedView(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instance">Instance View</SelectItem>
                  <SelectItem value="region">Region View</SelectItem>
                  <SelectItem value="stack">Stack View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <OSSelector 
                activeOS={selectedOS} 
                onChange={(os) => setSelectedOS(os)} 
              />
              
              <Button 
                onClick={handleAnalyze} 
                disabled={showError}
                className="bg-primary hover:bg-primary/90"
              >
                Analyze Instances
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <InstanceAnalysis 
        hideSelectors={true} 
        selectedView={selectedView}
        selectedOS={getAnalysisOSFormat(selectedOS)}
      />
    </div>
  );
}

export default App; 