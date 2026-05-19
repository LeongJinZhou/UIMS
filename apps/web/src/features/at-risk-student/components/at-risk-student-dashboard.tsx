import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BarChart2, Calendar, Check, DollarSign, Users, Warning } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

export function AtRiskStudentDashboard() {
  const { toast } = useToast();

  // Queries for at-risk student data
  const { data: atRiskData, isLoading: loadingAtRisk } = useQuery({
    queryKey: ['ai', 'at-risk-students'],
    queryFn: async () => {
      const res = await fetch('/api/ai/at-risk-students');
      if (!res.ok) throw new Error('Failed to fetch at-risk students');
      return res.json();
    }
  });

  const { data: riskSummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['ai', 'at-risk-summary'],
    queryFn: async () => {
      const res = await fetch('/api/ai/at-risk-students/summary');
      if (!res.ok) throw new Error('Failed to fetch at-risk summary');
      return res.json();
    }
  });

  const handleIntervene = async (studentId: string) => {
    try {
      const res = await fetch(`/api/ai/at-risk-students/${studentId}/intervene`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to initiate intervention');

      toast({
        title: 'Intervention initiated',
        description: 'Support intervention has been initiated for this student.',
      });

      // Refetch data
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate intervention.',
        variant: 'destructive',
      });
    }
  };

  if (loadingAtRisk || loadingSummary) {
    return <div className="p-6">Loading at-risk student analysis...</div>;
  }

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students Analyzed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Students Analyzed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskSummary ? (
              <div className="text-2xl font-bold">
                {riskSummary.totalStudentsAnalyzed}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Total Students
              </div>
            ) : (
              <div className="text-center py-4">No data</div>
            )}
          </CardContent>
        </Card>

        {/* At-Risk Students Count */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Warning className="h-5 w-5 text-orange-500" />
              <span>At-Risk Students</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskSummary ? (
              <>
                <div className="text-2xl font-bold text-orange-600">
                  {riskSummary.atRiskStudentsCount}
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {riskSummary.atRiskPercentage?.toFixed(1)}% of total
                </div>
              </>
            ) : (
              <div className="text-center py-4">No data</div>
            )}
          </CardContent>
        </Card>

        {/* High Risk Count */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>High Risk</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskSummary ? (
              <div className="text-2xl font-bold text-red-600">
                {riskSummary.summary?.highRisk ?? 0}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Requires immediate intervention
              </div>
            ) : (
              <div className="text-center py-4">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Intervention Success Rate (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Intervention Success</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold text-green-600">
              78%
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Positive outcomes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Level Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart2 className="h-5 w-5 text-purple-500" />
            <span>Risk Level Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Chart placeholder */}
          <div className="h-40">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Risk Distribution Chart Placeholder
            </div>
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>At-Risk Students Requiring Attention</span>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="icon" aria-label="Actions">
                <Bell className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem onClick={() => /* refresh */}>
                Refresh Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => /* export */}>
                Export Report
              </DropdownMenuItem>
              <Separator />
              <DropdownMenuItem onClick={() => /* configure thresholds */}>
                Adjust Risk Thresholds
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {!atRiskData || atRiskData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No at-risk students identified based on current criteria.
            </div>
          ) : (
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHeader className="w-20">Student ID</TableHeader>
                  <TableHeader>Student Name</TableHeader>
                  <TableHeader className="w-20">Programme</TableHeader>
                  <TableHeader className="w-16">Risk Score</TableHeader>
                  <TableHeader className="w-16">Risk Level</TableHeader>
                  <TableHeader className="w-20">Primary Risk Factors</TableHeader>
                  <TableHeader className="w-16">Actions</TableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskData.map((student: any) => (
                  <TableRow key={student.student.id}>
                    <TableCell>{student.student.studentId}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                          {student.student.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{student.student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.student.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{student.student.programme?.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {student.riskScore}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={student.riskLevel === 'HIGH' ? 'destructive' :
                                student.riskLevel === 'MEDIUM' ? 'warning' : 'secondary'}
                      >
                        {student.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {student.riskFactors
                          .slice(0, 2)
                          .map((factor: any) => factor.type.replace('_', ' '))
                          .join(', ')}{student.riskFactors.length > 2 ? '...' : ''}
                      </div>
                    </TableCell>
                    <TableCell className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => /* view details */}
                        aria-label="View student details"
                      >
                        <Check className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant={student.riskLevel === 'HIGH' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => handleIntervene(student.student.id)}
                        aria-label="Initiate intervention"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}