import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, Calendar, UserPlus, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

export function HrDashboard() {
  const { toast } = useToast();

  // Queries for HR data
  const { data: lecturerStats, isLoading: loadingLecturers } = useQuery({
    queryKey: ['hr', 'lecturer-stats'],
    queryFn: async () => {
      const res = await fetch('/api/hr/dashboard');
      if (!res.ok) throw new Error('Failed to fetch lecturer stats');
      return res.json();
    }
  });

  const { data: leaveRequests, isLoading: loadingLeaves } = useQuery({
    queryKey: ['hr', 'leave-requests'],
    queryFn: async () => {
      const res = await fetch('/api/hr/leave-requests?status=PENDING');
      if (!res.ok) throw new Error('Failed to fetch leave requests');
      return res.json();
    }
  });

  const { data: performanceReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['hr', 'performance-reviews'],
    queryFn: async () => {
      const res = await fetch('/api/hr/performance-reviews?status=PENDING_REVIEW');
      if (!res.ok) throw new Error('Failed to fetch performance reviews');
      return res.json();
    }
  });

  const handleApproveLeave = async (leaveId: string) => {
    try {
      const res = await fetch(`/api/hr/leave-requests/${leaveId}/approve`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to approve leave request');

      toast({
        title: 'Leave approved',
        description: 'The leave request has been approved successfully.',
      });

      // Refetch leave requests
      // In a real implementation, we would invalidate the query
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve leave request.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    try {
      const res = await fetch(`/api/hr/leave-requests/${leaveId}/reject`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to reject leave request');

      toast({
        title: 'Leave rejected',
        description: 'The leave request has been rejected.',
      });

      // Refetch leave requests
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject leave request.',
        variant: 'destructive',
      });
    }
  };

  if (loadingLecturers || loadingLeaves || loadingReviews) {
    return <div className="p-6">Loading HR dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lecturer Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Lecturer Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lecturerStats ? (
              <>
                <div className="text-sm font-medium text-muted-foreground">
                  Total Lecturers
                </div>
                <div className="text-2xl font-bold">
                  {lecturerStats.totalLecturers}
                </div>

                <div className="text-sm font-medium text-muted-foreground">
                  Active Lecturers
                </div>
                <div className="text-xl font-semibold text-green-600">
                  {lecturerStats.activeLecturers}
                </div>

                <div className="text-sm font-medium text-muted-foreground">
                  On Leave
                </div>
                <div className="text-xl font-semibold text-orange-600">
                  {lecturerStats.onLeaveLecturers}
                </div>

                <div className="text-sm font-medium text-muted-foreground">
                  Utilization Rate
                </div>
                <div className="text-xl font-semibold">
                  {lecturerStats.lecturerUtilizationRate?.toFixed(1)}%
                </div>
              </>
            ) : (
              <div className="text-center py-4">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Pending Leave Requests Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span>Pending Leave Requests</span>
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="icon" aria-label="Actions">
                  <Bell className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem onClick={() => /* handle refresh */}>
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaveRequests && leaveRequests.length > 0 ? (
              leaveRequests.map((leave: any) => (
                <div key={leave.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{leave.lecturer?.user?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {leave.leaveType} | {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleApproveLeave(leave.id)}
                        aria-label="Approve leave"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRejectLeave(leave.id)}
                        aria-label="Reject leave"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No pending leave requests
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Performance Reviews Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-purple-500" />
              <span>Pending Reviews</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceReviews && performanceReviews.length > 0 ? (
              performanceReviews.map((review: any) => (
                <div key={review.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{review.lecturer?.user?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {review.reviewPeriod} Performance Review
                      </div>
                    </div>
                    <Badge variant="secondary" size="sm">
                      PENDING_REVIEW
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No pending performance reviews
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={() => /* navigate to lecturer management */}
              className="w-full justify-start"
            >
              Manage Lecturers
            </Button>
            <Button
              variant="outline"
              onClick={() => /* navigate to leave management */}
              className="w-full justify-start"
            >
              Manage Leave Requests
            </Button>
            <Button
              variant="outline"
              onClick={() => /* navigate to performance reviews */}
              className="w-full justify-start"
            >
              Manage Performance Reviews
            </Button>
            <Button
              variant="outline"
              onClick={() => /* navigate to reports */}
              className="w-full justify-start"
            >
              HR Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Activity items would go here */}
              <div className="text-center py-4 text-muted-foreground">
                No recent activity
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart className="h-5 w-5 text-green-500" />
              <span>Workload Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Workload chart placeholder */}
            <div className="h-40">
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Workload Chart Placeholder
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}