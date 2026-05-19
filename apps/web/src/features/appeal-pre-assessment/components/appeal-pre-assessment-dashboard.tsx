import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Check, DollarSign, Users, Warning } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

export function AppealPreAssessmentDashboard() {
  const { toast } = useToast();
  const [assessmentHistory, setAssessmentHistory] = useState<Array<any>>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Simulate fetching assessment history
  const loadAssessmentHistory = async () => {
    setLoadingHistory(true);
    try {
      // In reality, this would fetch from API
      // For now, return empty array or mock data
      setAssessmentHistory([]);
    } catch (error) {
      console.error('Failed to load assessment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load history on component mount
  // useEffect(() => {
  //   loadAssessmentHistory();
  // }, []);

  const handleNewAssessment = () => {
    // Would open assessment form modal/dialog
    toast({
      title: 'New Assessment',
      description: 'Opening appeal pre-assessment form...',
    });
  };

  const handleViewDetails = (assessmentId: string) => {
    toast({
      title: 'View Details',
      description: `Viewing details for assessment ${assessmentId}`,
    });
  };

  const handleReassess = (assessmentId: string) => {
    toast({
      title: 'Reassess',
      description: `Initiating reassessment for ${assessmentId}`,
    });
  };

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Appeal Pre-Assessment System</h1>
          <p className="text-muted-foreground">
            Assess appeal requests and provide guidance on likelihood of success and required documentation
          </p>
        </div>
        <Button onClick={handleNewAssessment}>
          <Plus className="mr-2 h-4 w-4" /> New Assessment
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Total Assessments</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">
              0
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Assessments Completed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Warning className="h-5 w-5 text-orange-500" />
              <span>Pending Reviews</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold text-orange-600">
              0
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Awaiting Manual Review
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Successful Outcomes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold text-green-600">
              0%
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Historical Success Rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span>Avg. Processing Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">
              0 days
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Average Resolution
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>Recent Appeal Assessments</span>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="icon" aria-label="Filters">
                <Calendar className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem onClick={() => /* filter by date */}>
                Last 7 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => /* filter by type */}>
                Grade Appeals
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => /* filter by type */}>
                Prerequisite Waivers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => /* filter by type */}>
                Late Withdrawals
              </DropdownMenuItem>
              <Separator />
              <DropdownMenuItem onClick={() => /* export */}>
                Export Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => loadAssessmentHistory()}>
                Refresh Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="text-center py-8">Loading assessment history...</div>
          ) : (
            assessmentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No assessments completed yet.
                <Button variant="outline" onClick={handleNewAssessment} className="mt-4">
                  Create First Assessment
                </Button>
              </div>
            ) : (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHeader className="w-20">Assessment ID</TableHeader>
                    <TableHeader>Student</TableHeader>
                    <TableHeader className="w-20">Appeal Type</TableHeader>
                    <TableHeader className="w-16">Eligibility</TableHeader>
                    <TableHeader className="w-16">Success Likelihood</TableHeader>
                    <TableHeader className="w-16">Date</TableHeader>
                    <TableHeader className="w-16">Actions</TableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Assessment rows would go here */}
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                      No assessment data available
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          )}
        </CardContent>
      </Card>

      {/* Appeal Type Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-gray-500" />
            <span>Appeal Types Supported</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Grade Appeals</h2>
            <p className="text-sm">
              Assessment of grade appeal requests based on evidence of grading inconsistencies,
              missing feedback, or extenuating circumstances affecting performance.
            </p>
          </div>
          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Prerequisite Waivers</h2>
            <p className="text-sm">
              Evaluation of prerequisite waiver requests based on alternative evidence of
              knowledge, experience, or equivalent learning.
            </p>
          </div>
          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Late Withdrawals</h2>
            <p className="text-sm">
              Assessment of late withdrawal requests based on medical, personal, or
              administrative grounds with supporting documentation.
            </p>
          </div>
          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Course Substitutions</h2>
            <p className="text-sm">
              Review of course substitution requests based on equivalent learning outcomes
              and demonstrated competency in alternative learning experiences.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}